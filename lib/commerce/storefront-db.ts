import { commerceSql, ensureCommerceSchema } from "./db";
import { toStorefrontCards, type StorefrontCard } from "./storefront";
import { mapCmsSpecifications, type CmsSpecificationRow, type ProductSpecifications } from "./product-specifications";

export interface StorefrontDatabaseProduct {
  name: string;
  descriptionHtml: string;
  images: string[];
  specifications?: ProductSpecifications;
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
  const [product] = await commerceSql()<Array<{ id: number; name: string; description_html: string } & CmsSpecificationRow>>`
    SELECT p.id, p.name, p.description_html,
      cp.specifications_keyboard_layout AS keyboard_layout,
      cp.specifications_size AS size,
      cp.specifications_switch_type AS switch_type,
      cp.specifications_polling_rate_hz AS polling_rate_hz,
      cp.specifications_rapid_trigger_supported AS rapid_trigger_supported,
      cp.specifications_actuation_min_mm AS actuation_min_mm,
      cp.specifications_actuation_max_mm AS actuation_max_mm,
      cp.specifications_keycap_material AS keycap_material,
      cp.specifications_mouse_sensor AS mouse_sensor,
      cp.specifications_maximum_dpi AS maximum_dpi,
      cp.specifications_weight_grams AS weight_grams,
      cp.specifications_button_count AS button_count,
      cp.specifications_driver_size_mm AS driver_size_mm,
      cp.specifications_microphone_type AS microphone_type,
      cp.specifications_stream_controller_key_count AS stream_controller_key_count,
      cp.specifications_stream_controller_display_count AS stream_controller_display_count,
      COALESCE((
        SELECT array_agg(mode.value::text ORDER BY mode."order")
        FROM cms.products_specifications_connection_modes mode
        WHERE mode.parent_id = cp.id
      ), ARRAY[]::text[]) AS connection_modes,
      COALESCE((
        SELECT array_agg(connection.value::text ORDER BY connection."order")
        FROM cms.products_specifications_headset_connection connection
        WHERE connection.parent_id = cp.id
      ), ARRAY[]::text[]) AS headset_connection,
      COALESCE((
        SELECT array_agg(application.name ORDER BY application._order)
        FROM cms.products_specifications_supported_applications application
        WHERE application._parent_id = cp.id AND application.name IS NOT NULL
      ), ARRAY[]::text[]) AS supported_applications,
      COALESCE((
        SELECT array_agg(os.value::text ORDER BY os."order")
        FROM cms._supported_os_v os
        JOIN cms._products_v version ON version.id = os.parent_id
        WHERE version.id = (
          SELECT published_version.id
          FROM cms._products_v published_version
          WHERE published_version.parent_id = cp.id
            AND published_version.version__status = 'published'
          ORDER BY published_version.version_updated_at DESC NULLS LAST, published_version.id DESC
          LIMIT 1
        )
      ), ARRAY[]::text[]) AS supported_operating_systems
    FROM products p
    LEFT JOIN cms.products cp ON cp.id::text = p.cms_product_id
    WHERE p.slug = ${slug} AND p.published = TRUE
  `;
  if (!product) return undefined;

  const [images, variants] = await Promise.all([
    commerceSql()<Array<{ url: string }>>`
      SELECT url FROM product_images WHERE product_id = ${product.id} ORDER BY position
    `,
    commerceSql()<Array<{ id: number; rms_sku_number: string; price_jpy: number; compare_at_price_jpy: number | null; color_name: string | null; image_url: string | null; available_quantity: number; reserved_quantity: number }>>`
      SELECT id, COALESCE(rms_sku_number, sku) AS rms_sku_number, price_jpy,
        CASE WHEN compare_at_price_approved THEN compare_at_price_jpy ELSE NULL END AS compare_at_price_jpy,
        color_name, image_url, available_quantity, reserved_quantity
      FROM product_variants
      WHERE product_id = ${product.id} AND active = TRUE
      ORDER BY id
    `,
  ]);

  return {
    name: product.name,
    descriptionHtml: product.description_html,
    images: images.map((image) => image.url),
    specifications: mapCmsSpecifications(product),
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
  const products = await commerceSql()<Array<{ id: number; slug: string; name: string; category: string | null; image: string | null }>>`
    SELECT p.id, p.slug, p.name, p.category, (
      SELECT url FROM product_images WHERE product_id = p.id ORDER BY position LIMIT 1
    ) AS image
    FROM products p
    WHERE p.published = TRUE
    ORDER BY p.created_at DESC
  `;
  if (!products.length) return [];

  const variants = await commerceSql()<Array<{ product_id: number; price_jpy: number; compare_at_price_jpy: number | null; color_name: string | null; image_url: string | null; available_quantity: number; reserved_quantity: number }>>`
    SELECT product_id, price_jpy,
      CASE WHEN compare_at_price_approved THEN compare_at_price_jpy ELSE NULL END AS compare_at_price_jpy,
      color_name, image_url, available_quantity, reserved_quantity
    FROM product_variants
    WHERE product_id IN ${commerceSql()(products.map((product) => product.id))}
      AND active = TRUE
  `;
  const variantsByProduct = new Map<number, Array<{ priceJpy: number; compareAtPriceJpy?: number; availableQuantity: number; colorName?: string; imageUrl?: string }>>();
  for (const variant of variants) {
    const entries = variantsByProduct.get(variant.product_id) ?? [];
    entries.push({
      priceJpy: Number(variant.price_jpy),
      compareAtPriceJpy: variant.compare_at_price_jpy === null ? undefined : Number(variant.compare_at_price_jpy),
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
    category: product.category ?? undefined,
    variants: variantsByProduct.get(product.id) ?? [],
  })));
}
