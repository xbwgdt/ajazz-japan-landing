import { beforeEach, describe, expect, it, vi } from "vitest";

const { queries, sqlClient } = vi.hoisted(() => {
  const queries: string[] = [];
  const txSql = vi.fn((strings: TemplateStringsArray) => {
    const text = strings.join("?");
    queries.push(text);
    if (text.includes("INSERT INTO public.products")) return Promise.resolve([{ id: 42 }]);
    if (text.includes("UPDATE public.products") && text.includes("published = FALSE")) {
      return Promise.resolve([{ id: 42, slug: "ak820" }]);
    }
    return Promise.resolve([]);
  });
  const sqlClient = {
    begin: vi.fn(async (work: (sql: typeof txSql) => Promise<unknown>) => work(txSql)),
  };
  return { queries, sqlClient };
});

vi.mock("../../lib/commerce/db", () => ({
  commerceSql: () => sqlClient,
  ensureCommerceSchema: vi.fn(async () => undefined),
}));

import { createPostgresPublicationStore } from "../../lib/cms/publication-store";

describe("PostgreSQL publication store", () => {
  beforeEach(() => {
    queries.length = 0;
    vi.clearAllMocks();
  });

  it("uses one database begin block and preserves numeric product and variant IDs", async () => {
    const store = createPostgresPublicationStore();
    await store.transaction(async (tx) => {
      const product = await tx.upsertProduct({
        cmsProductId: "product-1", sourceType: "manual", rmsManageNumber: null,
        slug: "ak820", name: "AK820", descriptionHtml: "", category: "mechanical-keyboard",
        featured: false, merchandisingOrder: 0, revision: 2, correlationId: "correlation-1",
        shortStatement: null, seoTitle: null, seoDescription: null,
      });
      await tx.upsertVariants(product.operationalProductId, [{
        cmsVariantId: "variant-1", sku: "WEB-1", rmsSkuNumber: null, inventoryMode: "manual",
        priceJpy: 1000, compareAtPriceJpy: null, colorName: "Black", colorSwatch: null,
        thumbnailUrl: null, imageUrl: null, active: true, comparisonEvidenceType: null,
        comparisonEvidenceReference: null, comparisonApprovedBy: null, comparisonApprovedAt: null,
      }]);
    });
    expect(sqlClient.begin).toHaveBeenCalledTimes(1);
    expect(queries.join("\n")).toContain("INSERT INTO public.products");
    expect(queries.join("\n")).toContain("INSERT INTO public.product_variants");
    expect(queries.join("\n")).not.toContain("DELETE FROM public.product_variants");
  });

  it("writes the publication audit through the transaction SQL handle", async () => {
    const store = createPostgresPublicationStore();
    await store.transaction((tx) => tx.appendPublicationAudit({
      action: "publish", actorId: "admin-1", actorEmail: "xiet@a-jazz.com",
      cmsProductId: "product-1", correlationId: "correlation-1", revision: 2,
      operationalProductId: "42",
    }));
    expect(queries.some((query) => query.includes("INSERT INTO public.publication_audit_events"))).toBe(true);
  });
});
