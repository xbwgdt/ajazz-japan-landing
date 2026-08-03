"use client";

import { useState } from "react";
import { filterCatalogueProducts } from "../../lib/commerce/catalog-discovery";
import { PRODUCT_CATEGORIES, type ProductCategoryKey } from "../../lib/commerce/product-categories";
import { ProductCard, type ProductCardProps } from "./ProductCard";

type ProductCatalogueCard = Omit<ProductCardProps, "index">;

export function ProductCatalogue({ products }: { products: ProductCatalogueCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategoryKey | "all">("all");
  const filtered = filterCatalogueProducts(products, { query, category });
  const hasActiveFilters = query.normalize("NFKC").trim().length > 0 || category !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return <>
    <div className="store-catalogue-controls">
      <label htmlFor="store-product-search">製品を検索</label>
      <input
        id="store-product-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div aria-label="製品カテゴリ">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>すべて</button>
        {PRODUCT_CATEGORIES.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={category === item.key}
            onClick={() => setCategory(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p aria-live="polite">{filtered.length}件の製品</p>
      {hasActiveFilters && filtered.length ? <button type="button" onClick={clearFilters}>条件をクリア</button> : null}
    </div>
    {filtered.length ? <div className="store-product-grid">
      {filtered.map((product, index) => <ProductCard {...product} index={index} key={product.slug} />)}
    </div> : <div>
      <p>条件に一致する製品がありません。</p>
      {hasActiveFilters ? <button type="button" onClick={clearFilters}>条件をクリア</button> : null}
    </div>}
  </>;
}
