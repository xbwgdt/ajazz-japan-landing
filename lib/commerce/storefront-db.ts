import { commerceSql, ensureCommerceSchema } from "./db";
import { toStorefrontCards, type StorefrontCard } from "./storefront";

export interface StorefrontDatabaseProduct {
  name: string;
  descriptionHtml: string;
  images: string[];
  variants: Array<{
    id: string;
    rmsSkuNumber: string;
    priceJpy: number;
    compareAtPriceJpy?: number;
    colorName?: string;
    imageUrl?: string;
    availableQuantity: number;
  }>;
}

export function getSellableQuantity(availableQuantity: number, reservedQuantity: number): number {
  return Math.max(0, availableQuantity - reservedQuantity);
}

export async function getStorefrontDatabaseProduct(slug: string): Promise<StorefrontDatabaseProduct | undefined> {
  await ensureCommerceSchema();
  const [product] = await commerceSql()<Array<{ id: number; name: string; description_html: string }>>`
    SELECT id, name, description_html
    FROM products
    WHERE slug = ${slug} AND published = TRUE
  `;
  if (!product) return undefined;

  const [images, variants] = await Promise.all([
    commerceSql()<Array<{ url: string }>>`
      SELECT url FROM product_images WHERE product_id = ${product.id} ORDER BY position
    `,
    commerceSql()<Array<{ id: number; rms_sku_number: string; price_jpy: number; compare_at_price_jpy: number | null; color_name: string | null; image_url: string | null; available_quantity: number; reserved_quantity: number }>>`
      SELECT id, rms_sku_number, price_jpy, compare_at_price_jpy, color_name, image_url, available_quantity, reserved_quantity
      FROM product_variants
      WHERE product_id = ${product.id}
      ORDER BY id
    `,
  ]);

  return {
    name: product.name,
    descriptionHtml: product.description_html,
    images: images.map((image) => image.url),
    variants: variants.map((variant) => ({
      id: String(variant.id),
      rmsSkuNumber: variant.rms_sku_number,
      priceJpy: Number(variant.price_jpy),
      compareAtPriceJpy: variant.compare_at_price_jpy ? Number(variant.compare_at_price_jpy) : undefined,
      colorName: variant.color_name ?? undefined,
      imageUrl: variant.image_url ?? undefined,
      availableQuantity: getSellableQuantity(Number(variant.available_quantity), Number(variant.reserved_quantity)),
    })),
  };
}

export async function listStorefrontDatabaseCards(): Promise<StorefrontCard[]> {
  await ensureCommerceSchema();
  const products = await commerceSql()<Array<{ id: number; slug: string; name: string; image: string | null }>>`
    SELECT p.id, p.slug, p.name, (
      SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1
    ) AS image
    FROM products p
    WHERE p.published = TRUE
    ORDER BY p.created_at DESC
  `;
  if (!products.length) return [];

  const variants = await commerceSql()<Array<{ product_id: number; price_jpy: number; color_name: string | null; image_url: string | null; available_quantity: number; reserved_quantity: number }>>`
    SELECT product_id, price_jpy, color_name, image_url, available_quantity, reserved_quantity
    FROM product_variants
    WHERE product_id IN ${commerceSql()(products.map((product) => product.id))}
  `;
  const variantsByProduct = new Map<number, Array<{ priceJpy: number; availableQuantity: number; colorName?: string; imageUrl?: string }>>();
  for (const variant of variants) {
    const entries = variantsByProduct.get(variant.product_id) ?? [];
    entries.push({
      priceJpy: Number(variant.price_jpy),
      availableQuantity: getSellableQuantity(Number(variant.available_quantity), Number(variant.reserved_quantity)),
      colorName: variant.color_name ?? undefined,
      imageUrl: variant.image_url ?? undefined,
    });
    variantsByProduct.set(variant.product_id, entries);
  }

  return toStorefrontCards(products.map((product) => ({
    slug: product.slug,
    name: product.name,
    image: product.image ?? "",
    variants: variantsByProduct.get(product.id) ?? [],
  })));
}
