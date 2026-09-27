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
  it("switches the entire color gallery, deduplicates the main image and resets its position", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => root.render(<CartProvider><ProductDetail product={{
      name: "AF84", galleryMode: "color", isPreview: true,
      sanitizedDescriptionHtml: "", images: ["/mixed.jpg"],
      variants: [
        { rmsSkuNumber: "GREEN", colorName: "Green", priceJpy: 10000, availableQuantity: 0,
          imageUrl: "/green.jpg", galleryImages: ["/green.jpg", "/green-detail.jpg", "/green-scene.jpg"] },
        { rmsSkuNumber: "RED", colorName: "Red", priceJpy: 11000, availableQuantity: 0,
          imageUrl: "/red.jpg", galleryImages: ["/red-detail.jpg"] },
        { rmsSkuNumber: "EMPTY", colorName: "Empty", priceJpy: 11000, availableQuantity: 0 },
      ],
    }} /></CartProvider>));
    const sources = () => Array.from(container.querySelectorAll(".store-product-gallery img"), (img) => img.getAttribute("src"));
    try {
      expect(sources()).toEqual(["/green.jpg", "/green-detail.jpg", "/green-scene.jpg"]);
      await act(async () => container.querySelectorAll<HTMLButtonElement>(".store-product-gallery button")[2].click());
      await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Redを選択"]')!.click());
      expect(sources()).toEqual(["/red.jpg", "/red-detail.jpg"]);
      expect(container.querySelector(".store-product-active-image")?.getAttribute("src")).toBe("/red.jpg");
      expect(container.querySelector(".store-product-gallery button")?.getAttribute("aria-pressed")).toBe("true");
      expect(container.querySelector(".store-selected-sku")?.textContent).toContain("RED");
      expect(container.querySelector<HTMLButtonElement>(".store-add-button")?.disabled).toBe(true);
      await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Emptyを選択"]')!.click());
      expect(container.querySelector(".store-product-active-image")).toBeNull();
      expect(container.querySelector(".store-product-placeholder")).not.toBeNull();
      expect(sources()).toEqual([]);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("uses only the main image when a color has no gallery", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AF84", galleryMode: "color", sanitizedDescriptionHtml: "", images: ["/mixed.jpg"],
      variants: [{ rmsSkuNumber: "GREEN", priceJpy: 10000, availableQuantity: 0, imageUrl: "/green.jpg" }],
    }} /></CartProvider>);
    expect(html).toContain("/green.jpg");
    expect(html).not.toContain("/mixed.jpg");
  });

  it("shows an available RMS product with price, image, shipping, and returns terms", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", sanitizedDescriptionHtml: "<p>Rapid trigger keyboard</p>",
      specifications: { keyboardLayout: "75%" },
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
    expect(html).toContain("ドライバーダウンロード");
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
      name: "AK820 MAX", sanitizedDescriptionHtml: "", images: [],
      variants: [{ rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, availableQuantity: 0 }],
    }} /></CartProvider>);
    expect(html).toContain("在庫切れ");
  });

  it("hides unsafe comparison prices and allows inspecting unavailable variants", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", sanitizedDescriptionHtml: "", images: [],
      variants: [
        { id: "one", rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, compareAtPriceJpy: 19980, availableQuantity: 2 },
        { id: "two", rmsSkuNumber: "AK820-WHITE", priceJpy: 21980, compareAtPriceJpy: Number.POSITIVE_INFINITY, availableQuantity: 0 },
      ],
    }} /></CartProvider>);

    expect(html).not.toContain("通常価格");
    expect(html).toContain('aria-label="AK820-WHITEを選択" aria-pressed="false"');
    expect(html).not.toContain('aria-label="AK820-WHITEを選択" aria-pressed="false" disabled=""');
  });

  it.each([0, 5])("allows preview color changes without purchases when stock is %i", async (stock) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<CartProvider><ProductDetail product={{
      isPreview: true, name: "AJ159 APEX", sanitizedDescriptionHtml: "", images: [],
      variants: [
        { id: "orange", rmsSkuNumber: "ORANGE", colorName: "Orange", imageUrl: "/orange.jpg", priceJpy: 9980, availableQuantity: stock },
        { id: "blue", rmsSkuNumber: "BLUE", colorName: "Blue", imageUrl: "/blue.jpg", priceJpy: 9980, availableQuantity: stock },
      ],
    }} /></CartProvider>));
    try {
      const blue = container.querySelector<HTMLButtonElement>('[aria-label="Blueを選択"]')!;
      expect(blue.disabled).toBe(false);
      await act(async () => blue.click());
      expect(blue.getAttribute("aria-pressed")).toBe("true");
      expect(container.querySelector(".store-selected-sku")?.textContent).toContain("BLUE");
      expect(container.querySelector(".store-product-active-image")?.getAttribute("src")).toBe("/blue.jpg");
      expect(container.querySelector(".store-stock")?.textContent).toBe("プレビュー・購入不可");
      expect(container.querySelector<HTMLButtonElement>(".store-add-button")?.disabled).toBe(true);
      expect(container.querySelector<HTMLButtonElement>('[aria-label="数量を増やす"]')?.disabled).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("adds the selected quantity to the browser cart", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", sanitizedDescriptionHtml: "", images: [],
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

  it("clears the cart confirmation when selecting another color", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CartProvider><ProductDetail product={{
      name: "AK820 MAX", sanitizedDescriptionHtml: "", images: [],
      variants: [
        { id: "variant-black", rmsSkuNumber: "AK820-BLACK", colorName: "Black", priceJpy: 19980, availableQuantity: 4 },
        { id: "variant-white", rmsSkuNumber: "AK820-WHITE", colorName: "White", priceJpy: 20980, availableQuantity: 3 },
      ],
    }} /></CartProvider>));

    const addButton = container.querySelector<HTMLButtonElement>(".store-add-button");
    const initialLabel = addButton?.textContent;
    await act(async () => addButton?.click());
    expect(addButton?.textContent).not.toBe(initialLabel);

    const variants = container.querySelectorAll<HTMLButtonElement>(".store-variant-thumbnails button");
    await act(async () => variants[1]?.click());

    expect(container.querySelector<HTMLButtonElement>(".store-add-button")?.textContent).toBe(initialLabel);

    await act(async () => root.unmount());
    container.remove();
    window.localStorage.clear();
  });

  it("constrains fixed-width RMS description media and tables", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX",
      sanitizedDescriptionHtml: '<img src="/wide.jpg" width="1200"><video width="1200"></video><iframe width="1200"></iframe><table width="1200"><tbody><tr><td>wide</td></tr></tbody></table><p>verylongcontent</p>',
      images: [],
      variants: [{ rmsSkuNumber: "AK820-BLACK", priceJpy: 19980, availableQuantity: 1 }],
    }} /></CartProvider>);
    const css = readFileSync(resolve(process.cwd(), "app/storefront.css"), "utf8");

    expect(html).toContain('width="1200"');
    expect(css).toMatch(/\.store-product-description\s*\{[^}]*min-width:0[^}]*max-width:100%[^}]*overflow-wrap:anywhere/);
    expect(css).toMatch(/\.store-product-description\s+:is\(img,video\)\s*\{[^}]*max-width:100%[^}]*height:auto/);
    expect(css).toMatch(/\.store-product-description\s+iframe\s*\{[^}]*max-width:100%/);
    expect(css).toMatch(/\.store-product-description\s+table\s*\{[^}]*display:block[^}]*max-width:100%[^}]*overflow-x:auto/);
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
