import { createHash, randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import sharp from "sharp";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MIN_IMAGE_DIMENSION = 320;
const MAX_IMAGE_DIMENSION = 8000;
const MAX_IMAGE_PIXELS = 40_000_000;

export type ImageExtension = "jpg" | "png" | "webp";

export interface DetectedImageType {
  extension: ImageExtension;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
}

export interface UploadedImageFile {
  data: Buffer;
  mimetype: string;
  name: string;
  size: number;
  tempFilePath?: string;
}

export interface ValidatedImage extends DetectedImageType {
  contentHash: string;
  height: number;
  size: number;
  width: number;
}

interface ImageFileSystem {
  readFile(path: string): Promise<Buffer>;
  stat(path: string): Promise<{ size: number }>;
}

const defaultImageFileSystem: ImageFileSystem = { readFile, stat };
const OPAQUE_MEDIA_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;
const MEDIA_PREFIX = /^products$/;

function startsWith(buffer: Buffer, signature: readonly number[]): boolean {
  return signature.every((byte, index) => buffer[index] === byte);
}

export function detectImageType(buffer: Buffer, declaredMime: string): DetectedImageType {
  let detected: DetectedImageType | undefined;
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
    detected = { extension: "jpg", mimeType: "image/jpeg" };
  } else if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    detected = { extension: "png", mimeType: "image/png" };
  } else if (
    buffer.length >= 12
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    detected = { extension: "webp", mimeType: "image/webp" };
  }

  if (!detected) throw new Error("Unsupported image signature");
  if (declaredMime.toLowerCase() !== detected.mimeType) {
    throw new Error("Image MIME type does not match its signature");
  }
  return detected;
}

export function createMediaFilename(verifiedExtension: ImageExtension): string {
  return `${randomUUID()}.${verifiedExtension}`;
}

export function createMediaObjectKey(prefix: string, filename: string): string {
  if (!MEDIA_PREFIX.test(prefix) || !OPAQUE_MEDIA_FILENAME.test(filename)) {
    throw new Error("Refusing to use a non-opaque media object key");
  }
  return `${prefix}/${filename}`;
}

export async function validateUploadedImage(
  file: UploadedImageFile,
  fileSystem: ImageFileSystem = defaultImageFileSystem,
): Promise<ValidatedImage> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image exceeds 12 MiB");
  if (file.tempFilePath) {
    const metadata = await fileSystem.stat(file.tempFilePath);
    if (metadata.size > MAX_IMAGE_BYTES) throw new Error("Image exceeds 12 MiB");
  }
  const data = file.tempFilePath ? await fileSystem.readFile(file.tempFilePath) : file.data;
  const size = data.length;
  if (size > MAX_IMAGE_BYTES) throw new Error("Image exceeds 12 MiB");

  const detected = detectImageType(data, file.mimetype);
  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(data, { animated: true, failOn: "error" }).metadata();
  } catch {
    throw new Error("Invalid image data");
  }

  if ((metadata.pages ?? 1) > 1) throw new Error("Animated images are not allowed");
  if (!metadata.width || !metadata.height) throw new Error("Image dimensions are unavailable");

  const swapsOrientation = metadata.orientation !== undefined
    && [5, 6, 7, 8].includes(metadata.orientation);
  const width = swapsOrientation ? metadata.height : metadata.width;
  const height = swapsOrientation ? metadata.width : metadata.height;

  if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
    throw new Error("Image dimensions must be at least 320 x 320");
  }
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new Error("Image dimensions must not exceed 8000 x 8000");
  }
  if (width * height > MAX_IMAGE_PIXELS) {
    throw new Error("Image exceeds 40,000,000 pixels");
  }

  return {
    ...detected,
    contentHash: createHash("sha256").update(data).digest("hex"),
    height,
    size,
    width,
  };
}
