import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicationConflictError } from "../../lib/cms/publication";
import { createPostgresPublicationStore } from "../../lib/cms/publication-store";

function sqlText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(sqlText).join("");
  if (!value || typeof value !== "object") return "?";
  const record = value as { queryChunks?: unknown[]; value?: unknown };
  if (record.queryChunks) return record.queryChunks.map(sqlText).join("");
  if (record.value !== undefined) return sqlText(record.value);
  return "?";
}

function sqlValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(sqlValues);
  if (!value || typeof value !== "object") return [value];
  const record = value as { queryChunks?: unknown[]; value?: unknown };
  if (record.queryChunks) return record.queryChunks.flatMap(sqlValues);
  if (record.value !== undefined) return sqlValues(record.value);
  return [];
}

function fixture() {
  const queries: unknown[] = [];
  const execute = vi.fn(async (statement: unknown) => {
    queries.push(statement);
    const text = sqlText(statement);
    if (text.includes("SELECT id, cms_product_id") && text.includes("FROM public.products")) {
      return [{ id: 42, publication_revision: 3 }];
    }
    if (text.includes("SELECT id, publication_revision, slug")) {
      return [{ id: 42, publication_revision: 3, slug: "ak820" }];
    }
    if (text.includes("SELECT id FROM public.product_variants")) return [{ id: 99 }];
    if (text.includes("RETURNING id, slug")) return [{ id: 42, slug: "ak820" }];
    if (text.includes("RETURNING id")) return [{ id: text.includes("product_variants") ? 99 : 42 }];
    return [];
  });
  const req = {
    payload: { db: { sessions: { "tx-1": { db: { execute } } } } },
    transactionID: "tx-1",
  };
  return { execute, queries, req, store: createPostgresPublicationStore(req as never) };
}

const snapshot = {
  cmsProductId: "product-1", sourceType: "manual", rmsManageNumber: null,
  operationalProductId: "42",
  slug: "ak820", name: "AK820", descriptionHtml: "", category: "mechanical-keyboard",
  featured: false, merchandisingOrder: 0, revision: 3, correlationId: "correlation-1",
  shortStatement: null, seoTitle: null, seoDescription: null,
} as const;

const variant = {
  cmsVariantId: "variant-1", operationalVariantId: "99", sku: "RENAMED-SKU",
  rmsSkuNumber: null, inventoryMode: "manual", priceJpy: 1000,
  compareAtPriceJpy: null, colorName: "Black", colorSwatch: null,
  thumbnailUrl: null, imageUrl: null, active: true, comparisonEvidenceType: null,
  comparisonEvidenceReference: null, comparisonApprovedBy: null, comparisonApprovedAt: null,
} as const;

describe("PostgreSQL publication store", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reuses the active Payload transaction and permits same-revision recovery", async () => {
    const { store, queries } = fixture();
    await expect(store.transaction((tx) => tx.upsertProduct(snapshot))).resolves.toEqual({
      operationalProductId: "42",
    });
    expect(queries.map(sqlText).join("\n")).toContain("UPDATE public.products SET");
  });

  it("prioritizes the linked numeric product ID and updates that same row", async () => {
    const { store, queries } = fixture();

    await store.transaction((tx) => tx.upsertProduct(snapshot));

    const select = queries.find((query) => sqlText(query).includes("SELECT id, cms_product_id"));
    const update = queries.find((query) => sqlText(query).includes("UPDATE public.products SET"));
    expect(sqlText(select)).toContain("id =");
    expect(sqlText(select)).toContain("ORDER BY");
    expect(sqlValues(select)).toEqual(expect.arrayContaining([42, "product-1"]));
    expect(sqlValues(update)).toContain(42);
  });

  it("does not treat the linked public row's own slug as a conflict", async () => {
    const { store, queries } = fixture();

    await store.transaction((tx) => tx.assertSlugAvailable("ak820", "product-1", "42"));

    const select = queries.find((query) => sqlText(query).includes("WHERE slug ="));
    expect(sqlText(select)).toContain("id <>");
    expect(sqlValues(select)).toEqual(expect.arrayContaining(["ak820", "product-1", 42]));
  });

  it("rejects a linked numeric ID owned by another CMS product without updating it", async () => {
    const { req, queries } = fixture();
    const execute = vi.fn(async (statement: unknown) => {
      queries.push(statement);
      const text = sqlText(statement);
      if (text.includes("SELECT id, cms_product_id") && text.includes("FROM public.products")) {
        return [{
          id: 42,
          cms_product_id: "other-product",
          publication_revision: 1,
          rms_manage_number: null,
        }];
      }
      return [];
    });
    req.payload.db.sessions["tx-1"].db.execute = execute;
    const store = createPostgresPublicationStore(req as never);

    await expect(store.transaction((tx) => tx.upsertProduct(snapshot)))
      .rejects.toBeInstanceOf(PublicationConflictError);
    expect(queries.some((query) => sqlText(query).includes("UPDATE public.products SET"))).toBe(false);
  });

  it("rejects only a newer live publication revision", async () => {
    const { req } = fixture();
    const execute = vi.fn(async (statement: unknown) => sqlText(statement).includes("SELECT id, cms_product_id")
      ? [{ id: 42, publication_revision: 4 }]
      : []);
    req.payload.db.sessions["tx-1"].db.execute = execute;
    const store = createPostgresPublicationStore(req as never);
    await expect(store.transaction((tx) => tx.upsertProduct(snapshot)))
      .rejects.toBeInstanceOf(PublicationConflictError);
  });

  it("matches operationalVariantId first within the product and preserves its numeric row ID", async () => {
    const { store, queries } = fixture();
    const ids = await store.transaction((tx) => tx.upsertVariants("42", [variant]));
    expect(ids).toEqual(["99"]);
    const select = queries.find((query) => sqlText(query).includes("SELECT id FROM public.product_variants"));
    expect(sqlText(select)).toContain("product_id =");
    expect(sqlText(select)).toContain("id =");
    expect(sqlValues(select)).toEqual(expect.arrayContaining([42, 99, "RENAMED-SKU"]));
  });

  it("disables every missing row including legacy rows with null cms_variant_id", async () => {
    const { store, queries } = fixture();
    await store.transaction((tx) => tx.disableMissingVariants("42", ["99"]));
    const update = queries.find((query) => sqlText(query).includes("SET active = FALSE"));
    expect(sqlText(update)).toContain("id NOT IN (");
    expect(sqlText(update)).not.toContain("cms_variant_id IS NOT NULL");
  });

  it("allows a newer CMS revision to unpublish and advances the public revision", async () => {
    const { store, queries } = fixture();
    await expect(store.transaction((tx) => tx.setPublished("product-1", 5, false, "correlation-2")))
      .resolves.toMatchObject({ operationalProductId: "42" });
    const update = queries.find((query) => sqlText(query).includes("UPDATE public.products") && sqlText(query).includes("publication_revision"));
    expect(sqlValues(update)).toEqual(expect.arrayContaining([5, "correlation-2"]));
  });

  it("writes publication audit through the same transaction database", async () => {
    const { store, queries } = fixture();
    await store.transaction((tx) => tx.appendPublicationAudit({
      action: "publish", actorId: "admin-1", actorEmail: "xiet@a-jazz.com",
      cmsProductId: "product-1", correlationId: "correlation-1", revision: 3,
      operationalProductId: "42",
    }));
    expect(queries.some((query) => sqlText(query).includes("INSERT INTO public.publication_audit_events"))).toBe(true);
  });
});
