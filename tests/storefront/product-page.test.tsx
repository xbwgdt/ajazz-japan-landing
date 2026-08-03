import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../components/store/CartProvider";
import { ProductDetail } from "../../components/store/ProductDetail";

describe("product detail", () => {
  it("shows an available RMS product with price, image, shipping, and returns terms", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", descriptionHtml: "<p>Rapid trigger keyboard</p>",
      images: ["https://image.rakuten.co.jp/ajazz/cabinet/12437413/ak820/hero.jpg"],
      variants: [{
        rmsSkuNumber: "AK820-BLACK",
        colorName: "ブラック",
        imageUrl: "https://image.rakuten.co.jp/ajazz/cabinet/12437413/ak820/black.jpg",
        priceJpy: 19980,
        compareAtPriceJpy: 24980,
        availableQuantity: 4,
      }],
    }} /></CartProvider>);

    expect(html).toContain("19,980");
    expect(html).toContain("在庫あり");
    expect(html).toContain("日本全国送料無料");
    expect(html).toContain("商品到着後7日以内");
    expect(html).toContain("AK820-BLACK");
    expect(html).toContain("カラー：");
    expect(html).toContain("ブラック");
    expect(html).toContain("24,980");
    expect(html).toContain("199ポイント");
    expect(html).toContain("獲得予定");
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("商品仕様");
    expect(html).toContain("ドライバー・マニュアル");
    expect(html).toContain("https://image.rakuten.co.jp/ajazz/cabinet/12437413/ak820/hero.jpg");
  });

  it("marks variants without available stock as unavailable", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", descriptionHtml: "", images: [],
      variants: [{ rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, availableQuantity: 0 }],
    }} /></CartProvider>);
    expect(html).toContain("在庫切れ");
  });
});
