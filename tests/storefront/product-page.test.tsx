// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../components/store/CartProvider";
import { ProductDetail } from "../../components/store/ProductDetail";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
    expect(html).toContain('class="store-product-gallery-shell"');
    expect(html).toContain('class="store-product-purchase-summary"');
    expect(html).toContain('class="store-product-price-block"');
    expect(html).toContain('class="store-product-quantity"');
    expect(html).toContain('class="store-product-feature-band"');
    expect(html).toContain('class="store-product-specification-band"');
    expect(html).toContain('class="store-product-driver-band"');
    expect(html).toContain('class="store-product-delivery-band"');
    expect(html).toContain('class="store-product-return-band"');
    expect(html).toContain('class="store-product-active-image is-active"');
  });

  it("marks variants without available stock as unavailable", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", descriptionHtml: "", images: [],
      variants: [{ rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, availableQuantity: 0 }],
    }} /></CartProvider>);
    expect(html).toContain("在庫切れ");
  });

  it("hides unsafe comparison prices and disables unavailable variants", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", descriptionHtml: "", images: [],
      variants: [
        { id: "one", rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, compareAtPriceJpy: 19980, availableQuantity: 2 },
        { id: "two", rmsSkuNumber: "AK820-WHITE", priceJpy: 21980, compareAtPriceJpy: Number.POSITIVE_INFINITY, availableQuantity: 0 },
      ],
    }} /></CartProvider>);

    expect(html).not.toContain("通常価格");
    expect(html).toContain('aria-label="AK820-WHITEを選択" aria-pressed="false" disabled=""');
  });

  it("adds the selected quantity to the browser cart", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", descriptionHtml: "", images: [],
      variants: [{ id: "variant-1", rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, availableQuantity: 4 }],
    }} /></CartProvider>));

    const increase = container.querySelector<HTMLButtonElement>('[aria-label="数量を増やす"]');
    await act(async () => increase?.click());
    await act(async () => container.querySelector<HTMLButtonElement>(".store-add-button")?.click());

    expect(container.querySelector(".store-product-quantity output")?.textContent).toBe("2");
    expect(container.textContent).toContain("カートに追加しました");
    expect(window.localStorage.getItem("ajazz-japan-cart")).toContain('"quantity":2');

    await act(async () => root.unmount());
    container.remove();
    window.localStorage.clear();
  });

  it("uses the shared shell on the product route and keeps purchase controls touch friendly", () => {
    const route = readFileSync(resolve(process.cwd(), "app/products/[slug]/page.tsx"), "utf8");
    const css = readFileSync(resolve(process.cwd(), "app/storefront.css"), "utf8");

    expect(route).toContain("getPublishedSiteSettings");
    expect(route).toContain("Promise.all");
    expect(route).toContain('<StoreShell settings={settings} className="store-product-route">');
    expect(css).toMatch(/\.store-product-quantity button\s*\{[^}]*min-width:44px[^}]*min-height:44px/);
    expect(css).toMatch(/\.store-add-button\s*\{[^}]*min-height:(?:44|48|52|56)px/);
    expect(css).toMatch(/\.store-product-main-image\s*\{[^}]*aspect-ratio:/);
    expect(css).toMatch(/\.store-product-main-image img\s*\{[^}]*object-fit:contain/);
  });
});
