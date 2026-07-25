import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LegalPage from "../../app/legal/page";
import PrivacyPage from "../../app/privacy/page";
import { CartProvider } from "../../components/store/CartProvider";
import { Storefront } from "../../components/store/Storefront";

describe("Japanese storefront copy", () => {
  it("renders the official store navigation and service commitments in Japanese", () => {
    const html = renderToStaticMarkup(<CartProvider><Storefront /></CartProvider>);

    expect(html).toContain("製品を見る");
    expect(html).toContain("全国送料無料");
    expect(html).toContain("7日間の返品・交換");
    expect(html).toContain("利用規約");
  });

  it("renders readable legal notices and links to the terms page", () => {
    expect(renderToStaticMarkup(<LegalPage />)).toContain("特定商取引法に基づく表記");
    expect(renderToStaticMarkup(<PrivacyPage />)).toContain("プライバシーポリシー");
  });
});
