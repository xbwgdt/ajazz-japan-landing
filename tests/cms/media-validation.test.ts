import { createHash } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import {
  createMediaFilename,
  createMediaObjectKey,
  detectImageType,
  validateUploadedImage,
} from "../../lib/cms/media-validation";

async function imageFile(
  width: number,
  height: number,
  format: "jpeg" | "png" | "webp" = "png",
) {
  const pipeline = sharp({
    create: { background: "#ffffff", channels: 3, height, width },
  });
  const data = await pipeline[format]().toBuffer();
  return {
    data,
    mimetype: `image/${format}`,
    name: `browser-name.${format === "jpeg" ? "jpg" : format}`,
    size: data.length,
  };
}

describe("media validation", () => {
  it("stores an opaque verified filename separately from the collection prefix", () => {
    const filename = createMediaFilename("jpg");
    expect(filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/,
    );
    expect(createMediaObjectKey("products", filename)).toBe(`products/${filename}`);
    expect(filename).not.toContain("products/");
  });

  it("rejects MIME spoofing", () => {
    expect(() => detectImageType(Buffer.from("not an image"), "image/jpeg"))
      .toThrow("Unsupported image signature");
  });

  it("rejects a signature and declared MIME mismatch", async () => {
    const file = await imageFile(320, 320, "png");
    await expect(validateUploadedImage({ ...file, mimetype: "image/jpeg" }))
      .rejects.toThrow("Image MIME type does not match its signature");
  });

  it("returns authoritative metadata and a SHA-256 content hash", async () => {
    const file = await imageFile(640, 480, "webp");
    const validated = await validateUploadedImage(file);

    expect(validated).toEqual({
      contentHash: createHash("sha256").update(file.data).digest("hex"),
      extension: "webp",
      height: 480,
      mimeType: "image/webp",
      size: file.data.length,
      width: 640,
    });
  });

  it("rejects files over 12 MiB before image decoding", async () => {
    await expect(validateUploadedImage({
      data: Buffer.alloc(12 * 1024 * 1024 + 1),
      mimetype: "image/png",
      name: "large.png",
      size: 12 * 1024 * 1024 + 1,
    })).rejects.toThrow("Image exceeds 12 MiB");
  });

  it("rejects an oversized temp file before reading it", async () => {
    const fileSystem = {
      readFile: vi.fn(),
      stat: vi.fn().mockResolvedValue({ size: 12 * 1024 * 1024 + 1 }),
    };

    await expect(validateUploadedImage({
      data: Buffer.alloc(0),
      mimetype: "image/png",
      name: "large.png",
      size: 0,
      tempFilePath: "Z:\\does-not-exist\\large.png",
    }, fileSystem)).rejects.toThrow("Image exceeds 12 MiB");

    expect(fileSystem.stat).toHaveBeenCalledWith("Z:\\does-not-exist\\large.png");
    expect(fileSystem.readFile).not.toHaveBeenCalled();
  });

  it.each([
    [319, 320, "Image dimensions must be at least 320 x 320"],
    [320, 319, "Image dimensions must be at least 320 x 320"],
    [8001, 320, "Image dimensions must not exceed 8000 x 8000"],
    [320, 8001, "Image dimensions must not exceed 8000 x 8000"],
    [7000, 6000, "Image exceeds 40,000,000 pixels"],
  ])("rejects invalid dimensions %d x %d", async (width, height, message) => {
    await expect(validateUploadedImage(await imageFile(width, height, "webp")))
      .rejects.toThrow(message);
  }, 15_000);

  it("rejects animated WebP images", async () => {
    const first = await sharp({
      create: { background: "#ffffff", channels: 3, height: 320, width: 320 },
    }).png().toBuffer();
    const second = await sharp({
      create: { background: "#000000", channels: 3, height: 320, width: 320 },
    }).png().toBuffer();
    const data = await sharp([first, second], { join: { animated: true } })
      .webp({ delay: [100, 100], loop: 0 })
      .toBuffer();

    await expect(validateUploadedImage({
      data,
      mimetype: "image/webp",
      name: "animated.webp",
      size: data.length,
    })).rejects.toThrow("Animated images are not allowed");
  });
});
