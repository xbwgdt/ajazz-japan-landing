import { sql } from "@payloadcms/db-postgres";
import { APIError, type Payload, type PayloadRequest } from "payload";
import { productDraftSaveContext } from "../../cms/hooks/protectSourceFields";
import { findMediaReferences } from "../../cms/hooks/protectMediaReferences";
import { lockProduct } from "../../cms/services/productConcurrency";
import { runPayloadTransaction } from "../../cms/services/payloadTransaction";
import type { Admin } from "../../payload-types";
import { createPostgresPublicationStore } from "./publication-store";
import { unpublishProduct } from "./publication";
import { isSameOrigin } from "../http-security";

export type LifecycleActor = { id: number | string; email: string };
export type ProductLifecycle = "active" | "unpublished" | "archived";

export type LifecycleProduct = {
  hasPublicationHistory: boolean;
  id: string;
  lifecycle: ProductLifecycle;
  mediaOwnedOnlyByProduct: string[];
  referencedByOrder: boolean;
  slug: string;
  status: "draft" | "published";
};

export type LifecycleAuditAction = "archive" | "delete_draft" | "restore" | "unpublish";

export interface ProductLifecycleTransaction {
  deleteProduct(id: string): Promise<void>;
  getProduct(id: string): Promise<LifecycleProduct | null>;
  recordAuditEvent(input: { action: LifecycleAuditAction; actor: LifecycleActor; details?: Record<string, unknown>; productId: string }): Promise<void>;
  unpublishOperationalProduct(product: LifecycleProduct, actor: LifecycleActor): Promise<void>;
  updateProduct(id: string, data: { lifecycle?: ProductLifecycle; status?: "draft" }): Promise<void>;
}

export interface ProductLifecycleStore {
  transaction<T>(actor: LifecycleActor, work: (tx: ProductLifecycleTransaction) => Promise<T>): Promise<T>;
}

export class ProductLifecycleError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

function requireProduct(product: LifecycleProduct | null): LifecycleProduct {
  if (!product) throw new ProductLifecycleError("product_not_found", 404);
  return product;
}

export async function archiveProduct(
  productId: string,
  actor: LifecycleActor,
  confirmation: string,
  store: ProductLifecycleStore,
): Promise<void> {
  await store.transaction(actor, async (tx) => {
    const product = requireProduct(await tx.getProduct(productId));
    if (confirmation !== `ARCHIVE ${product.slug}`) {
      throw new ProductLifecycleError("archive_confirmation_required", 400);
    }
    if (product.lifecycle === "archived") {
      throw new ProductLifecycleError("product_already_archived", 409);
    }

    if (product.lifecycle === "active" || product.status === "published") {
      await tx.unpublishOperationalProduct(product, actor);
      await tx.recordAuditEvent({
        action: "unpublish",
        actor,
        details: { source: "archive" },
        productId: product.id,
      });
    }

    await tx.updateProduct(product.id, { lifecycle: "archived", status: "draft" });
    await tx.recordAuditEvent({ action: "archive", actor, productId: product.id });
  });
}

export async function restoreProductAsDraft(
  productId: string,
  actor: LifecycleActor,
  store: ProductLifecycleStore,
): Promise<void> {
  await store.transaction(actor, async (tx) => {
    const product = requireProduct(await tx.getProduct(productId));
    if (product.lifecycle !== "archived") {
      throw new ProductLifecycleError("product_not_archived", 409);
    }
    await tx.updateProduct(product.id, { lifecycle: "unpublished", status: "draft" });
    await tx.recordAuditEvent({ action: "restore", actor, productId: product.id });
  });
}

export async function deleteUnreferencedDraft(
  productId: string,
  actor: LifecycleActor,
  confirmation: string,
  store: ProductLifecycleStore,
): Promise<void> {
  await store.transaction(actor, async (tx) => {
    const product = requireProduct(await tx.getProduct(productId));
    if (confirmation !== `DELETE ${product.slug}`) {
      throw new ProductLifecycleError("delete_confirmation_required", 400);
    }
    if (product.lifecycle !== "unpublished") {
      throw new ProductLifecycleError("product_lifecycle_must_be_unpublished", 409);
    }
    if (product.hasPublicationHistory) {
      throw new ProductLifecycleError("product_has_publication_history", 409);
    }
    if (product.referencedByOrder) {
      throw new ProductLifecycleError("product_has_order_history", 409);
    }
    if (product.mediaOwnedOnlyByProduct.length > 0) {
      throw new ProductLifecycleError("product_has_product_media", 409);
    }

    await tx.recordAuditEvent({ action: "delete_draft", actor, productId: product.id });
    await tx.deleteProduct(product.id);
  });
}

type PayloadProduct = Record<string, unknown> & { id: number | string };
type TransactionDatabase = { execute(query: unknown): Promise<unknown> };

function relationIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(relationIds);
  if (typeof value === "number" || typeof value === "string") return [String(value)];
  if (value && typeof value === "object" && "id" in value) return relationIds((value as { id?: unknown }).id);
  return [];
}

function productMediaIds(product: PayloadProduct): string[] {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return [...new Set([
    ...relationIds(product.primaryImageId),
    ...relationIds(product.galleryImageIds),
    ...relationIds(product.sceneImageIds),
    ...relationIds(product.seoImageId),
    ...variants.flatMap((variant) => {
      const record = variant && typeof variant === "object" ? variant as Record<string, unknown> : {};
      return [...relationIds(record.thumbnailId), ...relationIds(record.imageId)];
    }),
  ])];
}

async function transactionDatabase(req: PayloadRequest): Promise<TransactionDatabase> {
  const transactionId = req.transactionID ? String(await req.transactionID) : "";
  const database = req.payload.db.sessions?.[transactionId]?.db as TransactionDatabase | undefined;
  if (!database?.execute) throw new Error("Product lifecycle requires an active Payload transaction");
  return database;
}

type LifecycleRouteAction = "archive" | "restore" | "delete";
type LifecycleRouteContext = { params: Promise<{ id: string }> };
type LifecycleRouteDependencies = {
  authenticate(headers: Headers): Promise<LifecycleActor>;
  archive(id: string, actor: LifecycleActor, confirmation: string): Promise<void>;
  remove(id: string, actor: LifecycleActor, confirmation: string): Promise<void>;
  restore(id: string, actor: LifecycleActor): Promise<void>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function lifecycleErrorResponse(error: unknown): Response {
  if (error instanceof ProductLifecycleError) {
    return Response.json({ code: error.code }, { status: error.status });
  }
  if (error instanceof APIError && error.status === 401) {
    return Response.json({ code: "unauthorized" }, { status: 401 });
  }
  return Response.json({ code: "product_lifecycle_failed" }, { status: 500 });
}

export function createProductLifecycleRouteHandler(
  dependencies: LifecycleRouteDependencies,
  action: LifecycleRouteAction,
) {
  return async function POST(request: Request, { params }: LifecycleRouteContext): Promise<Response> {
    if (!request.headers.get("origin") || !isSameOrigin(request)) {
      return Response.json({ code: "forbidden" }, { status: 403 });
    }
    try {
      const actor = await dependencies.authenticate(request.headers);
      const body = await request.json() as unknown;
      if (!isPlainObject(body)) return Response.json({ code: "invalid_json_body" }, { status: 400 });
      const allowedKeys = action === "restore" ? [] : ["confirmation"];
      if (Object.keys(body).some((key) => !allowedKeys.includes(key))) {
        return Response.json({ code: "invalid_json_body" }, { status: 400 });
      }
      if (action !== "restore" && typeof body.confirmation !== "string") {
        return Response.json({ code: "confirmation_required" }, { status: 400 });
      }
      const { id } = await params;
      if (!id.trim()) return Response.json({ code: "product_id_required" }, { status: 400 });
      if (action === "archive") await dependencies.archive(id, actor, body.confirmation as string);
      if (action === "restore") await dependencies.restore(id, actor);
      if (action === "delete") await dependencies.remove(id, actor, body.confirmation as string);
      return Response.json({ ok: true });
    } catch (error) {
      if (error instanceof SyntaxError) return Response.json({ code: "invalid_json" }, { status: 400 });
      return lifecycleErrorResponse(error);
    }
  };
}

async function hasOrderReferences(req: PayloadRequest, product: PayloadProduct): Promise<boolean> {
  const operationalId = typeof product.operationalProductId === "string" && /^\d+$/.test(product.operationalProductId)
    ? Number(product.operationalProductId)
    : null;
  const result = await (await transactionDatabase(req)).execute(sql`
    SELECT EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.product_variants pv ON pv.id = oi.variant_id
      JOIN public.products p ON p.id = pv.product_id
      WHERE p.cms_product_id = ${String(product.id)}
        OR (${operationalId} IS NOT NULL AND p.id = ${operationalId})
    ) AS referenced
  `) as { rows?: Array<{ referenced?: boolean }> } | Array<{ referenced?: boolean }>;
  const rows = Array.isArray(result) ? result : result.rows ?? [];
  return rows[0]?.referenced === true;
}

async function hasPublicationHistory(payload: Payload, product: PayloadProduct, req: PayloadRequest): Promise<boolean> {
  if (product.lastPublishedAt || Number(product.lastPublishedRevision ?? 0) > 0) return true;
  const versions = await payload.findVersions({
    collection: "products",
    depth: 0,
    limit: 50,
    overrideAccess: true,
    pagination: false,
    req,
    where: { parent: { equals: product.id } },
  });
  return versions.docs.some((version) => (
    version.version && typeof version.version === "object"
    && (version.version as { _status?: unknown })._status === "published"
  ));
}

export function createPayloadProductLifecycleStore(payload: Payload): ProductLifecycleStore {
  return {
    transaction(actor, work) {
      return runPayloadTransaction(payload, async (req) => {
        const loadProduct = async (id: string): Promise<LifecycleProduct | null> => {
          await lockProduct(req, id);
          let product: PayloadProduct;
          try {
            product = await payload.findByID({
              collection: "products",
              depth: 0,
              draft: true,
              id,
              overrideAccess: true,
              req,
            }) as unknown as PayloadProduct;
          } catch (error) {
            if (error && typeof error === "object" && "status" in error && (error as { status?: unknown }).status === 404) return null;
            throw error;
          }

          const mediaOwnedOnlyByProduct: string[] = [];
          for (const mediaId of productMediaIds(product)) {
            const references = await findMediaReferences(payload, mediaId, req);
            if (references.length > 0 && references.every((reference) => reference.source === "product" && reference.sourceId === String(product.id))) {
              mediaOwnedOnlyByProduct.push(mediaId);
            }
          }

          return {
            hasPublicationHistory: await hasPublicationHistory(payload, product, req),
            id: String(product.id),
            lifecycle: product.lifecycle as ProductLifecycle,
            mediaOwnedOnlyByProduct,
            referencedByOrder: await hasOrderReferences(req, product),
            slug: String(product.slug ?? ""),
            status: product._status === "published" ? "published" : "draft",
          };
        };

        return work({
          async deleteProduct(id) {
            await payload.delete({ collection: "products", id, overrideAccess: true, req });
          },
          getProduct: loadProduct,
          async recordAuditEvent(input) {
            const actorId = typeof input.actor.id === "number" ? input.actor.id : Number(input.actor.id);
            if (!Number.isSafeInteger(actorId) || actorId <= 0) {
              throw new ProductLifecycleError("unauthorized", 401);
            }
            await payload.create({
              collection: "audit-events",
              data: {
                action: input.action,
                actor: actorId,
                subjectType: "product",
                subjectId: input.productId,
                details: input.details ?? {},
              },
              overrideAccess: true,
              req,
            });
          },
          async unpublishOperationalProduct(product, lifecycleActor) {
            const source = await payload.findByID({
              collection: "products",
              depth: 0,
              draft: true,
              id: product.id,
              overrideAccess: true,
              req,
            }) as unknown as PayloadProduct;
            const revision = Number(source.editorialRevision ?? 0);
            await unpublishProduct({
              actor: { id: String(lifecycleActor.id), email: lifecycleActor.email },
              cmsProductId: product.id,
              correlationId: crypto.randomUUID(),
              currentRevision: revision,
              expectedRevision: revision,
            }, createPostgresPublicationStore(req));
          },
          async updateProduct(id, data) {
            await payload.update({
              collection: "products",
              context: productDraftSaveContext,
              data: {
                ...(data.lifecycle ? { lifecycle: data.lifecycle } : {}),
                ...(data.status ? { _status: data.status } : {}),
              },
              draft: true,
              id,
              overrideAccess: true,
              req,
            });
          },
        });
      }, undefined, { user: actor as Admin });
    },
  };
}
