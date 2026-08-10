import { normalizeProductCategory, type ProductCategoryKey } from "./product-categories";

export interface StorefrontCardSource {
  slug: string;
  name: string;
  image: string;
  category?: string;
  variants: Array<{
    priceJpy: number;
    compareAtPriceJpy?: number;
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
  priceJpy?: number;
  compareAtPriceJpy?: number;
  points: number;
  available: boolean;
  variants: StorefrontCardSource["variants"];
}

export function toStorefrontCards(products: StorefrontCardSource[]): StorefrontCard[] {
  return products.map((product) => {
    const selected = product.variants.reduce<StorefrontCardSource["variants"][number] | undefined>(
      (lowest, variant) => variant.priceJpy > 0 && (!lowest || variant.priceJpy < lowest.priceJpy) ? variant : lowest,
      undefined,
    );
    const compareAtPriceJpy = selected?.compareAtPriceJpy;
    return {
      slug: product.slug,
      name: product.name,
      image: product.image,
      category: normalizeProductCategory(product.category),
      tagline: selected ? `¥${selected.priceJpy.toLocaleString("ja-JP")}から` : "価格準備中",
      priceJpy: selected?.priceJpy,
      compareAtPriceJpy:
        selected && typeof compareAtPriceJpy === "number" && Number.isFinite(compareAtPriceJpy) && compareAtPriceJpy > selected.priceJpy
          ? compareAtPriceJpy
          : undefined,
      points: selected ? Math.floor(selected.priceJpy / 100) : 0,
      available: product.variants.some((variant) => variant.availableQuantity > 0),
      variants: product.variants,
    };
  });
}

export function resolveStorefrontCards(
  databaseCards: StorefrontCard[] | undefined,
  fallbackCards: StorefrontCard[],
) {
  return databaseCards ?? fallbackCards;
}
