import { describe, expect, it } from "vitest";
import { filterCatalogueProducts } from "../../lib/commerce/catalog-discovery";

const products = [
  {
    slug: "aj159",
    name: "AJ159 APEX",
    category: "mouse" as const,
    tagline: "8K Wireless Gaming Mouse",
    image: "/images/aj159.webp",
  },
  {
    slug: "ak820",
    name: "AK820 PRO",
    category: "mechanical-keyboard" as const,
    tagline: "Tri-mode 75% Keyboard",
    image: "/images/ak820.webp",
  },
];

describe("filterCatalogueProducts", () => {
  it("applies normalized keyword and category constraints without mutating products", () => {
    expect(filterCatalogueProducts(products, { query: "AJ159", category: "all" }).map((product) => product.slug)).toEqual(["aj159"]);
    expect(filterCatalogueProducts(products, { query: "", category: "mouse" }).map((product) => product.slug)).toEqual(["aj159"]);
    expect(filterCatalogueProducts(products, { query: "8k", category: "mouse" }).map((product) => product.slug)).toEqual(["aj159"]);
    expect(filterCatalogueProducts(products, { query: "headset", category: "mouse" })).toEqual([]);
    expect(filterCatalogueProducts(products, { query: "　", category: "all" })).toEqual(products);
  });
});
