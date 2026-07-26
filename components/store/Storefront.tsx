import Link from "next/link";
import { storefrontProducts } from "./catalogue";
import { CartLink } from "./CartLink";

interface StorefrontCard {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  image: string;
}

export function Storefront({ products = storefrontProducts }: { products?: StorefrontCard[] }) {
  return (
    <main className="storefront">
      <header className="store-nav">
        <Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home">
          <img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" />
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#products">製品</a>
          <a href="#performance">テクノロジー</a>
          <Link href="/drivers">ドライバー</Link>
          <Link href="/about">ブランド</Link>
        </nav>
        <CartLink />
      </header>

      <section className="store-hero" aria-labelledby="hero-title">
        <div className="store-hero-copy">
          <p className="store-eyebrow">AJAZZ PERFORMANCE EDITION</p>
          <h1 id="hero-title">INPUT AT<br />THE SPEED OF INTENT.</h1>
          <p className="store-hero-text">
            ラピッドトリガーから高性能ワイヤレスまで。勝負を分ける一打のために設計されたAJAZZの入力デバイス。
          </p>
          <div className="store-hero-actions">
            <a className="store-button store-button-primary" href="#products">製品を見る</a>
            <Link className="store-button store-button-quiet" href="/drivers">ドライバーを探す</Link>
          </div>
        </div>
        <div className="store-hero-image" aria-hidden="true">
          <img src="/images/ak820maxultra.webp" alt="" />
          <span className="store-hero-spec spec-one">0.01 mm</span>
          <span className="store-hero-spec spec-two">8K READY</span>
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
        <div className="store-product-grid">
          {products.map((product, index) => (
            <Link className="store-card" href={`/products/${product.slug}`} key={product.slug}>
              <div className="store-card-image">
                <img src={product.image} alt={product.name} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="store-card-meta">
                <p>{product.category}</p>
                <h3>{product.name}</h3>
                <span>{product.tagline}</span>
              </div>
            </Link>
          ))}
        </div>
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

      <footer className="store-footer">
        <img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" />
        <p>アジャズジャパン株式会社<br />〒340-0043 埼玉県草加市草加2-13-21-7</p>
        <div><Link href="/drivers">ドライバー</Link></div>
        <div className="store-footer-legal"><Link href="/legal">特定商取引法に基づく表記</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/terms">利用規約</Link></div>
      </footer>
    </main>
  );
}
