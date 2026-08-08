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
          INSERT INTO products (rms_manage_number, slug, name, description_html, category, published)
          VALUES (
            ${product.rmsManageNumber},
            ${product.slug},
            ${product.name},
            ${product.descriptionHtml},
            ${product.category},
            TRUE
          )
          ON CONFLICT (rms_manage_number) WHERE rms_manage_number IS NOT NULL DO UPDATE
          SET
            slug = EXCLUDED.slug,
            name = EXCLUDED.name,
            description_html = EXCLUDED.description_html,
            category = EXCLUDED.category,
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
            compare_at_price_jpy,
            compare_at_price_approved,
            color_name,
            image_url,
            available_quantity
          )
          VALUES (
            ${productId},
            ${variant.rmsSkuNumber},
            ${variant.priceJpy},
            ${variant.compareAtPriceJpy ?? null},
            FALSE,
            ${variant.colorName ?? null},
            ${variant.imageUrl ?? null},
            ${variant.stockQuantity}
          )
          ON CONFLICT (product_id, rms_sku_number) WHERE rms_sku_number IS NOT NULL DO UPDATE
          SET
            price_jpy = EXCLUDED.price_jpy,
            compare_at_price_jpy = EXCLUDED.compare_at_price_jpy,
            compare_at_price_approved = FALSE,
            color_name = EXCLUDED.color_name,
            image_url = EXCLUDED.image_url,
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
