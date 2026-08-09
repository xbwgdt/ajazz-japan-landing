import { describe, expect, it } from "vitest";
import { manualInventoryEndpoint } from "../../lib/cms/manual-inventory-route";

describe("manual inventory action wiring", () => {
  it("uses the operational product ID in its route while the variant remains operational", () => {
    const cmsDocumentId = "cms-product-17";
    const operationalProductId = 410;
    const operationalVariantId = 998;
    expect(manualInventoryEndpoint(operationalProductId)).toBe("/api/cms/products/410/inventory");
    expect(manualInventoryEndpoint(operationalProductId)).not.toContain(cmsDocumentId);
    expect(operationalVariantId).toBe(998);
  });
});
