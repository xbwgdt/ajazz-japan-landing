import type { ProductCategoryKey } from "../../lib/commerce/product-categories";
import { toStorefrontCards, type StorefrontCard as CommerceStorefrontCard } from "../../lib/commerce/storefront";
import { storefrontProducts } from "./catalogue";
import { ProductCatalogue } from "./ProductCatalogue";
import { StoreShell } from "./StoreShell";
import {
  DEFAULT_SITE_SETTINGS,
  DRIVER_LINK_PROPS,
  type SiteSettingsViewModel,
} from "../../lib/cms/site-settings";

type StorefrontCard = CommerceStorefrontCard & { category: ProductCategoryKey };

function withLineBreaks(value: string) {
  return value.split("\n").map((line, index) => <span key={`${line}-${index}`}>{index > 0 ? <br /> : null}{line}</span>);
}

function orderProducts(products: StorefrontCard[], settings: SiteSettingsViewModel): StorefrontCard[] {
  const featured = new Map(settings.homepage.featuredProductSlugs.map((slug, index) => [slug, index]));
  const categories = new Map(settings.homepage.featuredCategoryOrder.map((category, index) => [category, index]));
  return products.map((product, index) => ({ product, index })).sort((left, right) => {
    const leftFeatured = featured.get(left.product.slug) ?? Number.MAX_SAFE_INTEGER;
    const rightFeatured = featured.get(right.product.slug) ?? Number.MAX_SAFE_INTEGER;
    if (leftFeatured !== rightFeatured) return leftFeatured - rightFeatured;
    const leftCategory = categories.get(left.product.category) ?? Number.MAX_SAFE_INTEGER;
    const rightCategory = categories.get(right.product.category) ?? Number.MAX_SAFE_INTEGER;
    return leftCategory - rightCategory || left.index - right.index;
  }).map(({ product }) => product);
}

export function Storefront({
  products = toStorefrontCards(storefrontProducts),
  settings = DEFAULT_SITE_SETTINGS,
}: {
  products?: StorefrontCard[];
  settings?: SiteSettingsViewModel;
}) {
  const orderedProducts = orderProducts(products, settings);
  return (
    <StoreShell settings={settings} className="store-home">
      <section className="store-hero" aria-labelledby="hero-title">
        <div className="store-hero-media" aria-hidden="true">
          <img src={settings.homepage.heroMediaUrl} alt="" />
        </div>
        <div className="store-hero-copy">
          <p className="store-eyebrow">{settings.homepage.eyebrow}</p>
          <h1 id="hero-title">{withLineBreaks(settings.homepage.title)}</h1>
          <p className="store-hero-text">{settings.homepage.copy}</p>
          <div className="store-hero-actions">
            <a className="store-button store-button-primary" href="#products">{settings.homepage.primaryCommandLabel}</a>
            <a className="store-button store-button-quiet" {...DRIVER_LINK_PROPS}>{settings.homepage.secondaryCommandLabel}</a>
          </div>
        </div>
      </section>

      <section className="store-metrics" id="performance" aria-label="Performance metrics">
        <div><strong>0.01<span>mm</span></strong><p>調整可能な入力精度</p></div>
        <div><strong>8,000<span>Hz</span></strong><p>高応答ポーリングレート</p></div>
        <div><strong>3<span>MODE</span></strong><p>有線・2.4G・Bluetooth</p></div>
      </section>

      <section className="store-products" id="products" aria-labelledby="products-title">
        <div className="store-section-heading">
          <p className="store-eyebrow">SELECTED HARDWARE</p>
          <h2 id="products-title">PLAY WITH<br />PRECISION.</h2>
          <p>日本国内送料無料。ご注文から3営業日以内に発送します。</p>
        </div>
        <ProductCatalogue products={orderedProducts} />
      </section>

      <section className="store-service" aria-label="AJAZZ service">
        <p className="store-eyebrow">JAPAN OFFICIAL STORE</p>
        <h2>購入後も、<br />最高の入力体験を。</h2>
        <div>
          <p><b>全国送料無料</b>日本全国へ追加送料なしでお届けします。</p>
          <p><b>7日間の返品・交換</b>初期不良が確認された場合はAJAZZが送料を負担します。</p>
          <p><b>ドライバーサポート</b>モデルに合わせたソフトウェアとアップデートを案内します。</p>
        </div>
      </section>

    </StoreShell>
  );
}
