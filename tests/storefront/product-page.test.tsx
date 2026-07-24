import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductDetail } from "../../components/store/ProductDetail";

describe("product detail", () => {
  it("shows an available RMS product with price, image, shipping, and returns terms", () => {
    const html = renderToStaticMarkup(
      <ProductDetail
        product={{
          name: "AK820 MAX",
          descriptionHtml: "<p>Rapid trigger keyboard</p>",
          images: [
            "https://image.rakuten.co.jp/ajazz/cabinet/12437413/ak820/hero.jpg",
          ],
          variants: [
            {
              rmsSkuNumber: "AK820-BLACK",
              priceJpy: 19980,
              availableQuantity: 4,
            },
          ],
        }}
      />,
    );

    expect(html).toContain("¥19,980");
    expect(html).toContain("在庫あり");
    expect(html).toContain("全国送料無料");
    expect(html).toContain("商品到着後7日以内");
    expect(html).toContain(
      "https://image.rakuten.co.jp/ajazz/cabinet/12437413/ak820/hero.jpg",
    );
  });

  it("marks variants without available stock as unavailable", () => {
    const html = renderToStaticMarkup(
      <ProductDetail
        product={{
          name: "AK820 MAX",
          descriptionHtml: "",
          images: [],
          variants: [
            {
              rmsSkuNumber: "AK820-BLACK",
              priceJpy: 19980,
              availableQuantity: 0,
            },
          ],
        }}
      />,
    );

    expect(html).toContain("在庫切れ");
  });
});
