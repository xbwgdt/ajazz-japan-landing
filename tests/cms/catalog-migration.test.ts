import { describe, expect, it, vi } from "vitest";
import {
  planCatalogMigration,
  reconcileCatalog,
  type CmsCatalogProduct,
  type CatalogMigrationCreate,
  type CatalogMigrationLink,
  type OperationalCatalogProduct,
} from "../../lib/cms/catalog-migration";
import {
  createCmsProductBaseline,
  executeCatalogMigration,
  loadAllCmsProducts,
  parseCatalogMigrationArguments,
  reconciliationCmsProducts,
  type CatalogMigrationCheckpoint,
} from "../../scripts/migrate-catalog-to-cms";

function operationalProduct(
  id: number,
  overrides: Partial<OperationalCatalogProduct> = {},
): OperationalCatalogProduct {
  return {
    id,
    sourceType: "rms",
    rmsManageNumber: `manage-${id}`,
    slug: `product-${id}`,
    name: `Product ${id}`,
    descriptionHtml: `<p>Product ${id}</p>`,
    category: "mechanical-keyboard",
    shortStatement: `Statement ${id}`,
    seoTitle: `SEO ${id}`,
    seoDescription: `SEO description ${id}`,
    featured: id === 1,
    merchandisingOrder: id,
    lifecycle: id === 1 ? "active" : "unpublished",
    published: id === 1,
    publicationRevision: 3,
    cmsProductId: null,
    images: [
      { id: id * 10, url: `https://example.test/${id}-1.jpg`, position: 0 },
      { id: id * 10 + 1, url: `https://example.test/${id}-2.jpg`, position: 1 },
    ],
    variants: [{
      id: id * 100,
      cmsVariantId: null,
      sku: `SKU-${id}`,
      rmsSkuNumber: `RMS-SKU-${id}`,
      inventoryMode: "rms",
      priceJpy: id * 1000,
      compareAtPriceJpy: id * 1200,
      comparisonEvidenceType: "manufacturer_price",
      comparisonEvidenceReference: `Evidence ${id}`,
      comparisonApprovedBy: "admin-1",
      comparisonApprovedAt: "2026-08-01T00:00:00.000Z",
      colorName: "Black",
      colorSwatch: "#000000",
      thumbnailUrl: `https://example.test/${id}-thumb.jpg`,
      imageUrl: `https://example.test/${id}-variant.jpg`,
      active: true,
    }],
    ...overrides,
  };
}

function cmsFromOperational(
  operational: OperationalCatalogProduct,
  id = `cms-${operational.id}`,
): CmsCatalogProduct {
  return {
    id,
    operationalProductId: String(operational.id),
    sourceType: operational.sourceType,
    rmsManageNumber: operational.rmsManageNumber,
    slug: operational.slug,
    name: operational.name,
    descriptionHtml: operational.descriptionHtml,
    category: operational.category,
    shortStatement: operational.shortStatement,
    seoTitle: operational.seoTitle,
    seoDescription: operational.seoDescription,
    featured: operational.featured,
    merchandisingOrder: operational.merchandisingOrder,
    lifecycle: operational.lifecycle,
    status: operational.published ? "published" : "draft",
    publicationRevision: operational.publicationRevision,
    images: operational.images.map(({ url, position }) => ({ url, position })),
    variants: operational.variants.map((variant, index) => ({
      id: `cms-variant-${operational.id}-${index}`,
      operationalVariantId: String(variant.id),
      sku: variant.sku ?? variant.rmsSkuNumber ?? String(variant.id),
      rmsSkuNumber: variant.rmsSkuNumber,
      inventoryMode: variant.inventoryMode,
      salePriceJpy: variant.priceJpy,
        compareAtPriceJpy: variant.compareAtPriceJpy,
        comparisonEvidenceType: variant.comparisonEvidenceType,
        comparisonEvidenceReference: variant.comparisonEvidenceReference,
        comparisonApprovedBy: variant.comparisonApprovedBy,
        comparisonApprovedAt: variant.comparisonApprovedAt,
      colorName: variant.colorName ?? variant.sku ?? "Variant",
      colorSwatch: variant.colorSwatch,
      thumbnailUrl: variant.thumbnailUrl,
      imageUrl: variant.imageUrl,
      active: variant.active,
    })),
  };
}

function createdLink(create: CatalogMigrationCreate): CatalogMigrationLink {
  return {
    operationalProductId: create.operationalProductId,
    cmsProductId: `cms-${create.operationalProductId}`,
    setCmsOperationalProductId: false,
    variants: create.variants.map((variant, index) => ({
      operationalVariantId: variant.operationalVariantId,
      cmsVariantId: `cms-variant-${create.operationalProductId}-${index}`,
      setCmsOperationalVariantId: false,
    })),
  };
}

describe("catalog migration planning", () => {
  it("preserves the complete current operational baseline in a CMS create", () => {
    const product = operationalProduct(1);
    const plan = planCatalogMigration([product], []);

    expect(plan.conflicts).toEqual([]);
    expect(plan.creates).toEqual([expect.objectContaining({
      operationalProductId: "1",
      rmsManageNumber: "manage-1",
      status: "published",
      lifecycle: "active",
      publicationRevision: 3,
      images: [
        { url: "https://example.test/1-1.jpg", position: 0 },
        { url: "https://example.test/1-2.jpg", position: 1 },
      ],
      variants: [expect.objectContaining({
        operationalVariantId: "100",
        rmsSkuNumber: "RMS-SKU-1",
        salePriceJpy: 1000,
        compareAtPriceJpy: 1200,
        comparisonEvidenceType: "manufacturer_price",
        comparisonEvidenceReference: "Evidence 1",
        comparisonApprovedBy: "admin-1",
        comparisonApprovedAt: "2026-08-01T00:00:00.000Z",
        inventoryMode: "rms",
      })],
    })]);
  });

  it("matches product and variant IDs before RMS identities", () => {
    const product = operationalProduct(1);
    const cms = cmsFromOperational(product);
    cms.rmsManageNumber = "manage-other";
    cms.variants[0].rmsSkuNumber = "RMS-SKU-OTHER";

    const plan = planCatalogMigration([product], [cms]);

    expect(plan.creates).toEqual([]);
    expect(plan.links).toEqual([expect.objectContaining({ cmsProductId: "cms-1", operationalProductId: "1" })]);
    expect(plan.conflicts).toEqual([]);
  });

  it("matches unlinked CMS products by RMS identity as a fallback", () => {
    const product = operationalProduct(1);
    const cms = cmsFromOperational(product);
    cms.operationalProductId = null;
    cms.variants[0].operationalVariantId = null;

    const plan = planCatalogMigration([product], [cms]);

    expect(plan.creates).toEqual([]);
    expect(plan.links).toEqual([expect.objectContaining({
      cmsProductId: "cms-1",
      operationalProductId: "1",
      setCmsOperationalProductId: true,
      variants: [expect.objectContaining({ setCmsOperationalVariantId: true })],
    })]);
    expect(plan.matches[0]?.variants[0]).toMatchObject({
      operationalVariantId: "100",
      cmsVariantId: "cms-variant-1-0",
      matchedBy: "rmsSkuNumber",
    });
  });

  it("produces no creates or links on the second migration", () => {
    const product = operationalProduct(1, { cmsProductId: "cms-1" });
    product.variants[0].cmsVariantId = "cms-variant-1-0";
    const cms = cmsFromOperational(product);

    const second = planCatalogMigration([product], [cms]);

    expect(second.creates).toHaveLength(0);
    expect(second.links).toHaveLength(0);
    expect(second.conflicts).toHaveLength(0);
  });

  it("reports conflicting stable identities instead of guessing", () => {
    const product = operationalProduct(1);
    const byId = cmsFromOperational(product, "cms-by-id");
    byId.rmsManageNumber = "other";
    const byRms = cmsFromOperational(product, "cms-by-rms");
    byRms.operationalProductId = "999";

    const plan = planCatalogMigration([product], [byId, byRms]);

    expect(plan.creates).toHaveLength(0);
    expect(plan.links).toHaveLength(0);
    expect(plan.conflicts).toEqual([expect.objectContaining({
      operationalProductId: "1",
      code: "product_identity_conflict",
    })]);
  });

  it("blocks creation when an operational product already points to a missing CMS record", () => {
    const product = operationalProduct(1, { cmsProductId: "cms-missing" });

    const plan = planCatalogMigration([product], []);

    expect(plan.creates).toEqual([]);
    expect(plan.links).toEqual([]);
    expect(plan.conflicts).toEqual([expect.objectContaining({
      operationalProductId: "1",
      code: "product_identity_conflict",
    })]);
  });

  it("rejects a stable-identity match across different source authorities", () => {
    const product = operationalProduct(1);
    const cms = cmsFromOperational(product);
    cms.sourceType = "manual";

    const plan = planCatalogMigration([product], [cms]);

    expect(plan.creates).toEqual([]);
    expect(plan.links).toEqual([]);
    expect(plan.conflicts).toEqual([expect.objectContaining({
      operationalProductId: "1",
      code: "product_identity_conflict",
    })]);
  });
});

describe("catalog reconciliation", () => {
  it("reports count, link, SKU, price, image, and publication mismatches", () => {
    const first = operationalProduct(1, { cmsProductId: "wrong-cms" });
    const second = operationalProduct(2);
    const cms = cmsFromOperational(first);
    cms.variants[0].rmsSkuNumber = "WRONG-SKU";
    cms.variants[0].salePriceJpy = 999;
    cms.images = [];
    cms.status = "draft";

    const report = reconcileCatalog([first, second], [cms]);

    expect(report.ok).toBe(false);
    expect(report.productCount).toEqual({ operational: 2, cms: 1, matches: false });
    expect(report.variantCount.matches).toBe(false);
    expect(report.rmsLinkMismatches).not.toHaveLength(0);
    expect(report.skuMismatches).not.toHaveLength(0);
    expect(report.priceMismatches).not.toHaveLength(0);
    expect(report.imageCountMismatches).not.toHaveLength(0);
    expect(report.publicationStateMismatches).not.toHaveLength(0);
  });

  it("is successful when all migrated fields and links agree", () => {
    const product = operationalProduct(1, { cmsProductId: "cms-1" });
    product.variants[0].cmsVariantId = "cms-variant-1-0";
    const report = reconcileCatalog([product], [cmsFromOperational(product)]);

    expect(report).toMatchObject({
      ok: true,
      productCount: { operational: 1, cms: 1, matches: true },
      variantCount: { operational: 1, cms: 1, matches: true },
    });
  });

  it("reconciles against the published baseline rather than an editable draft", async () => {
    const product = operationalProduct(1, { cmsProductId: "cms-1" });
    product.variants[0].cmsVariantId = "cms-variant-1-0";
    const published = cmsFromOperational(product);
    const draft = structuredClone(published);
    draft.status = "draft";
    draft.variants[0].salePriceJpy = 999;

    const result = await executeCatalogMigration({
      arguments: { mode: "reconcile" },
      environment: {},
      loadCatalogs: async () => ({ operational: [product], cms: [draft], publishedCms: [published] }),
    });

    expect(result).toMatchObject({ exitCode: 0, reconciliation: { ok: true } });
  });

  it("overlays protected draft identities onto published reconciliation content", () => {
    const product = operationalProduct(1, { cmsProductId: "cms-1" });
    product.variants[0].cmsVariantId = "cms-variant-draft";
    const latest = cmsFromOperational(product);
    latest.variants[0].id = "cms-variant-draft";
    latest.variants[0].salePriceJpy = 999;
    const published = cmsFromOperational(product);
    published.operationalProductId = null;
    published.variants[0].id = "cms-variant-published";
    published.variants[0].operationalVariantId = null;

    const [merged] = reconciliationCmsProducts([latest], [published], [product]);

    expect(merged).toMatchObject({
      operationalProductId: "1",
      status: "published",
      variants: [{
        id: "cms-variant-draft",
        operationalVariantId: "100",
        salePriceJpy: 1000,
      }],
    });
  });
});

describe("catalog migration CLI", () => {
  it("loads the latest draft identity while retaining the published baseline state", async () => {
    const find = vi.fn(async () => ({
      docs: [{
        id: "cms-1",
        operationalProductId: "1",
        sourceType: "rms",
        rmsManageNumber: "manage-1",
        slug: "product-1",
        name: "Product 1",
        category: "other",
        lifecycle: "active",
        _status: "draft",
        lastPublishedRevision: 3,
        variants: [],
      }],
      hasNextPage: false,
    }));

    const products = await loadAllCmsProducts({
      config: {},
      create: vi.fn(),
      find,
      update: vi.fn(),
    });

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ draft: true }));
    expect(products[0]).toMatchObject({ id: "cms-1", status: "draft" });
  });

  it("creates a published baseline and a separate editable draft with migrated media", async () => {
    const create = planCatalogMigration([operationalProduct(1)], []).creates[0];
    const payload = {
      config: {},
      find: vi.fn(async () => ({ docs: [] })),
      create: vi.fn(async (args: Record<string, unknown>) => ({
        id: "cms-1",
        ...args.data as object,
        variants: ((args.data as { variants?: Record<string, unknown>[] }).variants ?? [])
          .map((variant, index) => ({ ...variant, id: `cms-variant-1-${index}` })),
      })),
      update: vi.fn(async (args: Record<string, unknown>) => ({ id: "cms-1", ...args.data as object })),
    };
    const mediaIds = new Map<string, string>();

    const result = await createCmsProductBaseline(create, {
      actor: { id: 7, email: "xiet@a-jazz.com" },
      contexts: {
        draftSave: { draftSave: true },
        publication: { publication: true },
        sourceIngestion: { sourceIngestion: true },
      },
      convertDescription: async () => ({ root: { children: [] } }),
      now: () => new Date("2026-08-09T00:00:00.000Z"),
      payload,
      uploadImage: async (url) => {
        const id = `media-${mediaIds.size + 1}`;
        mediaIds.set(url, id);
        return id;
      },
    });

    expect(result).toMatchObject({
      cmsProductId: "cms-1",
      operationalProductId: "1",
      variants: [{ operationalVariantId: "100", cmsVariantId: "cms-variant-1-0" }],
    });
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "products",
      draft: false,
      data: expect.objectContaining({
        _status: "published",
        operationalProductId: "1",
        primaryImageId: "media-1",
        galleryImageIds: ["media-2"],
        variants: [expect.objectContaining({
          operationalVariantId: "100",
          rmsSkuNumber: "RMS-SKU-1",
          comparisonEvidenceReference: "Evidence 1",
          imageId: "media-4",
          thumbnailId: "media-3",
        })],
      }),
    }));
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      collection: "products",
      draft: true,
      data: expect.objectContaining({
        _status: "draft",
        variants: [expect.objectContaining({ id: "cms-variant-1-0" })],
      }),
      context: expect.objectContaining({ draftSave: true, sourceIngestion: true }),
    }));
  });

  it("repairs an interrupted published-baseline creation by adding the missing draft", async () => {
    const create = planCatalogMigration([operationalProduct(1)], []).creates[0];
    const published = {
      id: "cms-1",
      _status: "published",
      editorialRevision: 1,
      operationalProductId: "1",
      sourceType: "rms",
      rmsManageNumber: "manage-1",
      variants: [{
        id: "cms-variant-1-0",
        operationalVariantId: "100",
        rmsSkuNumber: "RMS-SKU-1",
      }],
    };
    const update = vi.fn(async () => ({ ...published, _status: "draft", editorialRevision: 2 }));

    const result = await createCmsProductBaseline(create, {
      actor: { id: 7, email: "xiet@a-jazz.com" },
      contexts: {
        draftSave: { draftSave: true },
        publication: { publication: true },
        sourceIngestion: { sourceIngestion: true },
      },
      convertDescription: async () => undefined,
      now: () => new Date("2026-08-09T00:00:00.000Z"),
      payload: {
        config: {},
        find: vi.fn(async () => ({ docs: [published] })),
        create: vi.fn(),
        update,
      },
      uploadImage: vi.fn(),
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { _status: "draft" },
      draft: true,
    }));
    expect(result).toMatchObject({ cmsProductId: "cms-1" });
  });

  it("defaults to dry run and requires absolute JSON paths", () => {
    expect(parseCatalogMigrationArguments([])).toMatchObject({ mode: "dry-run" });
    expect(parseCatalogMigrationArguments(["--", "--help"])).toMatchObject({ mode: "help" });
    expect(() => parseCatalogMigrationArguments(["--json", "report.json"]))
      .toThrow("absolute path");
    expect(() => parseCatalogMigrationArguments(["--json", "C:\\temp\\report.txt"]))
      .toThrow(".json");
  });

  it("requires the exact confirmation phrase before apply performs any writes", async () => {
    const loadCatalogs = vi.fn(async () => ({ operational: [operationalProduct(1)], cms: [] }));
    const createCmsProduct = vi.fn();
    const linkCatalogIdentities = vi.fn();

    await expect(executeCatalogMigration({
      arguments: { mode: "apply", jsonPath: "C:\\temp\\migration.json" },
      environment: {},
      loadCatalogs,
      createCmsProduct,
      linkCatalogIdentities,
      readCheckpoint: async () => null,
      writeCheckpoint: async () => undefined,
    })).rejects.toThrow("CMS_MIGRATION_CONFIRM");

    expect(createCmsProduct).not.toHaveBeenCalled();
    expect(linkCatalogIdentities).not.toHaveBeenCalled();
    expect(loadCatalogs).not.toHaveBeenCalled();
  });

  it("applies deterministic batches of 25 and persists resume-safe progress", async () => {
    const operational = Array.from({ length: 27 }, (_, index) => operationalProduct(index + 1));
    const checkpoints: CatalogMigrationCheckpoint[] = [];

    const result = await executeCatalogMigration({
      arguments: { mode: "apply", jsonPath: "C:\\temp\\migration.json" },
      environment: { CMS_MIGRATION_CONFIRM: "AJAZZ_CATALOG_2026" },
      loadCatalogs: async () => ({ operational, cms: [] }),
      createCmsProduct: async (create) => createdLink(create),
      linkCatalogIdentities: async () => undefined,
      readCheckpoint: async () => null,
      writeCheckpoint: async (checkpoint) => { checkpoints.push(structuredClone(checkpoint)); },
      createRunId: () => "run-fixed",
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary).toMatchObject({ created: 27, linked: 27, batches: 2 });
    expect(checkpoints.at(-1)).toMatchObject({
      runId: "run-fixed",
      status: "completed",
      completedOperationalProductIds: operational.map(({ id }) => String(id)),
    });
  });

  it("resumes a compatible checkpoint without recreating completed products", async () => {
    const operational = [operationalProduct(1), operationalProduct(2)];
    const created: string[] = [];
    const linked: string[] = [];
    const checkpoint: CatalogMigrationCheckpoint = {
      version: 1,
      runId: "run-existing",
      planFingerprint: "placeholder",
      status: "running",
      completedOperationalProductIds: ["1"],
      linkedCmsProductIds: { "1": "cms-1" },
      updatedAt: "2026-08-09T00:00:00.000Z",
    };

    const preview = await executeCatalogMigration({
      arguments: { mode: "dry-run" },
      environment: {},
      loadCatalogs: async () => ({ operational, cms: [cmsFromOperational(operational[0])] }),
    });
    checkpoint.planFingerprint = preview.planFingerprint;

    const result = await executeCatalogMigration({
      arguments: { mode: "apply", jsonPath: "C:\\temp\\migration.json" },
      environment: { CMS_MIGRATION_CONFIRM: "AJAZZ_CATALOG_2026" },
      loadCatalogs: async () => ({ operational, cms: [cmsFromOperational(operational[0])] }),
      createCmsProduct: async (create) => {
        created.push(create.operationalProductId);
        return createdLink(create);
      },
      linkCatalogIdentities: async (link) => { linked.push(link.operationalProductId); },
      readCheckpoint: async () => checkpoint,
      writeCheckpoint: async () => undefined,
    });

    expect(result.exitCode).toBe(0);
    expect(created).toEqual(["2"]);
    expect(linked).toEqual(["1", "2"]);
  });

  it("fails closed when an apply checkpoint is malformed", async () => {
    const createCmsProduct = vi.fn();

    await expect(executeCatalogMigration({
      arguments: { mode: "apply", jsonPath: "C:\\temp\\migration.json" },
      environment: { CMS_MIGRATION_CONFIRM: "AJAZZ_CATALOG_2026" },
      loadCatalogs: async () => ({ operational: [operationalProduct(1)], cms: [] }),
      createCmsProduct,
      linkCatalogIdentities: async () => undefined,
      readCheckpoint: async () => ({ version: 99 }) as never,
      writeCheckpoint: async () => undefined,
    })).rejects.toThrow("checkpoint");

    expect(createCmsProduct).not.toHaveBeenCalled();
  });

  it("rejects a checkpoint whose CMS identity no longer belongs to the product", async () => {
    const operational = [operationalProduct(1)];
    const checkpoint: CatalogMigrationCheckpoint = {
      version: 1,
      runId: "run-existing",
      planFingerprint: (await executeCatalogMigration({
        arguments: { mode: "dry-run" },
        environment: {},
        loadCatalogs: async () => ({ operational, cms: [] }),
      })).planFingerprint,
      status: "running",
      completedOperationalProductIds: ["1"],
      linkedCmsProductIds: { "1": "cms-wrong" },
      updatedAt: "2026-08-09T00:00:00.000Z",
    };

    await expect(executeCatalogMigration({
      arguments: { mode: "apply", jsonPath: "C:\\temp\\migration.json" },
      environment: { CMS_MIGRATION_CONFIRM: "AJAZZ_CATALOG_2026" },
      loadCatalogs: async () => ({ operational, cms: [cmsFromOperational(operational[0], "cms-other")] }),
      createCmsProduct: async (create) => createdLink(create),
      linkCatalogIdentities: async () => undefined,
      readCheckpoint: async () => checkpoint,
      writeCheckpoint: async () => undefined,
    })).rejects.toThrow("checkpoint CMS linkage");
  });

  it("keeps the checkpoint compatible after completed links shrink the remaining plan", async () => {
    const initialOperational = [operationalProduct(1), operationalProduct(2)];
    const initial = await executeCatalogMigration({
      arguments: { mode: "dry-run" },
      environment: {},
      loadCatalogs: async () => ({ operational: initialOperational, cms: [] }),
    });
    const firstLinked = operationalProduct(1, { cmsProductId: "cms-1" });
    firstLinked.variants[0].cmsVariantId = "cms-variant-1-0";
    const checkpoint: CatalogMigrationCheckpoint = {
      version: 1,
      runId: "run-existing",
      planFingerprint: initial.planFingerprint,
      status: "running",
      completedOperationalProductIds: ["1"],
      linkedCmsProductIds: { "1": "cms-1" },
      updatedAt: "2026-08-09T00:00:00.000Z",
    };

    const result = await executeCatalogMigration({
      arguments: { mode: "apply", jsonPath: "C:\\temp\\migration.json" },
      environment: { CMS_MIGRATION_CONFIRM: "AJAZZ_CATALOG_2026" },
      loadCatalogs: async () => ({
        operational: [firstLinked, operationalProduct(2)],
        cms: [cmsFromOperational(firstLinked)],
      }),
      createCmsProduct: async (create) => createdLink(create),
      linkCatalogIdentities: async () => undefined,
      readCheckpoint: async () => checkpoint,
      writeCheckpoint: async () => undefined,
    });

    expect(result.exitCode).toBe(0);
    expect(result.planFingerprint).toBe(initial.planFingerprint);
  });
});
