import { describe, expect, it } from "vitest";
import { toStorefrontCards } from "../../lib/commerce/storefront";

describe("storefront cards", () => {
  it("uses the lowest variant price and reports sell-out status", () => {
    expect(toStorefrontCards([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg",
      variants: [{ priceJpy: 19980, availableQuantity: 0 }, { priceJpy: 17980, availableQuantity: 2 }],
    }])).toEqual([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg", category: "AJAZZ HARDWARE",
      tagline: "¥17,980から", available: true,
    }]);
  });
});
