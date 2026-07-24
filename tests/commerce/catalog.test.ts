import { describe, expect, it } from "vitest";
import { normalizeRmsImageUrl } from "../../lib/commerce/catalog";

describe("RMS catalog images", () => {
  it("prefixes a cabinet image path with the AJAZZ Rakuten CDN", () => {
    expect(normalizeRmsImageUrl("/12437413/12478105/1.jpg")).toBe(
      "https://image.rakuten.co.jp/ajazz/cabinet/12437413/12478105/1.jpg",
    );
  });
});
