import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutContent } from "../../app/about/page";
import { LegalContent } from "../../app/legal/page";
import { PrivacyContent } from "../../app/privacy/page";
import { TermsContent } from "../../app/terms/page";
import { CartProvider } from "../../components/store/CartProvider";
import { StoreFooter } from "../../components/store/StoreFooter";
import { Storefront } from "../../components/store/Storefront";
import { normalizeSiteSettings } from "../../lib/cms/site-settings";

const settings = normalizeSiteSettings({
  homepage: {
    eyebrow: "AJAZZ TEST EDITION",
    title: "CUSTOM\nPERFORMANCE.",
    copy: "CMSから公開されたトップページ本文です。",
    primaryCommandLabel: "商品を見る",
    secondaryCommandLabel: "公式ドライバー",
    heroMediaId: { url: "https://cdn.example.com/hero.webp" },
    featuredCategoryOrder: [{ category: "mouse" }, { category: "rapid-trigger-keyboard" }],
    featuredProducts: [{ slug: "featured-mouse" }],
  },
  company: {
    brand: { eyebrow: "BRAND EDIT", title: "編集済みブランド", paragraphs: [{ text: "ブランド本文" }] },
    support: { eyebrow: "SUPPORT EDIT", title: "編集済みサポート", paragraphs: [{ text: "サポート本文" }] },
    business: {
      eyebrow: "BUSINESS EDIT",
      title: "編集済み法人対応",
      paragraphs: [{ text: "法人本文" }],
      commandLabel: "法人相談を送る",
    },
  },
  contact: { email: "support@a-jazz.com", phone: "048-000-0000" },
  footer: {
    companyName: "AJAZZ JAPAN TEST",
    address: "埼玉県テスト住所",
    navigation: [{ label: "会社案内", href: "/about" }],
  },
  socialLinks: [{ label: "AJAZZ X", href: "https://x.com/ajazz" }],
  legal: {
    sellerName: "AJAZZ JAPAN TEST",
    responsiblePerson: "運営責任者 テスト",
    address: "埼玉県テスト住所",
    phone: "048-000-0000",
    email: "support@a-jazz.com",
  },
});

describe("published site settings rendering", () => {
  const renderWithCart = (content: React.ReactNode) => renderToStaticMarkup(<CartProvider>{content}</CartProvider>);
  it("edits homepage content and ordering without replacing the storefront template", () => {
    const html = renderToStaticMarkup(<CartProvider><Storefront settings={settings} products={[
      { slug: "keyboard", name: "Keyboard", category: "rapid-trigger-keyboard", tagline: "K", image: "/k.webp", points: 0, available: false, variants: [] },
      { slug: "featured-mouse", name: "Featured Mouse", category: "mouse", tagline: "M", image: "/m.webp", points: 0, available: false, variants: [] },
    ]} /></CartProvider>);

    expect(html).toContain("AJAZZ TEST EDITION");
    expect(html).toContain("<span>CUSTOM</span><span><br/>PERFORMANCE.</span>");
    expect(html).toContain("CMSから公開されたトップページ本文です。");
    expect(html).toContain('src="https://cdn.example.com/hero.webp"');
    expect(html.indexOf("Featured Mouse")).toBeLessThan(html.indexOf("Keyboard"));
    expect(html).toContain("AJAZZ JAPAN TEST");
    expect(html).toContain("埼玉県テスト住所");
    expect(html).toContain('href="/about">会社案内</a>');
    expect(html).toContain('href="https://x.com/ajazz"');
    expect(html).toContain('class="store-hero"');
  });

  it("renders published company, navigation, and social data through the shared footer", () => {
    const html = renderToStaticMarkup(<StoreFooter settings={settings} />);

    expect(html).toContain("AJAZZ JAPAN TEST");
    expect(html).toContain("埼玉県テスト住所");
    expect(html).toContain('href="/about">会社案内</a>');
    expect(html).toContain('href="https://x.com/ajazz"');
  });

  it("renders all three approved company sections and the protected company table", () => {
    const html = renderWithCart(<AboutContent settings={settings} />);

    expect(html).toContain("編集済みブランド");
    expect(html).toContain("編集済みサポート");
    expect(html).toContain("編集済み法人対応");
    expect(html).toContain("mailto:support@a-jazz.com");
    expect(html).toContain("AJAZZ JAPAN TEST");
    expect(html).toContain('href="https://x.com/ajazz"');
    expect(html).not.toContain("代表者");
  });

  it("keeps legal labels in code while using published legal values", () => {
    const html = renderWithCart(<LegalContent settings={settings} />);

    expect(html).toContain("販売業者");
    expect(html).toContain("運営責任者");
    expect(html).toContain("AJAZZ JAPAN TEST");
    expect(html).toContain("運営責任者 テスト");
  });

  it("uses the published contact destination in privacy and terms templates", () => {
    expect(renderWithCart(<PrivacyContent settings={settings} />)).toContain("support@a-jazz.com");
    expect(renderWithCart(<TermsContent settings={settings} />)).toContain("support@a-jazz.com");
  });
});
