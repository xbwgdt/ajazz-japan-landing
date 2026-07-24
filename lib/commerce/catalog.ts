import { commerceSql, ensureCommerceSchema } from "./db";

const RAKUTEN_CABINET_BASE_URL = "https://image.rakuten.co.jp/ajazz/cabinet";

export function normalizeRmsImageUrl(path: string) {
  return `${RAKUTEN_CABINET_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

export interface RmsCatalogRow {
  rmsManageNumber: string;
  rmsSkuNumber?: string;
  name?: string;
  descriptionHtml?: string;
  salePriceJpy?: number;
  stockQuantity?: number;
  imagePaths?: string[];
}

export interface RmsCatalogImportProduct {
  rmsManageNumber: string;
  slug: string;
  name: string;
  descriptionHtml: string;
  images: string[];
  variants: Array<{
    rmsSkuNumber: string;
    priceJpy: number;
    stockQuantity: number;
  }>;
}

export interface RmsCatalogWriter {
  upsertProduct(
    product: Omit<RmsCatalogImportProduct, "images" | "variants">,
  ): Promise<{ id: number }>;
  replaceImages(productId: number, images: string[]): Promise<void>;
  upsertVariant(
    productId: number,
    variant: RmsCatalogImportProduct["variants"][number],
  ): Promise<void>;
}

type RmsWorksheetRow = Record<string, unknown>;

export function parseRmsWorksheetRows(rows: RmsWorksheetRow[]): RmsCatalogRow[] {
  return rows
    .map((row): RmsCatalogRow | undefined => {
      const rmsManageNumber = getString(row["商品管理番号（商品URL）"]);

      if (!rmsManageNumber) {
        return undefined;
      }

      return {
        rmsManageNumber,
        rmsSkuNumber: getString(row.SKU管理番号),
        name: getString(row.商品名),
        descriptionHtml: getString(row.PC用商品説明文),
        salePriceJpy: getNumber(row.通常販売価格),
        stockQuantity: getNumber(row.在庫数),
        imagePaths: Array.from({ length: 20 }, (_, index) =>
          getString(row[`商品画像パス${index + 1}`]),
        ).filter((path): path is string => Boolean(path)),
      };
    })
    .filter((row): row is RmsCatalogRow => Boolean(row));
}

export function buildRmsCatalogImport(rows: RmsCatalogRow[]): RmsCatalogImportProduct[] {
  const products = new Map<
    string,
    RmsCatalogImportProduct & {
      variantMap: Map<string, RmsCatalogImportProduct["variants"][number]>;
    }
  >();

  for (const row of rows) {
    const existing = products.get(row.rmsManageNumber) ?? {
      rmsManageNumber: row.rmsManageNumber,
      slug: row.rmsManageNumber,
      name: "",
      descriptionHtml: "",
      images: [],
      variants: [],
      variantMap: new Map(),
    };

    if (row.name) {
      existing.name = row.name;
      existing.descriptionHtml = row.descriptionHtml ?? "";
      existing.images = (row.imagePaths ?? [])
        .filter(Boolean)
        .map(normalizeRmsImageUrl);
    }

    if (row.rmsSkuNumber) {
      existing.variantMap.set(row.rmsSkuNumber, {
        rmsSkuNumber: row.rmsSkuNumber,
        priceJpy: row.salePriceJpy ?? 0,
        stockQuantity: row.stockQuantity ?? 0,
      });
    }

    products.set(row.rmsManageNumber, existing);
  }

  return [...products.values()]
    .filter((product) => product.name)
    .map(({ variantMap, ...product }) => ({
      ...product,
      variants: [...variantMap.values()],
    }));
}

export async function writeRmsCatalog(
  products: RmsCatalogImportProduct[],
  writer: RmsCatalogWriter,
) {
  for (const { images, variants, ...product } of products) {
    const savedProduct = await writer.upsertProduct(product);
    await writer.replaceImages(savedProduct.id, images);

    for (const variant of variants) {
      await writer.upsertVariant(savedProduct.id, variant);
    }
  }
}

export async function upsertRmsCatalog(rows: RmsCatalogRow[]) {
  const products = buildRmsCatalogImport(rows);
  await ensureCommerceSchema();

  await commerceSql().begin(async (sql) => {
    await writeRmsCatalog(products, {
      async upsertProduct(product) {
        const [savedProduct] = await sql<{ id: number }[]>`
          INSERT INTO products (rms_manage_number, slug, name, description_html, published)
          VALUES (
            ${product.rmsManageNumber},
            ${product.slug},
            ${product.name},
            ${product.descriptionHtml},
            TRUE
          )
          ON CONFLICT (rms_manage_number) DO UPDATE
          SET
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            description_html = EXCLUDED.description_html,
            published = TRUE,
            updated_at = NOW()
          RETURNING id
        `;
        return savedProduct;
      },
      async replaceImages(productId, images) {
        await sql`DELETE FROM product_images WHERE product_id = ${productId}`;
        for (const [position, url] of images.entries()) {
          await sql`
            INSERT INTO product_images (product_id, url, position)
            VALUES (${productId}, ${url}, ${position})
          `;
        }
      },
      async upsertVariant(productId, variant) {
        await sql`
          INSERT INTO product_variants (
            product_id,
            rms_sku_number,
            price_jpy,
            available_quantity
          )
          VALUES (
            ${productId},
            ${variant.rmsSkuNumber},
            ${variant.priceJpy},
            ${variant.stockQuantity}
          )
          ON CONFLICT (product_id, rms_sku_number) DO UPDATE
          SET
            price_jpy = EXCLUDED.price_jpy,
            available_quantity = EXCLUDED.available_quantity,
            updated_at = NOW()
        `;
      },
    });
  });

  return products.length;
}

function getString(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function getNumber(value: unknown) {
  const normalized = getString(value)?.replaceAll(",", "");

  if (!normalized) {
    return undefined;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : undefined;
}
