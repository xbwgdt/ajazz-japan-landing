import { describe, expect, it } from "vitest";
import { getSellableQuantity } from "../../lib/commerce/storefront-db";
import { toStorefrontCards } from "../../lib/commerce/storefront";

describe("storefront cards", () => {
  it("uses the lowest variant price and reports sell-out status", () => {
    expect(toStorefrontCards([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg",
      variants: [
        { priceJpy: 19980, availableQuantity: 0, colorName: "ブラック", imageUrl: "https://example.test/black.jpg" },
        { priceJpy: 17980, availableQuantity: 2, colorName: "ホワイト", imageUrl: "https://example.test/white.jpg" },
      ],
    }])).toEqual([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg", category: "AJAZZ HARDWARE",
      tagline: "¥17,980から", available: true,
      variants: [
        { priceJpy: 19980, availableQuantity: 0, colorName: "ブラック", imageUrl: "https://example.test/black.jpg" },
        { priceJpy: 17980, availableQuantity: 2, colorName: "ホワイト", imageUrl: "https://example.test/white.jpg" },
      ],
    }]);
  });
});

describe("sellable inventory", () => {
  it("excludes active reservations and never returns a negative quantity", () => {
    expect(getSellableQuantity(5, 2)).toBe(3);
    expect(getSellableQuantity(1, 2)).toBe(0);
  });
});
