import { normalizeProductCategory, type ProductCategoryKey } from "./product-categories";

export interface StorefrontCardSource {
  slug: string;
  name: string;
  image: string;
  category?: string;
  variants: Array<{
    priceJpy: number;
    availableQuantity: number;
    colorName?: string;
    imageUrl?: string;
  }>;
}

export interface StorefrontCard {
  slug: string;
  name: string;
  image: string;
  category: ProductCategoryKey;
  tagline: string;
  available: boolean;
  variants: StorefrontCardSource["variants"];
}

export function toStorefrontCards(products: StorefrontCardSource[]): StorefrontCard[] {
  return products.map((product) => {
    const prices = product.variants.map((variant) => variant.priceJpy).filter((price) => price > 0);
    const price = prices.length ? Math.min(...prices) : undefined;
    return {
      slug: product.slug,
      name: product.name,
      image: product.image,
      category: normalizeProductCategory(product.category),
      tagline: price ? `¥${price.toLocaleString("ja-JP")}から` : "価格準備中",
      available: product.variants.some((variant) => variant.availableQuantity > 0),
      variants: product.variants,
    };
  });
}
