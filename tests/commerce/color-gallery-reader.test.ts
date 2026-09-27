import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), ensure: vi.fn() }));
vi.mock("../../lib/commerce/db", () => ({ commerceSql: () => mocks.query, ensureCommerceSchema: mocks.ensure }));
import { getStorefrontDatabaseProduct } from "../../lib/commerce/storefront-db";

describe("published color gallery reader", () => {
  it("reads published mode and ordered variant images without changing stock", async () => {
    mocks.query.mockReset()
      .mockResolvedValueOnce([{ id: 7, name: "AF84", description_html: "", gallery_mode: "color" }])
      .mockResolvedValueOnce([{ url: "/mixed.jpg" }])
      .mockResolvedValueOnce([{ id: 42, rms_sku_number: "GREEN", price_jpy: 10000,
        color_name: "Green", image_url: "/green.jpg", gallery_images: ["/green.jpg", "/detail.jpg"],
        available_quantity: 5, reserved_quantity: 2 }]);
    const result = await getStorefrontDatabaseProduct("af84");
    expect(result).toMatchObject({ galleryMode: "color", variants: [{
      id: "42", galleryImages: ["/green.jpg", "/detail.jpg"], availableQuantity: 3,
    }] });
    const sql = mocks.query.mock.calls.map(([parts]) => parts.join("?")).join("\n");
    expect(sql).toContain("image.variant_id = variant.id");
    expect(sql).toContain("ORDER BY image.position");
  });
});
