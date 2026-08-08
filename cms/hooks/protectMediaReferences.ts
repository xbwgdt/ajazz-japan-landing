import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Payload } from "payload";

const PRODUCT_MEDIA_PATHS = [
  "primaryImageId",
  "galleryImageIds",
  "sceneImageIds",
  "seoImageId",
  "variants.thumbnailId",
  "variants.imageId",
] as const;
const MEDIA_FIELD_PATTERN = /(?:image|media)ids?$/i;
const OPAQUE_MEDIA_KEY = /^products\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

export interface MediaReference {
  label?: string;
  path: string;
  source: "product" | "product-version" | "site-settings";
  sourceId: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function relationId(value: unknown): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") return value;
  if (isRecord(value) && (typeof value.id === "string" || typeof value.id === "number")) {
    return value.id;
  }
  return undefined;
}

function numericPayloadId(value: string | number, label: string): number {
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`${label} must be a positive integer`);
  return id;
}

function collectReferencePaths(
  value: unknown,
  mediaId: string,
  path = "",
  insideMediaField = false,
): string[] {
  if (insideMediaField && String(relationId(value)) === mediaId) return [path];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => (
      collectReferencePaths(item, mediaId, `${path}.${index}`, insideMediaField)
    ));
  }
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    return collectReferencePaths(
      child,
      mediaId,
      childPath,
      insideMediaField || MEDIA_FIELD_PATTERN.test(key),
    );
  });
}

function mediaWhere(mediaId: string | number, version = false) {
  return {
    or: PRODUCT_MEDIA_PATHS.map((path) => ({
      [version ? `version.${path}` : path]: { equals: mediaId },
    })),
  };
}

export async function findMediaReferences(
  payload: Payload,
  mediaId: string | number,
): Promise<MediaReference[]> {
  const id = String(mediaId);
  const [products, versions] = await Promise.all([
    payload.find({
      collection: "products",
      depth: 0,
      draft: true,
      overrideAccess: true,
      pagination: false,
      where: mediaWhere(mediaId) as never,
    }),
    payload.findVersions({
      collection: "products",
      depth: 0,
      overrideAccess: true,
      pagination: false,
      where: mediaWhere(mediaId, true) as never,
    }),
  ]);

  const references: MediaReference[] = [];
  for (const product of products.docs as unknown as JsonRecord[]) {
    for (const path of collectReferencePaths(product, id)) {
      references.push({
        label: typeof product.name === "string" ? product.name : undefined,
        path,
        source: "product",
        sourceId: String(product.id),
      });
    }
  }
  for (const versionDoc of versions.docs as JsonRecord[]) {
    const version = isRecord(versionDoc.version) ? versionDoc.version : {};
    for (const path of collectReferencePaths(version, id)) {
      references.push({
        label: typeof version.name === "string" ? version.name : undefined,
        path,
        source: "product-version",
        sourceId: String(versionDoc.id),
      });
    }
  }

  const hasSiteSettings = payload.config.globals?.some((global) => global.slug === "site-settings");
  if (hasSiteSettings) {
    const settings = await payload.findGlobal({
      depth: 0,
      overrideAccess: true,
      slug: "site-settings" as never,
    });
    for (const path of collectReferencePaths(settings, id)) {
      references.push({ path, source: "site-settings", sourceId: "site-settings" });
    }
  }
  return references;
}

export class MediaReferencedError extends Error {
  references: MediaReference[];

  constructor(references: MediaReference[]) {
    super("Media is still referenced");
    this.name = "MediaReferencedError";
    this.references = references;
  }
}

export async function retireMedia({
  actorId,
  mediaId,
  now = new Date(),
  payload,
}: {
  actorId: string | number;
  mediaId: string | number;
  now?: Date;
  payload: Payload;
}) {
  const normalizedMediaId = numericPayloadId(mediaId, "Media ID");
  const normalizedActorId = numericPayloadId(actorId, "Actor ID");
  const references = await findMediaReferences(payload, normalizedMediaId);
  if (references.length > 0) throw new MediaReferencedError(references);

  const retiredAt = now.toISOString();
  const deleteAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const media = await payload.update({
    collection: "media",
    data: { deleteAfter, retiredAt, retiredBy: normalizedActorId },
    id: normalizedMediaId,
    overrideAccess: true,
  });
  await payload.create({
    collection: "audit-events",
    data: {
      action: "retire_media",
      actor: normalizedActorId,
      subjectId: String(normalizedMediaId),
      subjectType: "media",
      details: { deleteAfter, phase: "retired" },
    },
    overrideAccess: true,
  });
  return media;
}

export async function deleteR2MediaObject(filename: string): Promise<void> {
  if (!OPAQUE_MEDIA_KEY.test(filename)) throw new Error("Refusing to delete a non-opaque media key");
  const bucket = process.env.R2_BUCKET;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 storage is not configured");
  }

  const client = new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    forcePathStyle: true,
    region: "auto",
  });
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: filename }));
  } finally {
    client.destroy();
  }
}

export async function cleanupRetiredMedia({
  deleteObject,
  now = new Date(),
  payload,
}: {
  deleteObject: (filename: string) => Promise<void>;
  now?: Date;
  payload: Payload;
}): Promise<{ deleted: number; failed: number; referenced: number }> {
  const due = await payload.find({
    collection: "media",
    depth: 0,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { retiredAt: { exists: true } },
        { deleteAfter: { less_than_equal: now.toISOString() } },
      ],
    },
  });
  const result = { deleted: 0, failed: 0, referenced: 0 };

  for (const media of due.docs) {
    const references = await findMediaReferences(payload, media.id);
    if (references.length > 0) {
      result.referenced += 1;
      continue;
    }

    const actorId = relationId(media.retiredBy);
    if (!actorId || !media.filename) {
      result.failed += 1;
      continue;
    }

    try {
      await deleteObject(media.filename);
      await payload.delete({ collection: "media", id: media.id, overrideAccess: true });
      await payload.create({
        collection: "audit-events",
        data: {
          action: "retire_media",
          actor: numericPayloadId(actorId, "Retirement actor ID"),
          subjectId: String(media.id),
          subjectType: "media",
          details: { filename: media.filename, phase: "deleted" },
        },
        overrideAccess: true,
      });
      result.deleted += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
