import type { ProductCategoryKey } from "../commerce/product-categories";
import { productRmsSourceIngestionContext } from "../../cms/hooks/protectSourceFields";

export interface RmsEditorialSource {
  operationalProductId: number;
  rmsManageNumber: string;
  slug: string;
  name: string;
  descriptionHtml: string;
  category: ProductCategoryKey;
  images: string[];
  variants: Array<{
    operationalVariantId: number;
    rmsSkuNumber: string;
    priceJpy: number;
    compareAtPriceJpy?: number;
    stockQuantity: number;
    colorName?: string;
    imageUrl?: string;
  }>;
}

type CmsVariant = Record<string, unknown> & {
  operationalVariantId?: string | null;
  rmsSkuNumber?: string | null;
};

type CmsProduct = Record<string, unknown> & {
  id: number | string;
  variants?: CmsVariant[] | null;
};

interface RmsDraftPayload {
  find(args: Record<string, unknown>): Promise<{ docs: unknown[] }>;
  create(args: Record<string, unknown>): Promise<{ id: number | string }>;
  update(args: Record<string, unknown>): Promise<{ id: number | string }>;
}

export type RmsDraftResult = {
  action: "created" | "updated";
  productId: string;
};

function sourceSnapshot(source: RmsEditorialSource) {
  return {
    operationalProductId: source.operationalProductId,
    rmsManageNumber: source.rmsManageNumber,
    slug: source.slug,
    name: source.name,
    descriptionHtml: source.descriptionHtml,
    category: source.category,
    images: source.images,
    variants: source.variants,
  };
}

function findSourceVariant(existing: CmsVariant[], sourceVariant: RmsEditorialSource["variants"][number]) {
  return existing.find((variant) => (
    variant.operationalVariantId === String(sourceVariant.operationalVariantId)
    || variant.rmsSkuNumber === sourceVariant.rmsSkuNumber
  ));
}

export function mergeRmsSource(
  existing: CmsProduct,
  source: RmsEditorialSource,
  now = new Date(),
): Record<string, unknown> {
  const existingVariants = Array.isArray(existing.variants) ? existing.variants : [];
  const variants = existingVariants.map((variant) => {
    const sourceVariant = source.variants.find((candidate) => (
      variant.operationalVariantId === String(candidate.operationalVariantId)
      || variant.rmsSkuNumber === candidate.rmsSkuNumber
    ));
    if (!sourceVariant) return variant;
    return {
      ...variant,
      operationalVariantId: variant.operationalVariantId ?? String(sourceVariant.operationalVariantId),
      rmsSkuNumber: variant.rmsSkuNumber ?? sourceVariant.rmsSkuNumber,
      inventoryMode: "rms",
    };
  });

  for (const sourceVariant of source.variants) {
    if (findSourceVariant(existingVariants, sourceVariant)) continue;
    variants.push({
      operationalVariantId: String(sourceVariant.operationalVariantId),
      sku: sourceVariant.rmsSkuNumber,
      rmsSkuNumber: sourceVariant.rmsSkuNumber,
      colorName: sourceVariant.colorName ?? sourceVariant.rmsSkuNumber,
      salePriceJpy: sourceVariant.priceJpy,
      compareAtPriceJpy: sourceVariant.compareAtPriceJpy,
      inventoryMode: "rms",
      active: true,
    });
  }

  return {
    operationalProductId: existing.operationalProductId ?? String(source.operationalProductId),
    rmsManageNumber: existing.rmsManageNumber ?? source.rmsManageNumber,
    sourceSnapshot: sourceSnapshot(source),
    sourceUpdatedAt: now.toISOString(),
    variants,
  };
}

function initialDraft(source: RmsEditorialSource, now: Date) {
  return {
    sourceType: "rms",
    rmsManageNumber: source.rmsManageNumber,
    operationalProductId: String(source.operationalProductId),
    name: source.name,
    slug: source.slug,
    category: source.category,
    lifecycle: "unpublished",
    featured: false,
    merchandisingOrder: 0,
    variants: source.variants.map((variant) => ({
      operationalVariantId: String(variant.operationalVariantId),
      sku: variant.rmsSkuNumber,
      rmsSkuNumber: variant.rmsSkuNumber,
      colorName: variant.colorName ?? variant.rmsSkuNumber,
      salePriceJpy: variant.priceJpy,
      compareAtPriceJpy: variant.compareAtPriceJpy,
      inventoryMode: "rms",
      active: true,
    })),
    sourceSnapshot: sourceSnapshot(source),
    sourceUpdatedAt: now.toISOString(),
    _status: "draft",
  };
}

export async function upsertRmsEditorialDraft(
  source: RmsEditorialSource,
  payload: RmsDraftPayload,
  now = new Date(),
): Promise<RmsDraftResult> {
  const administrators = await payload.find({
    collection: "admins",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { email: { equals: "xiet@a-jazz.com" } },
  });
  const actor = administrators.docs[0] as Record<string, unknown> | undefined;
  if (!actor || actor.id == null || actor.email !== "xiet@a-jazz.com") {
    throw new Error("RMS import administrator is not configured");
  }

  const found = await payload.find({
    collection: "products",
    depth: 0,
    draft: true,
    limit: 2,
    overrideAccess: true,
    where: {
      or: [
        { operationalProductId: { equals: String(source.operationalProductId) } },
        { rmsManageNumber: { equals: source.rmsManageNumber } },
      ],
    },
  });

  if (found.docs.length > 1) {
    throw new Error(`Ambiguous RMS CMS linkage for ${source.rmsManageNumber}`);
  }

  const existing = found.docs[0] as CmsProduct | undefined;
  if (!existing) {
    const created = await payload.create({
      collection: "products",
      context: productRmsSourceIngestionContext,
      data: initialDraft(source, now),
      draft: true,
      overrideAccess: true,
      user: actor,
    });
    return { action: "created", productId: String(created.id) };
  }
  if (existing.sourceType !== "rms") {
    throw new Error("RMS source conflicts with a manual CMS product");
  }

  const updated = await payload.update({
    collection: "products",
    context: {
      ...productRmsSourceIngestionContext,
      expectedRevision: Number(existing.editorialRevision ?? 0),
    },
    data: mergeRmsSource(existing, source, now),
    draft: true,
    id: existing.id,
    overrideAccess: true,
    user: actor,
  });
  return { action: "updated", productId: String(updated.id) };
}
