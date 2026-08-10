import { describe, expect, it, vi } from "vitest";

const { observedQueries, sqlClientMock } = vi.hoisted(() => {
  const observedQueries: Array<{ text: string; values: unknown[] }> = [];
  const transactionSql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    observedQueries.push({ text: strings.join("?"), values });
    return Promise.resolve([{ id: 42 }]);
  });
  const sqlClientMock = {
    unsafe: vi.fn(async () => undefined),
    begin: vi.fn(async (callback: (sql: typeof transactionSql) => Promise<unknown>) =>
      callback(transactionSql),
    ),
  };
  return { observedQueries, sqlClientMock };
});

vi.mock("../../lib/commerce/db", () => ({
  commerceSql: () => sqlClientMock,
  ensureCommerceSchema: vi.fn(async () => undefined),
}));

import {
  buildRmsCatalogImport,
  normalizeRmsImageUrl,
  parseRmsWorksheetRows,
  upsertRmsCatalog,
  writeRmsCatalog,
} from "../../lib/commerce/catalog";
import { classifyProductCategory, normalizeProductCategory, productCategoryLabel } from "../../lib/commerce/product-categories";

describe("product category labels", () => {
  it("uses the approved Japanese labels while accepting Japanese and legacy English category text", () => {
    expect(productCategoryLabel("rapid-trigger-keyboard")).toBe("ラピッドトリガーキーボード");
    expect(productCategoryLabel("mechanical-keyboard")).toBe("メカニカルキーボード");
    expect(productCategoryLabel("membrane-keyboard")).toBe("メンブレンキーボード");
    expect(productCategoryLabel("mouse")).toBe("マウス");
    expect(productCategoryLabel("stream-controller")).toBe("ストリームコントローラー");
    expect(productCategoryLabel("headset")).toBe("ヘッドセット");
    expect(productCategoryLabel("other")).toBe("その他");
    expect(normalizeProductCategory("ラピッドトリガーキーボード")).toBe("rapid-trigger-keyboard");
    expect(normalizeProductCategory("Rapid Trigger Keyboard")).toBe("rapid-trigger-keyboard");
  });
});

describe("product category classification", () => {
  it("classifies representative RMS products by their canonical category", () => {
    expect(classifyProductCategory({
      rmsManageNumber: "ak820-max-he",
      name: "AK820 MAX HE",
      descriptionHtml: "ラピッドトリガー対応磁気スイッチキーボード",
    })).toBe("rapid-trigger-keyboard");

    expect(classifyProductCategory({ rmsManageNumber: "aj159-apex", name: "AJ159 APEX", descriptionHtml: "8Kゲーミングマウス" })).toBe("mouse");
    expect(classifyProductCategory({ rmsManageNumber: "akp05", name: "AKP05", descriptionHtml: "ストリームコントローラー" })).toBe("stream-controller");
    expect(classifyProductCategory({ rmsManageNumber: "ah3", name: "AJAZZ AH3", descriptionHtml: "ゲーミングヘッドセット" })).toBe("headset");
    expect(classifyProductCategory({ rmsManageNumber: "ak-membrane", name: "AJAZZ Keyboard", descriptionHtml: "メンブレンキーボード" })).toBe("membrane-keyboard");
    expect(classifyProductCategory({ rmsManageNumber: "ak820-pro", name: "AK820 PRO", descriptionHtml: "75% keyboard" })).toBe("mechanical-keyboard");
    expect(classifyProductCategory({ rmsManageNumber: "ac-01", name: "USB Hub", descriptionHtml: "" })).toBe("other");
  });

  it("does not mistake incidental magnetic wording for a rapid-trigger keyboard", () => {
    expect(classifyProductCategory({
      rmsManageNumber: "308i",
      name: "AJAZZ 308I",
      descriptionHtml: "磁気猫付き メンブレンキーボード",
    })).toBe("membrane-keyboard");
  });

  it("classifies AKP stream controllers before incidental mouse copy", () => {
    expect(classifyProductCategory({
      rmsManageNumber: "akp05j",
      name: "AJAZZ AKP05J",
      descriptionHtml: "マウス操作にも対応するショートカットコントローラー",
    })).toBe("stream-controller");
  });
});

describe("RMS catalog images", () => {
  it("prefixes a cabinet image path with the AJAZZ Rakuten CDN", () => {
    expect(normalizeRmsImageUrl("/12437413/12478105/1.jpg")).toBe(
      "https://image.rakuten.co.jp/ajazz/cabinet/12437413/12478105/1.jpg",
    );
  });

  it("persists category through the production RMS product upsert SQL", async () => {
    observedQueries.length = 0;

    await upsertRmsCatalog([
      {
        rmsManageNumber: "ak820-max",
        name: "AK820 MAX",
        descriptionHtml: "75% keyboard",
      },
    ]);

    const productUpsert = observedQueries.find(({ text }) =>
      text.includes("INSERT INTO products"),
    );
    expect(productUpsert).toBeDefined();
    expect(productUpsert?.text).toContain(
      "description_html, category, lifecycle, published",
    );
    expect(productUpsert?.text).toContain("THEN EXCLUDED.category");
    expect(productUpsert?.text).toContain("ON CONFLICT (rms_manage_number) WHERE rms_manage_number IS NOT NULL");
    expect(productUpsert?.values).toContain("mechanical-keyboard");
    expect(productUpsert?.text).toContain("source_type");
    expect(productUpsert?.text).toContain("'rms'");
    expect(productUpsert?.text).toContain("source_type = 'rms'");
    expect(productUpsert?.text).toContain("'unpublished'");
    expect(productUpsert?.text).toContain("FALSE");
    const conflictUpdate = productUpsert?.text.split("DO UPDATE")[1] ?? "";
    expect(conflictUpdate).not.toContain("published = TRUE");
    expect(conflictUpdate).not.toContain("lifecycle = 'active'");
    expect(conflictUpdate).toContain("cms_product_id IS NULL");
    expect(conflictUpdate).toContain("ELSE products.name");
    expect(conflictUpdate).toContain("ELSE products.description_html");
    expect(conflictUpdate).toContain("ELSE products.category");
    expect(productUpsert?.text).toContain("editorial_managed");
  });

  it("keeps RMS variant authority and active state explicit in workbook imports", async () => {
    observedQueries.length = 0;

    await upsertRmsCatalog([
      { rmsManageNumber: "ak820-max", name: "AK820 MAX" },
      { rmsManageNumber: "ak820-max", rmsSkuNumber: "BLACK", salePriceJpy: 19_980, stockQuantity: 4 },
    ]);

    const variantUpsert = observedQueries.find(({ text }) => text.includes("INSERT INTO product_variants"));
    expect(variantUpsert?.text).toContain("inventory_mode");
    expect(variantUpsert?.text).toContain("active");
    expect(variantUpsert?.text).toContain("'rms'");
    expect(variantUpsert?.text).toContain("inventory_mode = 'rms'");
    expect(variantUpsert?.text).toContain("ELSE TRUE");
    expect(variantUpsert?.text).toContain("ELSE product_variants.color_name");
    expect(variantUpsert?.text).toContain("ELSE product_variants.image_url");
    expect(variantUpsert?.text).toContain("THEN product_variants.active");
  });

  it("reports stable operational IDs to the CMS bridge after the commerce transaction", async () => {
    const imported: unknown[] = [];

    await upsertRmsCatalog([
      { rmsManageNumber: "ak820-max", name: "AK820 MAX" },
      { rmsManageNumber: "ak820-max", rmsSkuNumber: "BLACK", salePriceJpy: 19_980, stockQuantity: 4 },
    ], {
      async afterOperationalImport(product) {
        imported.push(product);
        return { productId: "cms-7" };
      },
    });

    expect(imported).toEqual([expect.objectContaining({
      operationalProductId: 42,
      rmsManageNumber: "ak820-max",
      variants: [expect.objectContaining({ operationalVariantId: 42, rmsSkuNumber: "BLACK" })],
    })]);
    const linkage = observedQueries.find(({ text }) => text.includes("SET cms_product_id"));
    expect(linkage?.values).toContain("cms-7");
    expect(linkage?.values).toContain(42);
  });

  it("prelinks an existing CMS draft before any operational media write", async () => {
    observedQueries.length = 0;

    await upsertRmsCatalog([{
      rmsManageNumber: "ak820-max",
      name: "AK820 MAX",
      imagePaths: ["/12437413/ak820/rms.jpg"],
    }], {
      async resolveCmsProductId() {
        return "cms-7";
      },
    });

    const productUpsert = observedQueries.find(({ text }) => text.includes("INSERT INTO products"));
    expect(productUpsert?.text).toContain("cms_product_id");
    expect(productUpsert?.text).toContain("COALESCE(products.cms_product_id, EXCLUDED.cms_product_id)");
    expect(productUpsert?.values).toContain("cms-7");
    expect(observedQueries.some(({ text }) => text.includes("DELETE FROM product_images"))).toBe(false);
  });

  it("groups SKU rows under their product and keeps the latest duplicate SKU", () => {
    const catalog = buildRmsCatalogImport([
      {
        rmsManageNumber: "ak820-max",
        name: "AK820 MAX",
        descriptionHtml: "<p>Rapid trigger keyboard</p>",
        imagePaths: ["/12437413/ak820/hero.jpg", ""],
      },
      {
        rmsManageNumber: "ak820-max",
        rmsSkuNumber: "AK820-BLACK",
        salePriceJpy: 19980,
        stockQuantity: 3,
      },
      {
        rmsManageNumber: "ak820-max",
        rmsSkuNumber: "AK820-BLACK",
        salePriceJpy: 19980,
        stockQuantity: 9,
      },
      {
        rmsManageNumber: "aj159",
        name: "AJ159",
        salePriceJpy: 7980,
        imagePaths: ["/12437413/aj159/hero.jpg"],
      },
    ]);

    expect(catalog).toEqual([
      {
        rmsManageNumber: "ak820-max",
        slug: "ak820-max",
        name: "AK820 MAX",
        descriptionHtml: "<p>Rapid trigger keyboard</p>",
        category: "rapid-trigger-keyboard",
        images: ["https://image.rakuten.co.jp/ajazz/cabinet/12437413/ak820/hero.jpg"],
        variants: [
          {
            rmsSkuNumber: "AK820-BLACK",
            priceJpy: 19980,
            stockQuantity: 9,
          },
        ],
      },
      {
        rmsManageNumber: "aj159",
        slug: "aj159",
        name: "AJ159",
        descriptionHtml: "",
        category: "mouse",
        images: ["https://image.rakuten.co.jp/ajazz/cabinet/12437413/aj159/hero.jpg"],
        variants: [],
      },
    ]);
  });

  it("maps the Japanese RMS worksheet columns into catalog rows", () => {
    expect(
      parseRmsWorksheetRows([
        {
          "商品管理番号（商品URL）": "ak820-max",
          商品名: "AK820 MAX",
          PC用商品説明文: "<p>Rapid trigger keyboard</p>",
          商品画像パス1: "/12437413/ak820/hero.jpg",
          商品画像パス2: "/12437413/ak820/side.jpg",
        },
        {
          "商品管理番号（商品URL）": "ak820-max",
          SKU管理番号: "AK820-BLACK",
          通常購入販売価格: "19,980",
          表示価格: "24,980",
          在庫数: "4",
        },
      ]),
    ).toEqual([
      {
        rmsManageNumber: "ak820-max",
        name: "AK820 MAX",
        descriptionHtml: "<p>Rapid trigger keyboard</p>",
        imagePaths: [
          "/12437413/ak820/hero.jpg",
          "/12437413/ak820/side.jpg",
        ],
      },
      {
        rmsManageNumber: "ak820-max",
        rmsSkuNumber: "AK820-BLACK",
        salePriceJpy: 19980,
        displayPriceJpy: 24980,
        stockQuantity: 4,
        imagePaths: [],
      },
    ]);
  });

  it("merges dedicated color listings into the canonical multi-SKU product", () => {
    const catalog = buildRmsCatalogImport([
      { rmsManageNumber: "aj159apex", name: "AJ159 APEX", imagePaths: ["/aj159/main.jpg"] },
      { rmsManageNumber: "aj159apex", rmsSkuNumber: "SKU-ORANGE", salePriceJpy: 8980, stockQuantity: 2 },
      { rmsManageNumber: "aj159apex", rmsSkuNumber: "SKU-BLUE", salePriceJpy: 8980, stockQuantity: 3 },
      { rmsManageNumber: "aj159apex-orange", name: "AJ159 APEX Orange", imagePaths: ["/aj159/orange.jpg"] },
      { rmsManageNumber: "aj159apex-orange", rmsSkuNumber: "SKU-ORANGE", salePriceJpy: 8980, displayPriceJpy: 9980, stockQuantity: 2 },
      { rmsManageNumber: "aj159apex-blue", name: "AJ159 APEX Blue", imagePaths: ["/aj159/blue.jpg"] },
      { rmsManageNumber: "aj159apex-blue", rmsSkuNumber: "SKU-BLUE", salePriceJpy: 8980, stockQuantity: 3 },
    ]);

    expect(catalog).toHaveLength(1);
    expect(catalog[0].rmsManageNumber).toBe("aj159apex");
    expect(catalog[0].category).toBe("mouse");
    expect(catalog[0].variants).toEqual([
      {
        rmsSkuNumber: "SKU-ORANGE",
        priceJpy: 8980,
        compareAtPriceJpy: undefined,
        stockQuantity: 2,
        colorName: "オレンジ",
        imageUrl: "https://image.rakuten.co.jp/ajazz/cabinet/aj159/orange.jpg",
      },
      {
        rmsSkuNumber: "SKU-BLUE",
        priceJpy: 8980,
        compareAtPriceJpy: undefined,
        stockQuantity: 3,
        colorName: "ブルー",
        imageUrl: "https://image.rakuten.co.jp/ajazz/cabinet/aj159/blue.jpg",
      },
    ]);
  });

  it("writes each imported product, image, and variant through the catalog writer", async () => {
    const calls: string[] = [];

    await writeRmsCatalog(
      buildRmsCatalogImport([
        {
          rmsManageNumber: "ak820-max",
          name: "AK820 MAX",
          imagePaths: ["/12437413/ak820/hero.jpg"],
        },
        {
          rmsManageNumber: "ak820-max",
          rmsSkuNumber: "AK820-BLACK",
          salePriceJpy: 19980,
          stockQuantity: 4,
        },
      ]),
      {
        async upsertProduct(product) {
          calls.push(`product:${product.rmsManageNumber}:${product.category}`);
          return { id: 42 };
        },
        async replaceImages(productId, images) {
          calls.push(`images:${productId}:${images.length}`);
        },
        async upsertVariant(productId, variant, editorialManaged) {
          calls.push(`variant:${productId}:${variant.rmsSkuNumber}:${variant.stockQuantity}:${editorialManaged}`);
        },
      },
    );

    expect(calls).toEqual([
      "product:ak820-max:mechanical-keyboard",
      "images:42:1",
      "variant:42:AK820-BLACK:4:false",
    ]);
  });

  it("does not replace curated media after a product is linked to the CMS", async () => {
    const calls: string[] = [];

    await writeRmsCatalog(
      buildRmsCatalogImport([{
        rmsManageNumber: "ak820-max",
        name: "AK820 MAX",
        imagePaths: ["/12437413/ak820/rms.jpg"],
      }]),
      {
        async upsertProduct() {
          return { id: 42, editorialManaged: true };
        },
        async replaceImages() {
          calls.push("images-replaced");
        },
        async upsertVariant() {},
      },
    );

    expect(calls).toEqual([]);
  });
});
