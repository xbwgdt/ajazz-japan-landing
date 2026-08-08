import { commerceSql, ensureCommerceSchema } from "./db";
import { classifyProductCategory, type ProductCategoryKey } from "./product-categories";

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
  displayPriceJpy?: number;
  stockQuantity?: number;
  imagePaths?: string[];
}

export interface RmsCatalogImportProduct {
  rmsManageNumber: string;
  slug: string;
  name: string;
  descriptionHtml: string;
  category: ProductCategoryKey;
  images: string[];
  variants: Array<{
    rmsSkuNumber: string;
    priceJpy: number;
    compareAtPriceJpy?: number;
    stockQuantity: number;
    colorName?: string;
    imageUrl?: string;
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
  ): Promise<{ id: number } | void>;
}

export type ImportedRmsProduct = RmsCatalogImportProduct & {
  operationalProductId: number;
  variants: Array<RmsCatalogImportProduct["variants"][number] & { operationalVariantId: number }>;
};

type RmsWorksheetRow = Record<string, unknown>;

export function parseRmsWorksheetRows(rows: RmsWorksheetRow[]): RmsCatalogRow[] {
  return rows
    .map((row): RmsCatalogRow | undefined => {
      const rmsManageNumber = getString(row["商品管理番号（商品URL）"]);

      if (!rmsManageNumber) {
        return undefined;
      }

      const parsed: RmsCatalogRow = {
        rmsManageNumber,
        imagePaths: Array.from({ length: 20 }, (_, index) =>
          getString(row[`商品画像パス${index + 1}`]),
        ).filter((path): path is string => Boolean(path)),
      };
      const rmsSkuNumber = getString(row.SKU管理番号);
      const name = getString(row.商品名);
      const descriptionHtml = getString(row.PC用商品説明文);
      const salePriceJpy = getNumber(row.通常購入販売価格);
      const displayPriceJpy = getNumber(row.表示価格);
      const stockQuantity = getNumber(row.在庫数);
      if (rmsSkuNumber) parsed.rmsSkuNumber = rmsSkuNumber;
      if (name) parsed.name = name;
      if (descriptionHtml) parsed.descriptionHtml = descriptionHtml;
      if (salePriceJpy !== undefined) parsed.salePriceJpy = salePriceJpy;
      if (displayPriceJpy !== undefined) parsed.displayPriceJpy = displayPriceJpy;
      if (stockQuantity !== undefined) parsed.stockQuantity = stockQuantity;
      return parsed;
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
      category: "other",
      images: [],
      variants: [],
      variantMap: new Map(),
    };

    if (row.name) {
      existing.name = row.name;
      existing.descriptionHtml = row.descriptionHtml ?? "";
      existing.category = classifyProductCategory({
        rmsManageNumber: row.rmsManageNumber,
        name: existing.name,
        descriptionHtml: existing.descriptionHtml,
      });
      existing.images = (row.imagePaths ?? [])
        .filter(Boolean)
        .map(normalizeRmsImageUrl);
    }

    if (row.rmsSkuNumber) {
      existing.variantMap.set(row.rmsSkuNumber, {
        rmsSkuNumber: row.rmsSkuNumber,
        priceJpy: row.salePriceJpy ?? 0,
        compareAtPriceJpy: undefined,
        stockQuantity: row.stockQuantity ?? 0,
      });
    }

    products.set(row.rmsManageNumber, existing);
  }

  const rawProducts = [...products.values()]
    .filter((product) => product.name)
    .map(({ variantMap, ...product }) => ({
      ...product,
      variants: [...variantMap.values()],
    }));

  return consolidateColorListings(rawProducts);
}

function consolidateColorListings(products: RmsCatalogImportProduct[]) {
  const productIndexesBySku = new Map<string, number[]>();
  products.forEach((product, productIndex) => {
    for (const variant of product.variants) {
      const indexes = productIndexesBySku.get(variant.rmsSkuNumber) ?? [];
      indexes.push(productIndex);
      productIndexesBySku.set(variant.rmsSkuNumber, indexes);
    }
  });

  const consumed = new Set<number>();
  const consolidated: RmsCatalogImportProduct[] = [];

  products.forEach((product, startIndex) => {
    if (consumed.has(startIndex)) return;
    const component = new Set<number>([startIndex]);
    const queue = [startIndex];
    while (queue.length) {
      const currentIndex = queue.shift()!;
      for (const variant of products[currentIndex].variants) {
        for (const relatedIndex of productIndexesBySku.get(variant.rmsSkuNumber) ?? []) {
          if (!component.has(relatedIndex)) {
            component.add(relatedIndex);
            queue.push(relatedIndex);
          }
        }
      }
    }

    component.forEach((index) => consumed.add(index));
    const members = [...component].map((index) => products[index]);
    if (members.length === 1) {
      consolidated.push(product);
      return;
    }
    const canonical = [...members].sort((left, right) =>
      right.variants.length - left.variants.length
      || left.rmsManageNumber.length - right.rmsManageNumber.length
      || left.rmsManageNumber.localeCompare(right.rmsManageNumber),
    )[0];

    const variants = canonical.variants.map((variant, variantIndex) => {
      const source = [...members]
        .filter((member) => member.variants.some((candidate) => candidate.rmsSkuNumber === variant.rmsSkuNumber))
        .sort((left, right) =>
          left.variants.length - right.variants.length
          || Number(left === canonical) - Number(right === canonical)
          || right.images.length - left.images.length,
        )[0] ?? canonical;
      const sourceVariant = source.variants.find((candidate) => candidate.rmsSkuNumber === variant.rmsSkuNumber);
      return {
        ...variant,
        compareAtPriceJpy: undefined,
        colorName: inferColorName(source.rmsManageNumber, variantIndex),
        imageUrl: source.images[0] ?? canonical.images[0],
      };
    });

    consolidated.push({ ...canonical, variants });
  });

  return consolidated;
}

const colorNames: Record<string, string> = {
  black: "ブラック", white: "ホワイト", blue: "ブルー", green: "グリーン",
  red: "レッド", pink: "ピンク", orange: "オレンジ", brown: "ブラウン",
  purple: "パープル", yellow: "イエロー", gray: "グレー", grey: "グレー",
  silver: "シルバー", gold: "ゴールド", navy: "ネイビー", cyan: "シアン",
  beige: "ベージュ", bp: "ブルー・ピンク", pb: "ピンク・ブルー",
  w: "ホワイト", b: "ブラック",
};

function inferColorName(manageNumber: string, index: number) {
  const token = manageNumber.toLowerCase().split("-").filter(Boolean).at(-1) ?? "";
  return colorNames[token] ?? (token && /[a-z]/.test(token) ? token.toUpperCase() : `カラー ${index + 1}`);
}

export async function writeRmsCatalog(
  products: RmsCatalogImportProduct[],
  writer: RmsCatalogWriter,
) {
  const imported: ImportedRmsProduct[] = [];
  for (const { images, variants, ...product } of products) {
    const savedProduct = await writer.upsertProduct(product);
    await writer.replaceImages(savedProduct.id, images);

    const savedVariants: ImportedRmsProduct["variants"] = [];
    for (const variant of variants) {
      const savedVariant = await writer.upsertVariant(savedProduct.id, variant);
      if (savedVariant) savedVariants.push({ ...variant, operationalVariantId: savedVariant.id });
    }
    imported.push({ ...product, images, operationalProductId: savedProduct.id, variants: savedVariants });
  }
  return imported;
}

export async function upsertRmsCatalog(
  rows: RmsCatalogRow[],
  options: { afterOperationalImport?: (product: ImportedRmsProduct) => Promise<unknown> } = {},
) {
  const products = buildRmsCatalogImport(rows);
  await ensureCommerceSchema();

  const imported = await commerceSql().begin(async (sql) => {
    return writeRmsCatalog(products, {
      async upsertProduct(product) {
        const [savedProduct] = await sql<{ id: number }[]>`
          INSERT INTO products (
            rms_manage_number, source_type, slug, name, description_html, category, lifecycle, published
          )
          VALUES (
            ${product.rmsManageNumber},
            'rms',
            ${product.slug},
            ${product.name},
            ${product.descriptionHtml},
            ${product.category},
            'active',
            TRUE
          )
          ON CONFLICT (rms_manage_number) WHERE rms_manage_number IS NOT NULL DO UPDATE
          SET
            source_type = 'rms',
            slug = CASE
              WHEN products.cms_product_id IS NULL THEN EXCLUDED.slug
              ELSE products.slug
            END,
            name = CASE
              WHEN products.cms_product_id IS NULL THEN EXCLUDED.name
              ELSE products.name
            END,
            description_html = CASE
              WHEN products.cms_product_id IS NULL THEN EXCLUDED.description_html
              ELSE products.description_html
            END,
            category = CASE
              WHEN products.cms_product_id IS NULL THEN EXCLUDED.category
              ELSE products.category
            END,
            updated_at = NOW()
          WHERE products.source_type = 'rms'
          RETURNING id
        `;
        if (!savedProduct) {
          throw new Error(`RMS product identity conflicts with a manual product: ${product.rmsManageNumber}`);
        }
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
        const [savedVariant] = await sql<{ id: number }[]>`
          INSERT INTO product_variants (
            product_id,
            rms_sku_number,
            inventory_mode,
            price_jpy,
            compare_at_price_jpy,
            compare_at_price_approved,
            color_name,
            image_url,
            available_quantity,
            active
          )
          VALUES (
            ${productId},
            ${variant.rmsSkuNumber},
            'rms',
            ${variant.priceJpy},
            ${variant.compareAtPriceJpy ?? null},
            FALSE,
            ${variant.colorName ?? null},
            ${variant.imageUrl ?? null},
            ${variant.stockQuantity},
            TRUE
          )
          ON CONFLICT (product_id, rms_sku_number) WHERE rms_sku_number IS NOT NULL DO UPDATE
          SET
            inventory_mode = 'rms',
            price_jpy = EXCLUDED.price_jpy,
            compare_at_price_jpy = EXCLUDED.compare_at_price_jpy,
            compare_at_price_approved = FALSE,
            color_name = EXCLUDED.color_name,
            image_url = EXCLUDED.image_url,
            available_quantity = EXCLUDED.available_quantity,
            active = TRUE,
            updated_at = NOW()
          WHERE product_variants.inventory_mode = 'rms'
          RETURNING id
        `;
        if (!savedVariant) {
          throw new Error(`RMS SKU conflicts with a manual variant: ${variant.rmsSkuNumber}`);
        }
        return savedVariant;
      },
    });
  });

  for (const product of imported) {
    await options.afterOperationalImport?.(product);
  }

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
