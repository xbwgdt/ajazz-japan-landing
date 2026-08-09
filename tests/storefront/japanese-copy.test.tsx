import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalContent } from "../../app/legal/page";
import { PrivacyContent } from "../../app/privacy/page";
import { CartProvider } from "../../components/store/CartProvider";
import { Storefront } from "../../components/store/Storefront";
import { AboutContent } from "../../app/about/page";

describe("Japanese storefront copy", () => {
  it("renders the official store navigation and service commitments in Japanese", () => {
    const html = renderToStaticMarkup(<CartProvider><Storefront /></CartProvider>);

    expect(html).toContain("製品を見る");
    expect(html).toContain("全国送料無料");
    expect(html).toContain("7日間の返品・交換");
    expect(html).toContain("利用規約");
  });

  it("renders immediate catalogue discovery controls with all categories selected by default", () => {
    const html = renderToStaticMarkup(<CartProvider><Storefront /></CartProvider>);

    expect(html).toContain("製品を検索");
    expect(html).toContain("ラピッドトリガーキーボード");
    expect(html).toContain("メカニカルキーボード");
    expect(html).toContain("メンブレンキーボード");
    expect(html).toContain("マウス");
    expect(html).toContain("ストリームコントローラー");
    expect(html).toContain("ヘッドセット");
    expect(html).toContain("その他");
    expect(html).toContain("件の製品");
    expect(html).toContain('aria-pressed="true">すべて</button>');
  });

  it("renders readable legal notices and links to the terms page", () => {
    expect(renderToStaticMarkup(<LegalContent />)).toContain("特定商取引法に基づく表記");
    expect(renderToStaticMarkup(<PrivacyContent />)).toContain("プライバシーポリシー");
  });

  it("discloses the Google Analytics collection loaded by the root layout", () => {
    const html = renderToStaticMarkup(<PrivacyContent />);
    expect(html).toContain("Google アナリティクス");
    expect(html).toContain("Cookie");
    expect(html).toContain("利用状況");
  });

  it("keeps the responsible person in the legal disclosure but not the company profile", () => {
    expect(renderToStaticMarkup(<AboutContent />)).not.toContain("代表取締役社長 謝天");
    expect(renderToStaticMarkup(<LegalContent />)).toContain("代表取締役社長 謝天");
  });

  it("presents OEM and wholesale capability inside the company page", () => {
    const html = renderToStaticMarkup(<AboutContent />);
    expect(html).toContain("AJAZZ、2009年に誕生した");
    expect(html).toContain("PC周辺機器ブランド");
    expect(html).toContain("エントリーモデルから、ラピッドトリガー対応キーボード");
    expect(html).toContain("AJAZZ日本法人による");
    expect(html).toContain("安心サポート");
    expect(html).toContain("日本人スタッフがご購入後のお問い合わせや保証相談まで丁寧にサポート");
    expect(html).toContain("初期設定や使い方の不安にも寄り添い、日本品質のサポートを提供します");
    expect(html).toContain("日本市場と世界のものづくりをつなぐ");
    expect(html).toContain("OEM製品の企画・開発");
    expect(html).toContain("法人・事業相談をメールする");
    expect(html).toContain("mailto:xiet@a-jazz.com");
  });
});
