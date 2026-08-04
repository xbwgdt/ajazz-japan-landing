import type { Field } from "payload";
import { describe, expect, it, vi } from "vitest";
import { Media } from "../../cms/collections/Media";
import { Products, updateProductWithRevision } from "../../cms/collections/Products";
import { productSpecifications } from "../../cms/fields/productSpecifications";
import { protectSourceFields } from "../../cms/hooks/protectSourceFields";

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

  it("requires an authenticated administrator for every operation", async () => {
    for (const access of Object.values(Products.access ?? {})) {
      expect(await access?.({ req: { user: null } } as never)).toBe(false);
      expect(await access?.({ req: { user: { id: 1 } } } as never)).toBe(true);
    }
  });

  it("uses a bounded database name for versioned specification enums", () => {
    expect(productSpecifications.type).toBe("group");
    if (productSpecifications.type !== "group") return;

    const operatingSystems = productSpecifications.fields.find(
      (field) => "name" in field && field.name === "supportedOperatingSystems",
    );
    expect(operatingSystems).toMatchObject({ dbName: "supported_os" });
  });
});

describe("protectSourceFields", () => {
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
        rmsManageNumber: "ak820",
        sourceType: "rms",
        variants: [{ rmsSkuNumber: "AK820-B", inventoryMode: "manual" }],
      },
      operation: "update",
      originalDoc: { editorialRevision: 7, sourceType: "manual", variants: [] },
    } as never);

    expect(result).toMatchObject({
      editorialRevision: 8,
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
      context: { expectedRevision: 3 },
      data: { name: "New" },
      draft: true,
      id: "1",
      overrideAccess: false,
      req,
    }));
  });
});
