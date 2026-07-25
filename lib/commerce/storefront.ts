export interface StorefrontCardSource {
  slug: string;
  name: string;
  image: string;
  variants: Array<{ priceJpy: number; availableQuantity: number }>;
}

export interface StorefrontCard {
  slug: string;
  name: string;
  image: string;
  category: string;
  tagline: string;
  available: boolean;
}

export function toStorefrontCards(products: StorefrontCardSource[]): StorefrontCard[] {
  return products.map((product) => {
    const prices = product.variants.map((variant) => variant.priceJpy).filter((price) => price > 0);
    const price = prices.length ? Math.min(...prices) : undefined;
    return {
      slug: product.slug,
      name: product.name,
      image: product.image,
      category: "AJAZZ HARDWARE",
      tagline: price ? `¥${price.toLocaleString("ja-JP")}から` : "価格準備中",
      available: product.variants.some((variant) => variant.availableQuantity > 0),
    };
  });
}
