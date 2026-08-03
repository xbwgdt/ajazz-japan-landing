import { describe, expect, it } from "vitest";
import { getSellableQuantity } from "../../lib/commerce/storefront-db";
import { resolveStorefrontCards, toStorefrontCards } from "../../lib/commerce/storefront";

describe("storefront cards", () => {
  it("uses the lowest variant price and reports sell-out status", () => {
    expect(toStorefrontCards([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg", category: "mouse",
      variants: [
        { priceJpy: 19980, availableQuantity: 0, colorName: "ブラック", imageUrl: "https://example.test/black.jpg" },
        { priceJpy: 17980, availableQuantity: 2, colorName: "ホワイト", imageUrl: "https://example.test/white.jpg" },
      ],
    }])).toEqual([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg", category: "mouse",
      tagline: "¥17,980から", available: true,
      variants: [
        { priceJpy: 19980, availableQuantity: 0, colorName: "ブラック", imageUrl: "https://example.test/black.jpg" },
        { priceJpy: 17980, availableQuantity: 2, colorName: "ホワイト", imageUrl: "https://example.test/white.jpg" },
      ],
    }]);
  });

  it("normalizes an unknown category to other", () => {
    expect(toStorefrontCards([{
      slug: "unknown", name: "Unknown", image: "https://example.test/unknown.jpg", category: "unsupported-category",
      variants: [],
    }])[0].category).toBe("other");
  });
});

describe("sellable inventory", () => {
  it("excludes active reservations and never returns a negative quantity", () => {
    expect(getSellableQuantity(5, 2)).toBe(3);
    expect(getSellableQuantity(1, 2)).toBe(0);
  });
});

describe("storefront fallback consistency", () => {
  it("does not expose fallback cards when a configured database is empty", () => {
    const fallback = toStorefrontCards([{
      slug: "fallback", name: "Fallback", image: "/fallback.jpg", variants: [],
    }]);
    expect(resolveStorefrontCards([], fallback)).toEqual([]);
    expect(resolveStorefrontCards(undefined, fallback)).toEqual(fallback);
  });
});
