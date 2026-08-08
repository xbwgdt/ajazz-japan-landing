import { APIError, type CollectionBeforeOperationHook, type CollectionConfig, type PayloadRequest } from "payload";
import { PRODUCT_CATEGORIES } from "../../lib/commerce/product-categories";
import { adminOnly } from "../access/admin";
import { productSpecifications } from "../fields/productSpecifications";
import { productVariants } from "../fields/productVariants";
import { productDraftSaveContext, protectSourceFields } from "../hooks/protectSourceFields";
import { rejectRetiredMediaReferences } from "../hooks/rejectRetiredMediaReferences";
import { writeAuditEvent } from "../hooks/writeAuditEvent";
import { prepareProductVersionRestore } from "../hooks/productVersionRestore";
import { lockSingleProductOperation } from "../services/productConcurrency";
import { createPreviewToken } from "../../lib/cms/preview";

type RevisionUpdateBody = {
  data?: Record<string, unknown>;
  expectedRevision?: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function jsonError(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status });
}

export const rejectBulkProductUpdates: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation === "update" && (!("id" in args) || args.id === undefined)) {
    throw new APIError("Bulk product updates are disabled.", 400, {
      code: "product_bulk_update_forbidden",
    });
  }
  return args;
};

export async function updateProductWithRevision(req: PayloadRequest): Promise<Response> {
  if (!req.user) return jsonError(401, { code: "unauthorized" });

  const id = req.routeParams?.id;
  if (typeof id !== "string" && typeof id !== "number") {
    return jsonError(400, { code: "product_id_required" });
  }

  let body: RevisionUpdateBody;
  try {
    body = await req.json?.() as RevisionUpdateBody;
  } catch {
    return jsonError(400, { code: "invalid_json" });
  }
  if (!Number.isInteger(body?.expectedRevision)) {
    return jsonError(400, { code: "expected_revision_required" });
  }
  if (!isPlainObject(body.data)) return jsonError(400, { code: "invalid_editorial_data" });

  const current = await req.payload.findByID({
    collection: "products",
    depth: 0,
    id,
    overrideAccess: false,
    req,
  });
  const currentRevision = Number(current.editorialRevision ?? 0);
  if (currentRevision !== body.expectedRevision) {
    return jsonError(409, { code: "stale_editorial_revision", currentRevision });
  }

  const doc = await req.payload.update({
    collection: "products",
    context: { expectedRevision: body.expectedRevision, ...productDraftSaveContext },
    data: body.data,
    draft: true,
    id,
    overrideAccess: false,
    req,
  });

  return Response.json({ doc });
}

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    defaultColumns: ["name", "category", "sourceType", "lifecycle", "updatedAt"],
    preview: (doc) => {
      const id = doc.id;
      const revision = Number(doc.editorialRevision);
      const slug = typeof doc.slug === "string" ? doc.slug : "";
      if ((typeof id !== "string" && typeof id !== "number") || !Number.isSafeInteger(revision) || !slug) return null;
      const now = Math.floor(Date.now() / 1_000);
      const token = createPreviewToken({ productId: id, revision, expiresAt: now + 600 }, { now });
      return `/api/cms/preview?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
    },
    useAsTitle: "name",
  },
  disableBulkEdit: true,
  access: {
    create: adminOnly,
    delete: () => false,
    read: adminOnly,
    update: adminOnly,
  },
  endpoints: [{ method: "patch", path: "/:id/editorial", handler: updateProductWithRevision }],
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Basic information",
          fields: [
            {
              name: "sourceType",
              type: "select",
              required: true,
              defaultValue: "manual",
              options: [
                { label: "RMS", value: "rms" },
                { label: "Manual", value: "manual" },
              ],
            },
            { name: "rmsManageNumber", type: "text", index: true },
            {
              name: "operationalProductId",
              type: "text",
              index: true,
              admin: { readOnly: true },
            },
            { name: "name", type: "text", required: true },
            { name: "slug", type: "text", required: true, unique: true, index: true },
            { name: "shortStatement", type: "textarea" },
            { name: "description", type: "richText" },
            {
              name: "category",
              type: "select",
              required: true,
              options: PRODUCT_CATEGORIES.map(({ key, label }) => ({ label, value: key })),
            },
            {
              name: "lifecycle",
              type: "select",
              required: true,
              defaultValue: "unpublished",
              options: [
                { label: "Active", value: "active" },
                { label: "Unpublished", value: "unpublished" },
                { label: "Archived", value: "archived" },
              ],
            },
            { name: "featured", type: "checkbox", defaultValue: false },
            { name: "merchandisingOrder", type: "number", defaultValue: 0 },
          ],
        },
        {
          label: "Media and colors",
          fields: [
            { name: "primaryImageId", type: "relationship", relationTo: "media" },
            { name: "galleryImageIds", type: "relationship", relationTo: "media", hasMany: true },
            { name: "sceneImageIds", type: "relationship", relationTo: "media", hasMany: true },
          ],
        },
        { label: "Price and inventory", fields: [productVariants] },
        { label: "Specifications", fields: [productSpecifications] },
        {
          label: "SEO",
          fields: [
            { name: "seoTitle", type: "text" },
            { name: "seoDescription", type: "textarea" },
            { name: "seoImageId", type: "relationship", relationTo: "media" },
          ],
        },
        {
          label: "Versions",
          fields: [
            {
              name: "editorialRevision",
              type: "number",
              required: true,
              defaultValue: 0,
              admin: { readOnly: true },
            },
            { name: "lastPublishedAt", type: "date", admin: { readOnly: true } },
            { name: "lastPublishedRevision", type: "number", admin: { readOnly: true } },
            { name: "lastPublicationCorrelationId", type: "text", admin: { readOnly: true } },
            {
              name: "lastPublishedBy",
              type: "relationship",
              relationTo: "admins",
              admin: { readOnly: true },
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeOperation: [rejectBulkProductUpdates, prepareProductVersionRestore, lockSingleProductOperation],
    beforeChange: [protectSourceFields, rejectRetiredMediaReferences],
    afterChange: [writeAuditEvent],
  },
  versions: {
    drafts: {
      autosave: { interval: 1500, showSaveDraftButton: true },
      validate: false,
    },
    maxPerDoc: 50,
  },
};
