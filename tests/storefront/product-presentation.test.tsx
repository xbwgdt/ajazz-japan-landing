import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { productPresentation } from "../../lib/commerce/product-presentation";
import { ProductDetail } from "../../components/store/ProductDetail";
import { CartProvider } from "../../components/store/CartProvider";

describe("product presentation", () => {
  it.each([
    ["af84", "AF84", "メンブレンキーボード"],
    ["aj159apex", "AJ159 APEX", "ゲーミングマウス"],
    ["aj39pv3max", "AJ139P V3 MAX", "ゲーミングマウス"],
    ["ak6820v2", "AK680 V2", "ラピッドトリガーキーボード"],
    ["ak870v2-black", "AK870 V2", "メカニカルキーボード・有線モデル"],
    ["akp05pro", "AKP05 Pro", "ストリームコントローラー"],
    ["mousepad", "ゲーミングマウスパッド", "大型デスクマット"],
  ])("uses verified catalog identity for %s without importing title claims", (slug, title, subtitle) => {
    const copy = productPresentation("AJAZZ日本公式 国内正規品 【楽天1位】 30000DPI 最速 長い商品説明", slug);
    expect(copy.title).toBe(title);
    expect(copy.subtitle).toBe(subtitle);
    expect(JSON.stringify(copy)).not.toMatch(/楽天|30000|最速|国内正規品/);
  });

  it("keeps the existing MAX PLUS identity for both separate records", () => {
    expect(productPresentation("", "ak820max").title).toBe("AK820 MAX PLUS");
    expect(productPresentation("", "ak820maxplus").title).toBe("AK820 MAX PLUS");
  });

  it("keeps detailed features in the feature section, with concise image labels", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{ slug: "af84", name: "AF84 長い検索キーワード", images: ["/af84.jpg"], sanitizedDescriptionHtml: "<p>丸型キーキャップ</p>", variants: [] }} /></CartProvider>);
    expect(html).toContain("<h1>AF84</h1>");
    expect(html).toContain("製品の特長");
    expect(html).toContain("丸型キーキャップ");
    expect(html).not.toContain("長い検索キーワード");
  });
  it("uses a concise exact-model name without changing unknown models", () => {
    expect(productPresentation("AJAZZ日本公式 国内正規品 AK820V2 ラピッドトリガーキーボード 75%", "ak820v2-rt").title).toBe("AK820 V2 RT");
    expect(productPresentation("AK820 MAX", "ak820-max").title).toBe("AK820 MAX");
    expect(productPresentation("AK820V2", "different-model").title).toBe("AK820V2");
  });

  it("does not transfer unverified performance claims into curated copy", () => {
    const copy = productPresentation("AK820V2 0.001mmRT 0.08ms", "ak820v2-rt");
    expect(JSON.stringify(copy)).not.toMatch(/0\.001|0\.08|最速/);
  });

  it("renders concise headings and existing specifications without placeholder promises", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{ slug: "ak820v2-rt", name: "AJAZZ日本公式 国内正規品 AK820V2 ラピッドトリガーキーボード", images: [], sanitizedDescriptionHtml: "", variants: [], specifications: { keyboardLayout: "75%" } }} /></CartProvider>);
    expect(html).toContain("<h1>AK820 V2 RT</h1>");
    expect(html).toContain("75%");
    expect(html).not.toContain("詳細仕様は順次更新します");
    expect(html).toContain("製品一覧");
  });
});
