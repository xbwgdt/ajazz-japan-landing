import { describe, expect, it } from "vitest";
import { getSellableQuantity } from "../../lib/commerce/storefront-db";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveStorefrontCards, toStorefrontCards } from "../../lib/commerce/storefront";

describe("storefront cards", () => {
  it("uses the lowest variant price and reports sell-out status", () => {
    expect(toStorefrontCards([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg", category: "mouse",
      variants: [
        { priceJpy: 19980, compareAtPriceJpy: 22980, availableQuantity: 0, colorName: "ブラック", imageUrl: "https://example.test/black.jpg" },
        { priceJpy: 17980, compareAtPriceJpy: 20980, availableQuantity: 2, colorName: "ホワイト", imageUrl: "https://example.test/white.jpg" },
        { priceJpy: 0, compareAtPriceJpy: 99999, availableQuantity: 0, colorName: "未販売" },
      ],
    }])).toEqual([{
      slug: "ak820", name: "AK820", image: "https://example.test/ak820.jpg", category: "mouse",
      tagline: "¥17,980から",
      priceJpy: 17980,
      compareAtPriceJpy: 20980,
      points: 179,
      available: true,
      variants: [
        { priceJpy: 19980, compareAtPriceJpy: 22980, availableQuantity: 0, colorName: "ブラック", imageUrl: "https://example.test/black.jpg" },
        { priceJpy: 17980, compareAtPriceJpy: 20980, availableQuantity: 2, colorName: "ホワイト", imageUrl: "https://example.test/white.jpg" },
        { priceJpy: 0, compareAtPriceJpy: 99999, availableQuantity: 0, colorName: "未販売" },
      ],
    }]);
  });

  it("keeps commerce metadata empty when there is no positive variant price", () => {
    expect(toStorefrontCards([{
      slug: "draft", name: "Draft", image: "/draft.jpg",
      variants: [{ priceJpy: 0, compareAtPriceJpy: 1000, availableQuantity: 0 }],
    }])[0]).toMatchObject({
      tagline: "価格準備中",
      priceJpy: undefined,
      compareAtPriceJpy: undefined,
      points: 0,
      available: false,
    });
  });

  it("omits an approved comparison price that is not greater than the selected sale price", () => {
    expect(toStorefrontCards([{
      slug: "invalid-comparison",
      name: "Invalid comparison",
      image: "/invalid-comparison.jpg",
      variants: [
        { priceJpy: 12000, compareAtPriceJpy: 12000, availableQuantity: 1 },
        { priceJpy: 15000, compareAtPriceJpy: 20000, availableQuantity: 1 },
      ],
    }])[0].compareAtPriceJpy).toBeUndefined();
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

  it("queries only active variants while keeping existing numeric IDs", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/commerce/storefront-db.ts"), "utf8");
    expect(source).toContain("AND active = TRUE");
    expect(source).toContain("SELECT id, COALESCE(rms_sku_number, sku) AS rms_sku_number");
    expect(source).toContain("CASE WHEN compare_at_price_approved THEN compare_at_price_jpy ELSE NULL END AS compare_at_price_jpy");
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
