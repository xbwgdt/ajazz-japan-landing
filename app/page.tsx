'use client';

import { useState } from 'react';
import './globals.css';

const DRIVER_BASE = 'https://www.a-jazz.com/en/search.jsp?id=422&q=a';
const AMAZON_STORE = 'https://www.amazon.co.jp/b?node=26286483051&me=A2M27Q6LMJP4TA';

const faqItems = [
  {
    q: 'ドライバーはどこからダウンロードできますか？',
    a: 'ページ下部の「ドライバー・ダウンロード」セクションから該当する方法をお選びください。HUB Web版（推奨）、Web版ドライバー、PC版ドライバーの3種類があります。型番が不明な場合は「ドライバー検索」から製品底面の型番を入力して検索できます。'
  },
  {
    q: 'HUB Web版とPC版の違いは？',
    a: 'HUB Web版はブラウザ（Chrome / Edge / Opera）上で動作し、インストール不要で手軽に設定できます。設定完了後はソフトを常駐させる必要がありません。PC版はZIPファイルをダウンロードして実行する従来型のドライバーで、より詳細な設定が可能なモデルもあります。'
  },
  {
    q: '保証期間はどのくらいですか？',
    a: '製品は購入日から1年間の製造不良保証が付いています。保証期間内に製造上の不具合が発生した場合は、カスタマーサポート（support@ajazz.jp）までご連絡ください。'
  },
  {
    q: '返品・交換はできますか？',
    a: '商品到着後8日以内であれば、初期不良・配送中の破損などによる返品・交換を受け付けております。お手数ですが、購入された楽天市場の各商品ページまたはカスタマーサポートまでお問い合わせください。'
  },
  {
    q: '配送料はかかりますか？',
    a: '日本全国送料無料でお届けしています。離島・一部地域でも追加料金はかかりません。'
  },
  {
    q: '製品の型番はどこで確認できますか？',
    a: '型番は製品底面のラベルに記載されています。ドライバーのダウンロードや製品サポートを受ける際に必要になりますので、ご確認の上保管をお願いいたします。'
  }
];

interface Product {
  id: string;
  name: string;
  nameJa: string;
  desc: string;
  descJa: string;
  price: string;
  url: string;
  image: string;
  tag: string;
}

const products: Product[] = [
  {
    id: 'af84',
    name: 'AJAZZ AF84',
    nameJa: 'タイプライターキーボード',
    desc: '84 キー 2 モード接続 ワイヤレス/Bluetooth',
    descJa: '84 キー 2 モード接続、かわいいタイプライター風 丸型キーキャップ',
    price: '¥4,590〜',
    url: 'https://item.rakuten.co.jp/ajazz/af84/',
    image: '/images/af84.webp',
    tag: '🏆 ランキング1位'
  },
  {
    id: '308i',
    name: 'AJAZZ 308I',
    nameJa: '静音メンブレンキーボード',
    desc: '84 キー Bluetooth 磁気猫付き',
    descJa: '84 キー Bluetooth、かわいいタイプライター風 丸型キーキャップ 磁気猫付き',
    price: '¥3,260',
    url: 'https://item.rakuten.co.jp/ajazz/308i/',
    image: '/images/308i.webp',
    tag: '🥈 ランキング2位'
  },
  {
    id: 'ak820-3',
    name: 'AJAZZ AK820-3',
    nameJa: 'メカニカルキーボード 新型',
    desc: '75% ガスケットマウント 3 モード',
    descJa: '75% ガスケットマウント、Bluetooth 5.1/2.4G/Type-C 3 モード',
    price: '¥9,980',
    url: 'https://item.rakuten.co.jp/ajazz/ak820-3/',
    image: '/images/ak820-3.webp',
    tag: 'New'
  },
  {
    id: 'n1',
    name: 'AJAZZ N1',
    nameJa: 'ストリームコントローラー',
    desc: 'カスタマイズ可能なストリームコントロール',
    descJa: 'カスタマイズ可能なストリームコントロールデッキ、ストリーマー向け',
    price: '¥9,500',
    url: 'https://item.rakuten.co.jp/ajazz/n1/',
    image: '/images/n1.webp',
    tag: '🆕 New'
  },
  {
    id: 'aj179apex',
    name: 'AJAZZ AJ179 APEX',
    nameJa: 'ゲーミングマウス',
    desc: '2.4G/BT/有線 3モード OLED',
    descJa: '2.4Ghz/BT/有線 3モード接続 軽量ゲーミングマウス OLEDディスプレイ',
    price: '¥7,980',
    url: 'https://item.rakuten.co.jp/ajazz/aj179apex/',
    image: '/images/aj179apex.webp',
    tag: '🔥 人気'
  },
  {
    id: 'ak029',
    name: 'AJAZZ AK029',
    nameJa: '猫鍵盤',
    desc: '29 キー配置の片手ゲーミングキーボード',
    descJa: '29 キー配置の片手ゲーミングキーボード、超低遅延、かわいい透明猫ちゃんキーキャップ',
    price: '¥7,980',
    url: 'https://item.rakuten.co.jp/ajazz/ak029-mt/',
    image: '/images/ak029.webp',
    tag: '猫鍵盤'
  },
  {
    id: 'mk87',
    name: 'AJAZZ MK87',
    nameJa: 'メカニカルキーボード',
    desc: '87 キーメカニカルゲーミングキーボード',
    descJa: '87 キーメカニカルゲーミングキーボード、テンキーレス、RGB バックライト',
    price: '¥8,980',
    url: 'https://item.rakuten.co.jp/ajazz/mk87/?variantId=6976412987090',
    image: '/images/mk87.webp',
    tag: 'New'
  },
  {
    id: 'akp05pro',
    name: 'AJAZZ AKP05 Pro',
    nameJa: 'ストリームコントローラー',
    desc: '10LCD キー +4 ノブ&スイッチボタン',
    descJa: '10LCD キー +4 ノブ&スイッチボタン + 副タッチパネル、OBS/Twitch/YouTube 対応',
    price: '¥12,980',
    url: 'https://item.rakuten.co.jp/ajazz/akp05pro/',
    image: '/images/akp05pro.webp',
    tag: 'Pro'
  },
  {
    id: 'ak820pro',
    name: 'AJAZZ AK820 Pro',
    nameJa: 'TFT スクリーン搭載',
    desc: '75% ガスケットマウント TFT スクリーン',
    descJa: '75% ガスケットマウント、TFT スクリーン搭載、リアルタイム情報表示',
    price: '¥11,980',
    url: 'https://item.rakuten.co.jp/ajazz/ak820pro/',
    image: '/images/ak820pro.webp',
    tag: 'TFT'
  },
  {
    id: 'ak820max',
    name: 'AJAZZ AK820 Max',
    nameJa: '磁気スイッチ搭載',
    desc: '75% ガスケットマウント 磁気スイッチ',
    descJa: '75% ガスケットマウント、磁気スイッチ搭載、超高速応答',
    price: '¥13,980',
    url: 'https://item.rakuten.co.jp/ajazz/ak820max/',
    image: '/images/ak820max.webp',
    tag: 'Magnetic'
  },
  {
    id: 'ak820maxultra',
    name: 'AJAZZ AK820 Max Ultra',
    nameJa: 'フラッグシップモデル',
    desc: '75% ガスケットマウント 最高峰モデル',
    descJa: '75% ガスケットマウント、最高峰モデル、プロゲーマー仕様',
    price: '¥15,980',
    url: 'https://item.rakuten.co.jp/ajazz/ak820maxultra/',
    image: '/images/ak820maxultra.webp',
    tag: 'Flagship'
  },
  {
    id: 'akp815',
    name: 'AJAZZ AKP815',
    nameJa: 'ストリームコントローラー 新型',
    desc: 'LCD キー + ノブ&スイッチボタン',
    descJa: 'LCD キー + ノブ&スイッチボタン、OBS/Twitch/YouTube/Photoshop 対応',
    price: '¥10,980',
    url: 'https://item.rakuten.co.jp/ajazz/akp815/',
    image: '/images/akp815.webp',
    tag: 'Stream'
  }
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://ajazz-japan-landing.vercel.app/#organization',
      name: 'AJAZZ Japan',
      url: 'https://ajazz-japan-landing.vercel.app/',
      logo: 'https://ajazz-japan-landing.vercel.app/images/ak029.webp',
      sameAs: [
        'https://item.rakuten.co.jp/ajazz',
        'https://www.youtube.com/@AJAZZJAPAN',
        'https://www.instagram.com/ajazzjp/',
        'https://x.com/AjazzJapan'
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@ajazz.jp',
        contactType: 'customer service'
      }
    },
    {
      '@type': 'WebSite',
      '@id': 'https://ajazz-japan-landing.vercel.app/#website',
      url: 'https://ajazz-japan-landing.vercel.app/',
      name: 'AJAZZ 日本公式',
      description: 'プロゲーマーも愛用する、高性能キーボード＆マウス。楽天公式ストアで販売中。',
      publisher: { '@id': 'https://ajazz-japan-landing.vercel.app/#organization' },
      inLanguage: 'ja'
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://ajazz-japan-landing.vercel.app/#faq',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a
        }
      }))
    },
    ...products.map((p) => ({
      '@type': 'Product',
      name: p.name,
      description: p.descJa,
      image: `https://ajazz-japan-landing.vercel.app${p.image}`,
      offers: {
        '@type': 'Offer',
        price: p.price.replace(/[¥,]/g, ''),
        priceCurrency: 'JPY',
        url: p.url,
        availability: 'https://schema.org/InStock'
      }
    }))
  ]
};

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="main">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Sticky Navigation */}
      <header className="site-nav" id="top">
        <div className="nav-inner">
          <a href="#top" className="nav-brand">AJAZZ <span>Japan</span></a>
          <button
            className={`hamburger ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="メニューを開く"
            aria-expanded={mobileOpen}
          >
            <span /><span /><span />
          </button>
          <nav className={`nav-links ${mobileOpen ? 'nav-open' : ''}`}>
            <a href="#products" onClick={() => setMobileOpen(false)}>製品一覧</a>
            <a href="#driver" onClick={() => setMobileOpen(false)}>ドライバー</a>
            <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
            <a href="/survey" onClick={() => setMobileOpen(false)}>アンケート</a>
            <a href="mailto:support@ajazz.jp">お問い合わせ</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="hero-content">
          <h1 className="hero-title">ゲーミングギアの新基準</h1>
          <p className="hero-subtitle">AJAZZ 日本公式サイト</p>
          <p className="hero-desc">プロゲーマーも愛用する、高性能キーボード＆マウス — 楽天公式ストアで販売中</p>
          <div className="hero-actions">
            <a href="#products" className="cta-button">製品を見る</a>
            <a href="/survey" className="survey-cta-button">アンケートに回答</a>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="products">
        <h2 className="section-title">製品一覧</h2>
        <div className="product-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              {product.tag && <span className="product-tag">{product.tag}</span>}
              <div className="product-image">
                <img
                  src={product.image}
                  alt={product.name}
                  className="product-img"
                  loading="lazy"
                  width={800}
                  height={800}
                />
              </div>
              <div className="product-info">
                <h3 className="product-name">{product.nameJa}</h3>
                <p className="product-desc">{product.descJa}</p>
                <p className="product-price">{product.price}</p>
                <div className="product-actions">
                  <a href={product.url} target="_blank" rel="noopener noreferrer" className="buy-button">
                    楽天で購入
                  </a>
                  <a
                    href={`${AMAZON_STORE}&utm_content=${product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="amazon-button"
                  >
                    Amazonで購入
                  </a>
                  <a
                    href={DRIVER_BASE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="driver-button"
                  >
                    ドライバー
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2 className="section-title">AJAZZ の特徴</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🚚</div>
            <h3>送料無料</h3>
            <p>日本全国送料無料</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>1 年間保証</h3>
            <p>製造不良は 1 年間保証</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h3>カスタマーサポート</h3>
            <p>3 営業日以内に返信</p>
          </div>
        </div>
      </section>

      <section className="research-promo">
        <div>
          <p>AJAZZ PRODUCT RESEARCH · 2026</p>
          <h2>次のデバイスを、<br />あなたとつくる。</h2>
        </div>
        <div>
          <p>キーボードとマウスに関する10問・約3分の記名式アンケートです。</p>
          <a href="/survey">アンケートに回答する <span>↗</span></a>
        </div>
      </section>

      {/* Driver Downloads Section */}
      <section id="driver" className="driver-section">
        <h2 className="section-title">ドライバー・ダウンロード</h2>
        <p className="driver-note">
          製品底面の型番をご確認の上、対応するドライバーをお選びください。
          ドライバー本体は Ajazz 公式サイトで常に最新版が公開されています。
        </p>
        <div className="driver-grid">
          <a
            href="https://www.ajazz-hub.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="driver-card recommended"
          >
            <span className="driver-badge">推奨</span>
            <div className="driver-icon">🖥</div>
            <h3>HUB Web版</h3>
            <p className="driver-update">NEW</p>
            <p>ブラウザで簡単設定。<br />Chrome / Edge / Opera 対応。</p>
            <p className="driver-detail">
              設定完了後は、ソフトを常駐させる必要はありません。
              対応機種：AK980 / MK87 他
            </p>
            <span className="driver-link">HUB Web版を開く →</span>
          </a>
          <a
            href="https://www.a-jazz.com/en/h-col-160.html"
            target="_blank"
            rel="noopener noreferrer"
            className="driver-card"
          >
            <div className="driver-icon">🌐</div>
            <h3>Web版ドライバー</h3>
            <p>ブラウザから直接デバイス設定。<br />インストール不要で手軽に設定可能。</p>
            <span className="driver-link">Web版を開く →</span>
          </a>
          <a
            href="https://www.a-jazz.com/en/h-col-159.html"
            target="_blank"
            rel="noopener noreferrer"
            className="driver-card"
          >
            <div className="driver-icon">📥</div>
            <h3>PC版ドライバー</h3>
            <p>キーボード・マウス各モデル対応。<br />ZIP ファイルをダウンロードして実行。</p>
            <span className="driver-link">ダウンロードページへ →</span>
          </a>
          <a
            href={DRIVER_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="driver-card"
          >
            <div className="driver-icon">🔍</div>
            <h3>ドライバー検索</h3>
            <p>製品型番から該当ドライバーを検索。<br />型番は製品底面に記載されています。</p>
            <span className="driver-link">検索ページへ →</span>
          </a>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <h2 className="section-title">よくある質問（FAQ）</h2>
        <div className="faq-list">
          {faqItems.map((item, i) => (
            <div
              key={i}
              className={`faq-item ${openFaq === i ? 'open' : ''}`}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <button className="faq-question" aria-expanded={openFaq === i}>
                <span>{item.q}</span>
                <span className="faq-chevron">{openFaq === i ? '−' : '+'}</span>
              </button>
              <div className="faq-answer" role="region">
                <p>{item.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 AJAZZ Japan. All rights reserved.</p>
          <div className="footer-links">
            <a href="https://item.rakuten.co.jp/ajazz" target="_blank" rel="noopener noreferrer">楽天市場</a>
            <a href="https://www.youtube.com/@AJAZZJAPAN" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href="https://www.instagram.com/ajazzjp/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://x.com/AjazzJapan" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
            <a href="mailto:support@ajazz.jp">お問い合わせ</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
