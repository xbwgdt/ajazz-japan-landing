import { commerceSql, ensureCommerceSchema } from "./db";

export interface StorefrontDatabaseProduct {
  name: string;
  descriptionHtml: string;
  images: string[];
  variants: Array<{
    id: string;
    rmsSkuNumber: string;
    priceJpy: number;
    availableQuantity: number;
  }>;
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
    commerceSql()<Array<{ id: number; rms_sku_number: string; price_jpy: number; available_quantity: number }>>`
      SELECT id, rms_sku_number, price_jpy, available_quantity
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
      availableQuantity: Number(variant.available_quantity),
    })),
  };
}
