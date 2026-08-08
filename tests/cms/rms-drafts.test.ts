import { describe, expect, it, vi } from "vitest";
import {
  mergeRmsSource,
  upsertRmsEditorialDraft,
  type RmsEditorialSource,
} from "../../lib/cms/rms-drafts";

function source(overrides: Partial<RmsEditorialSource> = {}): RmsEditorialSource {
  return {
    operationalProductId: 42,
    rmsManageNumber: "ak820-max",
    slug: "ak820-max",
    name: "RMS product name",
    descriptionHtml: "<p>RMS description</p>",
    category: "mechanical-keyboard",
    images: ["https://example.test/rms.jpg"],
    variants: [{
      operationalVariantId: 101,
      rmsSkuNumber: "AK820-BLACK",
      priceJpy: 19_980,
      stockQuantity: 4,
      colorName: "ブラック",
    }],
    ...overrides,
  };
}

describe("RMS editorial draft ingestion", () => {
  it("updates only the protected source snapshot and newly discovered identifiers", () => {
    const existing = {
      id: 7,
      name: "手動編集した商品名",
      slug: "custom-slug",
      lifecycle: "active",
      featured: true,
      seoTitle: "Custom SEO",
      sourceSnapshot: { name: "Old RMS" },
      variants: [{
        id: "row-1",
        sku: "AK820-BLACK",
        rmsSkuNumber: "AK820-BLACK",
        operationalVariantId: null,
        colorName: "編集済みカラー",
        salePriceJpy: 18_000,
        inventoryMode: "rms",
      }],
    };

    const merged = mergeRmsSource(existing, source());

    expect(merged).toMatchObject({
      operationalProductId: "42",
      rmsManageNumber: "ak820-max",
      sourceSnapshot: { name: "RMS product name" },
      variants: [{
        id: "row-1",
        sku: "AK820-BLACK",
        rmsSkuNumber: "AK820-BLACK",
        operationalVariantId: "101",
        colorName: "編集済みカラー",
        salePriceJpy: 18_000,
        inventoryMode: "rms",
      }],
    });
    expect(merged).not.toHaveProperty("name");
    expect(merged).not.toHaveProperty("slug");
    expect(merged).not.toHaveProperty("lifecycle");
    expect(merged).not.toHaveProperty("featured");
    expect(merged).not.toHaveProperty("seoTitle");
    expect(Date.parse(String(merged.sourceUpdatedAt))).not.toBeNaN();
  });

  it("creates one draft when no linked CMS product exists", async () => {
    const payload = {
      find: vi.fn(async (args: Record<string, unknown>) => ({
        docs: args.collection === "admins"
          ? [{ id: 1, email: "xiet@a-jazz.com", role: "administrator", collection: "admins" }]
          : [],
      })),
      create: vi.fn(async (args: Record<string, unknown>) => ({ id: 7, ...args.data as object })),
      update: vi.fn(),
    };

    await expect(upsertRmsEditorialDraft(source(), payload)).resolves.toMatchObject({
      action: "created",
      productId: "7",
    });
    expect(payload.create).toHaveBeenCalledTimes(1);
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "products",
      draft: true,
      data: expect.objectContaining({
        sourceType: "rms",
        operationalProductId: "42",
        rmsManageNumber: "ak820-max",
        name: "RMS product name",
        lifecycle: "unpublished",
        _status: "draft",
      }),
      user: expect.objectContaining({ email: "xiet@a-jazz.com" }),
    }));
    expect(payload.update).not.toHaveBeenCalled();
  });

  it("updates a linked draft without creating a duplicate or replacing editorial fields", async () => {
    const existing = {
      id: 7,
      name: "手動編集した商品名",
      slug: "custom-slug",
      sourceType: "rms",
      rmsManageNumber: "ak820-max",
      operationalProductId: "42",
      variants: [],
    };
    const payload = {
      find: vi.fn(async (args: Record<string, unknown>) => ({
        docs: args.collection === "admins"
          ? [{ id: 1, email: "xiet@a-jazz.com", role: "administrator", collection: "admins" }]
          : [existing],
      })),
      create: vi.fn(),
      update: vi.fn(async (args: Record<string, unknown>) => ({ ...existing, ...args.data as object })),
    };

    await expect(upsertRmsEditorialDraft(source(), payload)).resolves.toMatchObject({
      action: "updated",
      productId: "7",
    });
    expect(payload.create).not.toHaveBeenCalled();
    const data = payload.update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data).not.toHaveProperty("name");
    expect(data).not.toHaveProperty("slug");
    expect(data).not.toHaveProperty("lifecycle");
    expect(data).not.toHaveProperty("_status");
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      user: expect.objectContaining({ email: "xiet@a-jazz.com" }),
    }));
  });

  it("fails closed when the configured RMS import actor does not exist", async () => {
    const payload = {
      find: vi.fn(async () => ({ docs: [] })),
      create: vi.fn(),
      update: vi.fn(),
    };

    await expect(upsertRmsEditorialDraft(source(), payload)).rejects.toThrow(
      "RMS import administrator is not configured",
    );
    expect(payload.create).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
  });

  it("does not convert a linked manual CMS product into an RMS draft", async () => {
    const payload = {
      find: vi.fn(async (args: Record<string, unknown>) => ({
        docs: args.collection === "admins"
          ? [{ id: 1, email: "xiet@a-jazz.com", role: "administrator", collection: "admins" }]
          : [{ id: 7, sourceType: "manual", operationalProductId: "42", variants: [] }],
      })),
      create: vi.fn(),
      update: vi.fn(),
    };

    await expect(upsertRmsEditorialDraft(source(), payload)).rejects.toThrow(
      "RMS source conflicts with a manual CMS product",
    );
    expect(payload.update).not.toHaveBeenCalled();
  });
});
