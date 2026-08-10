import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const APPLY_CONFIRMATION = "AJAZZ_RMS_MEDIA_2026";

type Relation = number | string | { id?: number | string | null } | null | undefined;
type RecordValue = Record<string, unknown>;

interface PayloadLike {
  create(args: RecordValue): Promise<RecordValue>;
  find(args: RecordValue): Promise<{ docs: RecordValue[] }>;
  update(args: RecordValue): Promise<RecordValue>;
}

export interface HydrateRmsMediaDependencies {
  apply: boolean;
  confirmation?: string;
  draftSaveContext: Record<PropertyKey, unknown>;
  payload: PayloadLike;
  rmsManageNumber: string;
  uploadImage: (url: string, alt: string) => Promise<string>;
}

function relationId(value: Relation): string | undefined {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (value && (typeof value.id === "number" || typeof value.id === "string")) return String(value.id);
  return undefined;
}

function sourceData(product: RecordValue) {
  const snapshot = product.sourceSnapshot as RecordValue | undefined;
  const images = Array.isArray(snapshot?.images)
    ? snapshot.images.filter((value): value is string => typeof value === "string" && /^https:\/\//.test(value))
    : [];
  const variants = Array.isArray(snapshot?.variants)
    ? snapshot.variants.filter((value): value is RecordValue => Boolean(value && typeof value === "object"))
    : [];
  return { images: [...new Set(images)], variants };
}

function hasEditorialMedia(product: RecordValue): boolean {
  if (relationId(product.primaryImageId as Relation)) return true;
  if (Array.isArray(product.galleryImageIds) && product.galleryImageIds.some((value) => relationId(value as Relation))) return true;
  if (Array.isArray(product.sceneImageIds) && product.sceneImageIds.some((value) => relationId(value as Relation))) return true;
  return Array.isArray(product.variants) && product.variants.some((value) => {
    const variant = value as RecordValue;
    return Boolean(relationId(variant.thumbnailId as Relation) || relationId(variant.imageId as Relation));
  });
}

function matchingSourceVariant(sourceVariants: RecordValue[], variant: RecordValue) {
  return sourceVariants.find((source) => (
    String(source.operationalVariantId ?? "") === String(variant.operationalVariantId ?? "")
    || String(source.rmsSkuNumber ?? "") === String(variant.rmsSkuNumber ?? "")
  ));
}

export async function hydrateRmsProductMedia(dependencies: HydrateRmsMediaDependencies) {
  const found = await dependencies.payload.find({
    collection: "products",
    depth: 0,
    draft: true,
    limit: 2,
    overrideAccess: true,
    where: { rmsManageNumber: { equals: dependencies.rmsManageNumber } },
  });
  if (found.docs.length !== 1) throw new Error("Exactly one RMS product draft must match the management number.");
  const product = found.docs[0];
  if (product.sourceType !== "rms" || product._status === "published") {
    throw new Error("Only an unpublished RMS draft can be hydrated.");
  }
  if (hasEditorialMedia(product)) throw new Error("Refusing to overwrite existing editorial media.");

  const source = sourceData(product);
  if (source.images.length === 0) throw new Error("The RMS source snapshot has no product images.");
  const variantImageUrls = source.variants
    .map((variant) => variant.imageUrl)
    .filter((value): value is string => typeof value === "string" && /^https:\/\//.test(value));
  const urls = [...new Set([...source.images, ...variantImageUrls])];
  if (!dependencies.apply) {
    return { applied: false, cmsProductId: String(product.id), imageCount: urls.length, urls };
  }
  if (dependencies.confirmation !== APPLY_CONFIRMATION) {
    throw new Error(`Apply requires RMS_MEDIA_CONFIRM=${APPLY_CONFIRMATION}.`);
  }

  const administrators = await dependencies.payload.find({
    collection: "admins",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: "xiet@a-jazz.com" } },
  });
  const actor = administrators.docs[0];
  if (!actor?.id) throw new Error("RMS media administrator is not configured.");

  const mediaByUrl = new Map<string, string>();
  for (const url of urls) mediaByUrl.set(url, await dependencies.uploadImage(url, String(product.name ?? "AJAZZ product")));
  const variants = Array.isArray(product.variants) ? product.variants.map((value) => {
    const variant = value as RecordValue;
    const sourceVariant = matchingSourceVariant(source.variants, variant);
    const imageUrl = typeof sourceVariant?.imageUrl === "string" ? sourceVariant.imageUrl : undefined;
    const mediaId = imageUrl ? mediaByUrl.get(imageUrl) : undefined;
    return mediaId ? { ...variant, thumbnailId: mediaId, imageId: mediaId } : variant;
  }) : [];

  await dependencies.payload.update({
    collection: "products",
    context: { expectedRevision: Number(product.editorialRevision ?? 0), ...dependencies.draftSaveContext },
    data: {
      primaryImageId: mediaByUrl.get(source.images[0]),
      galleryImageIds: source.images.slice(1).map((url) => mediaByUrl.get(url)).filter(Boolean),
      variants,
    },
    draft: true,
    id: product.id,
    overrideAccess: true,
    user: actor,
  });
  return { applied: true, cmsProductId: String(product.id), imageCount: urls.length, urls };
}

async function uploadImage(payload: PayloadLike, url: string, alt: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Unable to fetch RMS image (${response.status}).`);
  const data = Buffer.from(await response.arrayBuffer());
  const contentHash = createHash("sha256").update(data).digest("hex");
  const existing = await payload.find({
    collection: "media",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { contentHash: { equals: contentHash } },
  });
  if (existing.docs[0]?.id != null) return String(existing.docs[0].id);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  const mimetype = contentType === "image/png" || contentType === "image/webp" ? contentType : "image/jpeg";
  const created = await payload.create({
    collection: "media",
    data: { alt, purpose: "product" },
    file: { data, mimetype, name: `rms-${contentHash}`, size: data.length },
    overrideAccess: true,
  });
  return String(created.id);
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const index = args.indexOf("--rms-manage-number");
  const rmsManageNumber = index >= 0 ? args[index + 1] : undefined;
  if (!rmsManageNumber) throw new Error("--rms-manage-number is required.");
  const [{ getPayload }, { default: config }, contexts] = await Promise.all([
    import("payload"),
    import("../payload.config"),
    import("../cms/hooks/protectSourceFields"),
  ]);
  const payload = await getPayload({ config }) as unknown as PayloadLike;
  return hydrateRmsProductMedia({
    apply,
    confirmation: process.env.RMS_MEDIA_CONFIRM,
    draftSaveContext: contexts.productDraftSaveContext,
    payload,
    rmsManageNumber,
    uploadImage: (url, alt) => uploadImage(payload, url, alt),
  });
}

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === executedPath) {
  void run().then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : "RMS media hydration failed.");
    process.exit(2);
  });
}
