import { describe, expect, it } from "vitest";
import {
  PRODUCT_CATEGORY_KEYS,
  validateProductDraft,
} from "../../lib/cms/product-schema";

const validManualProduct = {
  sourceType: "manual",
  name: "AK820 Web Edition",
  slug: "ak820-web-edition",
  slugIsUnique: true,
  category: "mechanical-keyboard",
  primaryImageId: "media-1",
  variants: [
    {
      sku: "WEB-1",
      colorName: "Black",
      salePriceJpy: 1000,
      inventoryMode: "manual",
      active: true,
    },
  ],
} as const;

describe("validateProductDraft", () => {
  it("requires RMS identity for an RMS-linked product", () => {
    const issues = validateProductDraft({ sourceType: "rms", variants: [] } as never);
    expect(issues).toContainEqual(expect.objectContaining({ path: "rmsManageNumber" }));
  });

  it("rejects manual inventory mode on an RMS variant", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      sourceType: "rms",
      rmsManageNumber: "ak820",
      variants: [{ ...validManualProduct.variants[0], inventoryMode: "manual" }],
    } as never);
    expect(issues).toContainEqual(expect.objectContaining({ path: "variants.0.inventoryMode" }));
  });

  it("requires evidence and approval for a comparison price", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      variants: [{ ...validManualProduct.variants[0], compareAtPriceJpy: 1500 }],
    } as never);
    expect(issues.map((issue) => issue.code)).toContain("comparison_price_unapproved");
  });

  it("accepts each of the seven canonical category keys", () => {
    expect(PRODUCT_CATEGORY_KEYS).toHaveLength(7);
    for (const category of PRODUCT_CATEGORY_KEYS) {
      const issues = validateProductDraft({ ...validManualProduct, category } as never);
      expect(issues).toEqual([]);
    }
  });

  it("requires publication fields and a unique slug", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      name: " ",
      slug: "Not a slug",
      slugIsUnique: false,
      primaryImageId: "",
    } as never);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "name", code: "required" }),
      expect.objectContaining({ path: "slug", code: "invalid_slug" }),
      expect.objectContaining({ path: "slug", code: "slug_not_unique" }),
      expect.objectContaining({ path: "primaryImageId", code: "required" }),
    ]));
  });

  it("requires publication to supply a positive slug uniqueness result", () => {
    const { slugIsUnique: _slugIsUnique, ...unverifiedProduct } = validManualProduct;
    const issues = validateProductDraft(unverifiedProduct as never);

    expect(issues).toContainEqual(expect.objectContaining({
      path: "slug",
      code: "slug_uniqueness_unverified",
    }));
  });

  it("requires one active variant with complete color, SKU, and integer yen price", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      variants: [{
        ...validManualProduct.variants[0],
        active: true,
        colorName: "",
        salePriceJpy: 999.5,
        sku: "",
      }],
    } as never);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "variants.0.sku" }),
      expect.objectContaining({ path: "variants.0.colorName" }),
      expect.objectContaining({ path: "variants.0.salePriceJpy", code: "invalid_yen_price" }),
    ]));
  });

  it("rejects duplicate SKUs case-insensitively", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      variants: [
        validManualProduct.variants[0],
        { ...validManualProduct.variants[0], sku: " web-1 " },
      ],
    } as never);

    expect(issues).toContainEqual(expect.objectContaining({
      path: "variants.1.sku",
      code: "duplicate_sku",
    }));
  });

  it("requires RMS SKU identity and RMS inventory authority", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      sourceType: "rms",
      rmsManageNumber: "ak820",
      variants: [{ ...validManualProduct.variants[0], inventoryMode: "rms" }],
    } as never);

    expect(issues).toContainEqual(expect.objectContaining({ path: "variants.0.rmsSkuNumber" }));
  });

  it("accepts a comparison price only when every evidence field is complete", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      variants: [{
        ...validManualProduct.variants[0],
        compareAtPriceJpy: 1500,
        comparisonEvidenceType: "manufacturer_price",
        comparisonEvidenceReference: "Manufacturer price list 2026-08",
        comparisonApprovedBy: "admin-1",
        comparisonApprovedAt: "2026-08-04T00:00:00.000Z",
      }],
    } as never);

    expect(issues).toEqual([]);
  });

  it("requires a comparison price to exceed the sale price", () => {
    const issues = validateProductDraft({
      ...validManualProduct,
      variants: [{
        ...validManualProduct.variants[0],
        compareAtPriceJpy: 1000,
        comparisonEvidenceType: "manufacturer_price",
        comparisonEvidenceReference: "Manufacturer price list 2026-08",
        comparisonApprovedBy: "admin-1",
        comparisonApprovedAt: "2026-08-04T00:00:00.000Z",
      }],
    } as never);

    expect(issues).toContainEqual(expect.objectContaining({
      path: "variants.0.compareAtPriceJpy",
      code: "comparison_price_not_higher",
    }));
  });

  it("rejects comparison-price approvals dated in the future", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const issues = validateProductDraft({
      ...validManualProduct,
      variants: [{
        ...validManualProduct.variants[0],
        compareAtPriceJpy: 1500,
        comparisonEvidenceType: "manufacturer_price",
        comparisonEvidenceReference: "Manufacturer price list 2026-08",
        comparisonApprovedBy: "admin-1",
        comparisonApprovedAt: future,
      }],
    } as never);

    expect(issues).toContainEqual(expect.objectContaining({
      path: "variants.0.comparisonApprovedAt",
      code: "comparison_approval_in_future",
    }));
  });
});
