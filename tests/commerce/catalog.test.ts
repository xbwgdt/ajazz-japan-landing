import { describe, expect, it } from "vitest";
import {
  buildRmsCatalogImport,
  normalizeRmsImageUrl,
  parseRmsWorksheetRows,
  writeRmsCatalog,
} from "../../lib/commerce/catalog";

describe("RMS catalog images", () => {
  it("prefixes a cabinet image path with the AJAZZ Rakuten CDN", () => {
    expect(normalizeRmsImageUrl("/12437413/12478105/1.jpg")).toBe(
      "https://image.rakuten.co.jp/ajazz/cabinet/12437413/12478105/1.jpg",
    );
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
          通常販売価格: "19,980",
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
        stockQuantity: 4,
        imagePaths: [],
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
          calls.push(`product:${product.rmsManageNumber}`);
          return { id: 42 };
        },
        async replaceImages(productId, images) {
          calls.push(`images:${productId}:${images.length}`);
        },
        async upsertVariant(productId, variant) {
          calls.push(`variant:${productId}:${variant.rmsSkuNumber}:${variant.stockQuantity}`);
        },
      },
    );

    expect(calls).toEqual([
      "product:ak820-max",
      "images:42:1",
      "variant:42:AK820-BLACK:4",
    ]);
  });
});
