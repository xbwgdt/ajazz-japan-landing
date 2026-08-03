import { productCategoryLabel, type ProductCategoryKey } from "./product-categories";

export interface CatalogueProduct {
  name: string;
  category: ProductCategoryKey;
  tagline: string;
}

export interface CatalogueFilters {
  query: string;
  category: ProductCategoryKey | "all";
}

function normalizeSearchText(value: string) {
  return value.normalize("NFKC").trim().toLowerCase();
}

export function filterCatalogueProducts<T extends CatalogueProduct>(
  products: readonly T[],
  { query, category }: CatalogueFilters,
): T[] {
  const normalizedQuery = normalizeSearchText(query);

  return products.filter((product) => {
    if (category !== "all" && product.category !== category) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      product.name,
      product.tagline,
      product.category,
      productCategoryLabel(product.category),
    ].map(normalizeSearchText).join(" ");

    return searchableText.includes(normalizedQuery);
  });
}
