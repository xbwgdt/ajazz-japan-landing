import { randomUUID } from "node:crypto";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import { APIError, type Payload, type PayloadRequest } from "payload";
import { revalidatePath } from "next/cache";
import { productPublicationContext } from "../../cms/hooks/protectSourceFields";
import { lockProduct } from "../../cms/services/productConcurrency";
import { runPayloadTransaction } from "../../cms/services/payloadTransaction";
import type { Admin } from "../../payload-types";
import {
  PublicationConflictError,
  PublicationValidationError,
  publishProduct,
  unpublishProduct,
  type PublicationDraft,
} from "./publication";
import { createPostgresPublicationStore } from "./publication-store";

type Relation = number | string | { id?: number | string | null } | null | undefined;
type PayloadProduct = Record<string, unknown> & { id: number | string };

function relationId(value: Relation): string | undefined {
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (value && (typeof value.id === "number" || typeof value.id === "string")) return String(value.id);
  return undefined;
}

function descriptionHtml(value: unknown): string {
  if (!value || typeof value !== "object" || !("root" in value)) return "";
  return convertLexicalToHTML({
    data: value as Parameters<typeof convertLexicalToHTML>[0]["data"],
    disableContainer: true,
  });
}

async function loadMedia(payload: Payload, ids: string[], req?: PayloadRequest) {
  const unique = [...new Set(ids)];
  const entries = await Promise.all(unique.map(async (id) => {
    const media = await payload.findByID({ collection: "media", depth: 0, id, overrideAccess: true, req });
    const record = media as unknown as Record<string, unknown>;
    if (record.retiredAt || typeof record.url !== "string" || !record.url.trim()) {
      throw new PublicationValidationError([{
        path: `media.${id}`,
        code: "media_url_unresolved",
        message: "Publication media must exist, be active, and have a URL.",
      }]);
    }
    return [id, record.url] as const;
  }));
  return new Map(entries);
}

export async function buildPublicationDraft(payload: Payload, product: PayloadProduct, req?: PayloadRequest): Promise<PublicationDraft> {
  const variants = Array.isArray(product.variants) ? product.variants as Array<Record<string, unknown>> : [];
  const primary = relationId(product.primaryImageId as Relation);
  const gallery = Array.isArray(product.galleryImageIds) ? product.galleryImageIds.map((value) => relationId(value as Relation)).filter(Boolean) as string[] : [];
  const scenes = Array.isArray(product.sceneImageIds) ? product.sceneImageIds.map((value) => relationId(value as Relation)).filter(Boolean) as string[] : [];
  const variantMedia = variants.flatMap((variant) => [
    relationId(variant.thumbnailId as Relation),
    relationId(variant.imageId as Relation),
  ].filter(Boolean) as string[]);
  const orderedImages = [primary, ...gallery, ...scenes].filter(Boolean) as string[];
  const media = await loadMedia(payload, [...orderedImages, ...variantMedia], req);

  const duplicateSlug = await payload.find({
    collection: "products",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: { and: [{ slug: { equals: product.slug } }, { id: { not_equals: product.id } }] },
  });

  return {
    sourceType: product.sourceType as PublicationDraft["sourceType"],
    rmsManageNumber: typeof product.rmsManageNumber === "string" ? product.rmsManageNumber : undefined,
    operationalProductId: typeof product.operationalProductId === "string" ? product.operationalProductId : undefined,
    name: String(product.name ?? ""),
    slug: String(product.slug ?? ""),
    slugIsUnique: duplicateSlug.docs.length === 0,
    shortStatement: typeof product.shortStatement === "string" ? product.shortStatement : undefined,
    descriptionHtml: descriptionHtml(product.description),
    category: product.category as PublicationDraft["category"],
    primaryImageId: primary,
    featured: product.featured === true,
    merchandisingOrder: Number(product.merchandisingOrder ?? 0),
    lifecycle: product.lifecycle as PublicationDraft["lifecycle"],
    seoTitle: typeof product.seoTitle === "string" ? product.seoTitle : undefined,
    seoDescription: typeof product.seoDescription === "string" ? product.seoDescription : undefined,
    images: orderedImages.map((mediaId, position) => ({ mediaId, position, url: media.get(mediaId) ?? "" })),
    variants: variants.map((variant) => {
      const thumbnailId = relationId(variant.thumbnailId as Relation);
      const imageId = relationId(variant.imageId as Relation);
      return {
        operationalVariantId: typeof variant.operationalVariantId === "string" ? variant.operationalVariantId : undefined,
        cmsVariantId: String(variant.id ?? ""),
        sku: String(variant.sku ?? ""),
        rmsSkuNumber: typeof variant.rmsSkuNumber === "string" ? variant.rmsSkuNumber : undefined,
        colorName: String(variant.colorName ?? ""),
        colorSwatch: typeof variant.colorSwatch === "string" ? variant.colorSwatch : undefined,
        thumbnailId,
        imageId,
        thumbnailUrl: thumbnailId ? media.get(thumbnailId) : undefined,
        imageUrl: imageId ? media.get(imageId) : undefined,
        salePriceJpy: Number(variant.salePriceJpy),
        compareAtPriceJpy: variant.compareAtPriceJpy === null || variant.compareAtPriceJpy === undefined ? undefined : Number(variant.compareAtPriceJpy),
        comparisonEvidenceType: variant.comparisonEvidenceType as PublicationDraft["variants"][number]["comparisonEvidenceType"],
        comparisonEvidenceReference: typeof variant.comparisonEvidenceReference === "string" ? variant.comparisonEvidenceReference : undefined,
        comparisonApprovedBy: relationId(variant.comparisonApprovedBy as Relation),
        comparisonApprovedAt: typeof variant.comparisonApprovedAt === "string" ? variant.comparisonApprovedAt : undefined,
        inventoryMode: variant.inventoryMode as PublicationDraft["variants"][number]["inventoryMode"],
        active: variant.active === true,
      };
    }),
  };
}

export async function executePublicationAction(input: {
  action: "publish" | "unpublish";
  admin: Admin;
  expectedRevision: number;
  payload: Payload;
  productId: string;
}) {
  const result = await runPayloadTransaction(input.payload, async (req) => {
    await lockProduct(req, input.productId);
    const product = await input.payload.findByID({
      collection: "products",
      depth: 0,
      draft: true,
      id: input.productId,
      overrideAccess: true,
      req,
    }) as unknown as PayloadProduct;
    const currentRevision = Number(product.editorialRevision ?? 0);
    const correlationId = randomUUID();
    const actor = { id: String(input.admin.id), email: input.admin.email };
    const store = createPostgresPublicationStore(req);

    let slug = String(product.slug ?? "");
    let operationalProductId = typeof product.operationalProductId === "string" ? product.operationalProductId : undefined;
    if (input.action === "publish") {
      const draft = await buildPublicationDraft(input.payload, product, req);
      const published = await publishProduct({ actor, cmsProductId: String(product.id), correlationId, currentRevision, draft, expectedRevision: input.expectedRevision }, store);
      slug = published.slug;
      operationalProductId = published.operationalProductId;
    } else {
      await unpublishProduct({ actor, cmsProductId: String(product.id), correlationId, currentRevision, expectedRevision: input.expectedRevision }, store);
    }

    await input.payload.update({
      collection: "products",
      context: { expectedRevision: input.expectedRevision, ...productPublicationContext },
      data: {
        _status: input.action === "publish" ? "published" : "draft",
        ...(operationalProductId ? { operationalProductId } : {}),
        lastPublicationCorrelationId: correlationId,
        ...(input.action === "publish" ? { lastPublishedAt: new Date().toISOString() } : {}),
        lastPublishedBy: input.admin.id,
        lastPublishedRevision: input.expectedRevision,
        lifecycle: input.action === "publish" ? "active" : "unpublished",
      },
      draft: input.action !== "publish",
      id: product.id,
      overrideAccess: true,
      req,
    });
    await input.payload.create({
      collection: "audit-events",
      data: {
        action: input.action,
        actor: input.admin.id,
        subjectType: "product",
        subjectId: String(product.id),
        details: { correlationId, revision: input.expectedRevision },
      },
      overrideAccess: true,
      req,
    });
    return { correlationId, operationalProductId, slug };
  }, undefined, { user: input.admin });

  revalidatePath("/");
  revalidatePath(`/products/${result.slug}`);
  return result;
}

export function publicationErrorResponse(error: unknown): Response {
  if (error instanceof PublicationValidationError) {
    return Response.json({ code: "publication_validation_failed", issues: error.issues }, { status: 422 });
  }
  if (error instanceof PublicationConflictError) {
    return Response.json({ code: error.code, currentRevision: error.currentRevision }, { status: 409 });
  }
  if (error instanceof PublicationConflictError) {
    return Response.json({ code: error.code, currentRevision: error.currentRevision }, { status: 409 });
  }
  if (error instanceof APIError && error.status >= 400 && error.status < 500) {
    const data = error.data && typeof error.data === "object" ? error.data as Record<string, unknown> : {};
    const code = typeof data.code === "string"
      ? data.code
      : error.status === 404 ? "product_not_found" : "publication_request_failed";
    return Response.json({ ...data, code }, { status: error.status });
  }
  return Response.json({ code: "publication_failed" }, { status: 500 });
}
