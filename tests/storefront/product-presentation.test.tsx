import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { productPresentation } from "../../lib/commerce/product-presentation";
import { ProductDetail } from "../../components/store/ProductDetail";
import { CartProvider } from "../../components/store/CartProvider";

describe("product presentation", () => {
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
