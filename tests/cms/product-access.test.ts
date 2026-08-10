import type { Field } from "payload";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Media } from "../../cms/collections/Media";
import { Products, updateProductWithRevision } from "../../cms/collections/Products";
import { lockSingleProductOperation } from "../../cms/services/productConcurrency";
import { productSpecifications } from "../../cms/fields/productSpecifications";
import {
  productDraftSaveContext,
  productPublicationContext,
  productRmsSourceIngestionContext,
  protectSourceFields,
} from "../../cms/hooks/protectSourceFields";

function namedTabs(fields: Field[]): string[] {
  const tabs = fields.find((field) => field.type === "tabs");
  if (!tabs || tabs.type !== "tabs") return [];
  return tabs.tabs.map((tab) => typeof tab.label === "string"
    ? tab.label
    : "name" in tab ? tab.name : "");
}

describe("Products collection", () => {
  it("registers fixed editorial tabs and permissive drafts", () => {
    expect(Products.slug).toBe("products");
    expect(Media.slug).toBe("media");
    expect(namedTabs(Products.fields)).toEqual([
      "Basic information",
      "Media and colors",
      "Price and inventory",
      "Specifications",
      "SEO",
      "Versions",
    ]);
    expect(Products.versions).toEqual({
      drafts: {
        autosave: { interval: 1500, showSaveDraftButton: true },
        validate: false,
      },
      maxPerDoc: 50,
    });
  });

  it("requires an authenticated administrator for create, read, and update", async () => {
    for (const operation of ["create", "read", "update"] as const) {
      const access = Products.access?.[operation];
      expect(await access?.({ req: { user: null } } as never)).toBe(false);
      expect(await access?.({ req: { user: { id: 1 } } } as never)).toBe(true);
    }
  });

  it("disables direct product deletion until lifecycle services exist", async () => {
    const access = Products.access?.delete;
    expect(await access?.({ req: { user: null } } as never)).toBe(false);
    expect(await access?.({ req: { user: { id: 1 } } } as never)).toBe(false);
  });

  it("uses distinct bounded names for the supported-OS enum and relation table", () => {
    expect(productSpecifications.type).toBe("group");
    if (productSpecifications.type !== "group") return;

    const operatingSystems = productSpecifications.fields.find(
      (field) => "name" in field && field.name === "supportedOperatingSystems",
    );
    expect(operatingSystems).toMatchObject({
      dbName: "product_os",
      enumName: "supported_os",
    });
  });

  it("migrates the existing supported-OS version table without dropping its data", () => {
    const migration = readFileSync(
      join(process.cwd(), "cms/migrations/20260810_160407.ts"),
      "utf8",
    );

    expect(migration).toContain(
      'ALTER TABLE "cms"."_supported_os_v" RENAME TO "_product_os_v"',
    );
    expect(migration).not.toContain('DROP TABLE "cms"."_supported_os_v"');
  });

  it("marks the operational product linkage read-only in admin", () => {
    const tabs = Products.fields.find((field) => field.type === "tabs");
    if (!tabs || tabs.type !== "tabs") throw new Error("Products tabs are required");
    const basicInformation = tabs.tabs.find((tab) => tab.label === "Basic information");
    if (!basicInformation || !("fields" in basicInformation)) throw new Error("Basic information tab is required");
    const operationalProductId = basicInformation.fields.find(
      (field) => "name" in field && field.name === "operationalProductId",
    );

    expect(operationalProductId).toMatchObject({ admin: { readOnly: true } });
    const sourceSnapshot = basicInformation.fields.find(
      (field) => "name" in field && field.name === "sourceSnapshot",
    );
    const sourceUpdatedAt = basicInformation.fields.find(
      (field) => "name" in field && field.name === "sourceUpdatedAt",
    );
    expect(sourceSnapshot).toMatchObject({ admin: { readOnly: true, hidden: true } });
    expect(sourceUpdatedAt).toMatchObject({ admin: { readOnly: true } });
  });

  it("takes the product publication lock for every single-product edit", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const req = {
      payload: { db: { sessions: { "tx-1": { db: { execute } } } } },
      transactionID: "tx-1",
    };
    const args = { id: 7, req };

    await lockSingleProductOperation({ args, operation: "update" } as never);

    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("protectSourceFields", () => {
  it("rejects an ordinary create request that sets published status", async () => {
    await expect(protectSourceFields({
      context: {},
      data: { _status: "published", sourceType: "manual", variants: [] },
      operation: "create",
      originalDoc: {},
    } as never)).rejects.toMatchObject({
      data: { code: "product_status_transition_requires_publication_service" },
      status: 403,
    });
  });

  it("allows Payload to create a draft with its empty original document", async () => {
    const result = await protectSourceFields({
      context: {},
      data: { _status: "draft", sourceType: "manual", variants: [] },
      operation: "create",
      originalDoc: {},
    } as never);

    expect(result).toMatchObject({ _status: "draft", editorialRevision: 1 });
  });

  it("allows a draft save over a published document", async () => {
    const result = await protectSourceFields({
      context: {},
      data: { _status: "draft", name: "Draft revision" },
      operation: "update",
      req: { query: { draft: true } },
      originalDoc: {
        _status: "published",
        editorialRevision: 4,
        sourceType: "manual",
        variants: [],
      },
    } as never);

    expect(result).toMatchObject({ _status: "draft", editorialRevision: 5 });
  });

  it("rejects a main-document update that changes published status to draft", async () => {
    await expect(protectSourceFields({
      context: {},
      data: { _status: "draft" },
      operation: "update",
      req: { query: {} },
      originalDoc: {
        _status: "published",
        editorialRevision: 4,
        sourceType: "manual",
        variants: [],
      },
    } as never)).rejects.toMatchObject({
      data: { code: "product_status_transition_requires_publication_service" },
      status: 403,
    });
  });

  it("rejects an ordinary update request that changes product status", async () => {
    await expect(protectSourceFields({
      context: {},
      data: { _status: "published" },
      operation: "update",
      originalDoc: { editorialRevision: 4, sourceType: "manual", variants: [], _status: "draft" },
    } as never)).rejects.toMatchObject({
      data: { code: "product_status_transition_requires_publication_service" },
      status: 403,
    });
  });

  it("allows publication metadata updates without creating a new editorial revision", async () => {
    const result = await protectSourceFields({
      context: productPublicationContext,
      data: { _status: "published" },
      operation: "update",
      originalDoc: { editorialRevision: 4, sourceType: "manual", variants: [], _status: "draft" },
    } as never);

    expect(result).toMatchObject({ _status: "published", editorialRevision: 4 });
  });

  it("rejects an ordinary manual product update that changes operational linkage", async () => {
    await expect(protectSourceFields({
      context: {},
      data: { operationalProductId: "43" },
      operation: "update",
      originalDoc: {
        editorialRevision: 4,
        operationalProductId: "42",
        sourceType: "manual",
        variants: [],
      },
    } as never)).rejects.toMatchObject({
      data: { code: "operational_product_linkage_immutable" },
      status: 400,
    });
  });

  it("rejects a client-supplied operational linkage on product creation", async () => {
    await expect(protectSourceFields({
      context: {},
      data: {
        operationalProductId: "42",
        sourceType: "manual",
        variants: [],
      },
      operation: "create",
    } as never)).rejects.toMatchObject({
      data: { code: "operational_product_linkage_immutable" },
      status: 400,
    });
  });

  it("allows a trusted server import to create an explicit operational linkage", async () => {
    const result = await protectSourceFields({
      context: { allowSourceConversion: true },
      data: {
        operationalProductId: "42",
        sourceType: "manual",
        variants: [],
      },
      operation: "create",
    } as never);

    expect(result).toMatchObject({ editorialRevision: 1, operationalProductId: "42" });
  });

  it("allows trusted publication to link a manual product operational ID", async () => {
    const result = await protectSourceFields({
      context: productPublicationContext,
      data: { _status: "published", operationalProductId: "42" },
      operation: "update",
      originalDoc: {
        _status: "draft",
        editorialRevision: 4,
        operationalProductId: null,
        sourceType: "manual",
        variants: [],
      },
    } as never);

    expect(result).toMatchObject({ operationalProductId: "42", editorialRevision: 4 });
  });

  it("allows trusted publication to link an RMS product operational ID", async () => {
    const result = await protectSourceFields({
      context: productPublicationContext,
      data: { _status: "published", operationalProductId: "42" },
      operation: "update",
      originalDoc: {
        _status: "draft",
        editorialRevision: 4,
        operationalProductId: null,
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [{ operationalVariantId: "99", rmsSkuNumber: "AK820-B", sku: "AK820-B" }],
      },
    } as never);

    expect(result).toMatchObject({
      operationalProductId: "42",
      editorialRevision: 4,
    });
  });

  it("does not let trusted publication change an RMS management number", async () => {
    await expect(protectSourceFields({
      context: productPublicationContext,
      data: { _status: "published", operationalProductId: "42", rmsManageNumber: "other" },
      operation: "update",
      originalDoc: {
        _status: "draft",
        editorialRevision: 4,
        operationalProductId: null,
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [],
      },
    } as never)).rejects.toMatchObject({
      data: { code: "rms_source_identity_immutable" },
    });
  });

  it("does not let trusted publication change RMS variant identities", async () => {
    await expect(protectSourceFields({
      context: productPublicationContext,
      data: {
        _status: "published",
        operationalProductId: "42",
        variants: [{ operationalVariantId: "100", rmsSkuNumber: "AK820-B", sku: "AK820-B" }],
      },
      operation: "update",
      originalDoc: {
        _status: "draft",
        editorialRevision: 4,
        operationalProductId: null,
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [{ operationalVariantId: "99", rmsSkuNumber: "AK820-B", sku: "AK820-B" }],
      },
    } as never)).rejects.toMatchObject({
      data: { code: "rms_source_identity_immutable" },
    });
  });

  it("rejects changes to RMS product and variant identities", async () => {
    await expect(protectSourceFields({
      context: {},
      data: {
        rmsManageNumber: "changed",
        variants: [{ operationalVariantId: "variant-1", rmsSkuNumber: "changed" }],
      },
      operation: "update",
      originalDoc: {
        editorialRevision: 4,
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [{ operationalVariantId: "variant-1", rmsSkuNumber: "AK820-B" }],
      },
    } as never)).rejects.toMatchObject({
      data: { code: "rms_source_identity_immutable" },
      status: 400,
    });
  });

  it("rejects ordinary source snapshot changes and accepts trusted RMS ingestion", async () => {
    const originalDoc = {
      editorialRevision: 4,
      operationalProductId: "42",
      rmsManageNumber: "ak820",
      sourceSnapshot: { name: "Old RMS" },
      sourceUpdatedAt: "2026-08-08T00:00:00.000Z",
      sourceType: "rms",
      variants: [],
    };
    const data = {
      sourceSnapshot: { name: "New RMS" },
      sourceUpdatedAt: "2026-08-09T00:00:00.000Z",
    };

    await expect(protectSourceFields({
      context: {}, data, operation: "update", originalDoc,
    } as never)).rejects.toMatchObject({
      data: { code: "rms_source_identity_immutable" },
      status: 400,
    });

    await expect(protectSourceFields({
      context: productRmsSourceIngestionContext,
      data,
      operation: "update",
      originalDoc,
    } as never)).resolves.toMatchObject({
      ...data,
      editorialRevision: 5,
    });
  });

  it("rejects an RMS variant identity-set change even when product identity is unchanged", async () => {
    await expect(protectSourceFields({
      context: {},
      data: {
        variants: [{
          operationalVariantId: "variant-2",
          rmsSkuNumber: "AK820-B",
          sku: "AK820-B",
        }],
      },
      operation: "update",
      originalDoc: {
        editorialRevision: 4,
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [{
          operationalVariantId: "variant-1",
          rmsSkuNumber: "AK820-B",
          sku: "AK820-B",
        }],
      },
    } as never)).rejects.toMatchObject({
      data: { code: "rms_source_identity_immutable" },
    });
  });

  it("allows explicit source conversion, forces RMS inventory, and increments revision", async () => {
    const result = await protectSourceFields({
      context: { allowSourceConversion: true },
      data: {
        operationalProductId: "42",
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [{ rmsSkuNumber: "AK820-B", inventoryMode: "manual" }],
      },
      operation: "update",
      originalDoc: { editorialRevision: 7, sourceType: "manual", variants: [] },
    } as never);

    expect(result).toMatchObject({
      editorialRevision: 8,
      operationalProductId: "42",
      variants: [{ inventoryMode: "rms" }],
    });
  });

  it("ignores a client-supplied revision on create", async () => {
    const result = await protectSourceFields({
      context: {},
      data: { editorialRevision: 90, sourceType: "manual", variants: [] },
      operation: "create",
    } as never);

    expect(result.editorialRevision).toBe(1);
  });
});

describe("optimistic product updates", () => {
  it.each([
    ["array", []],
    ["non-plain object", new Date()],
  ])("rejects %s data without reading or updating the product", async (_label, data) => {
    const findByID = vi.fn();
    const update = vi.fn();
    const req = {
      json: vi.fn().mockResolvedValue({ data, expectedRevision: 3 }),
      payload: { findByID, update },
      routeParams: { id: "1" },
      user: { id: 1 },
    };

    const response = await updateProductWithRevision(req as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ code: "invalid_editorial_data" });
    expect(findByID).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("returns 409 without updating when the expected revision is stale", async () => {
    const update = vi.fn();
    const req = Object.assign(new Request("https://ajazz.jp/api/cms/products/1/editorial", {
      body: JSON.stringify({ data: { name: "New" }, expectedRevision: 2 }),
      method: "PATCH",
    }), {
      payload: { findByID: vi.fn().mockResolvedValue({ editorialRevision: 3 }), update },
      routeParams: { id: "1" },
      user: { id: 1 },
    });

    const response = await updateProductWithRevision(req as never);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "stale_editorial_revision",
      currentRevision: 3,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("updates a draft through access-controlled Local API calls on the same request", async () => {
    const update = vi.fn().mockResolvedValue({ id: 1, editorialRevision: 4 });
    const findByID = vi.fn().mockResolvedValue({ editorialRevision: 3 });
    const req = Object.assign(new Request("https://ajazz.jp/api/cms/products/1/editorial", {
      body: JSON.stringify({ data: { name: "New" }, expectedRevision: 3 }),
      method: "PATCH",
    }), {
      payload: { findByID, update },
      routeParams: { id: "1" },
      user: { id: 1 },
    });

    const response = await updateProductWithRevision(req as never);

    expect(response.status).toBe(200);
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({
      collection: "products",
      id: "1",
      overrideAccess: false,
      req,
    }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      collection: "products",
      context: expect.objectContaining({ expectedRevision: 3 }),
      data: { name: "New" },
      draft: true,
      id: "1",
      overrideAccess: false,
      req,
    }));
    expect(Object.getOwnPropertySymbols(update.mock.calls[0][0].context)).toEqual(
      Object.getOwnPropertySymbols(productDraftSaveContext),
    );
  });
});
