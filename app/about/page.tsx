import Link from "next/link";

export const metadata = {
  title: "AJAZZ JAPANについて | AJAZZ JAPAN",
  description: "AJAZZ JAPAN公式ストアの運営会社とブランドについて。",
};

export default function AboutPage() {
  return <main className="storefront store-about-page">
    <header className="store-nav">
      <Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link>
      <nav aria-label="Primary navigation"><Link href="/">ストア</Link><Link href="/drivers">ドライバー</Link><Link href="/legal">特定商取引法に基づく表記</Link></nav>
    </header>
    <section className="store-about-hero">
      <p className="store-eyebrow">AJAZZ JAPAN</p>
      <h1>PERFORMANCE<br />WITHOUT<br />COMPROMISE.</h1>
      <p>ラピッドトリガー、ハイポーリングレート、細部まで調整できる入力体験。AJAZZ JAPANは、日本のゲーマーとクリエイターに向けて、性能を妥協しないデバイスを届けます。</p>
    </section>
    <section className="store-about-pillars" aria-label="AJAZZブランドと日本法人について">
      <article className="store-about-brand">
        <p className="store-eyebrow">BRAND</p>
        <h2>AJAZZ、2009年に誕生した<br />PC周辺機器ブランド</h2>
        <div>
          <p>AJAZZは、長年にわたる製品開発の経験を活かし、エントリーモデルから、ラピッドトリガー対応キーボード、高ポーリングレート対応マウス、デザイン性に優れたデスクセットアップ向けモデルまで、用途やプレイスタイルに合わせて選べる、豊富な製品ラインナップを展開しています。</p>
          <p>性能・使いやすさ・デザインのバランスを大切にしながら、毎日のPC体験をより快適で楽しいものにしていきます。</p>
        </div>
      </article>
      <article className="store-about-support">
        <p className="store-eyebrow">JAPAN SUPPORT</p>
        <h2>AJAZZ日本法人による<br />安心サポート</h2>
        <div>
          <p>日本法人であるアジャズジャパン株式会社（AJAZZ JAPAN）が国内窓口として対応します。海外発送を中心とするブランドとは異なり、日本人スタッフがご購入後のお問い合わせや保証相談まで丁寧にサポートします。</p>
          <p>安心して製品を選び、長く快適にお使いいただけるよう、初期設定や使い方の不安にも寄り添い、日本品質のサポートを提供します。</p>
        </div>
      </article>
    </section>
    <section className="store-business-capability" id="business">
      <p className="store-eyebrow">BUSINESS CAPABILITY</p>
      <h2>日本市場と世界のものづくりをつなぐ、<br />AJAZZの開発・供給力。</h2>
      <p>アジャズジャパン株式会社は、AJAZZブランド製品の日本国内販売に加え、ゲーミングデバイス分野で培った製品開発力とグローバルな生産ネットワークを活かし、OEM製品の企画・開発および法人・販売店向けの卸売にも対応しています。</p>
      <p>製品仕様、デザイン、パッケージ、日本市場向けの展開まで、事業内容に合わせたご相談を承ります。OEM・卸売をご検討の企業様は、メールでお問い合わせください。</p>
      <a className="store-button store-button-primary" href="mailto:xiet@a-jazz.com?subject=OEM・卸売事業についてのご相談">法人・事業相談をメールする</a>
    </section>
    <section className="store-about-company">
      <p className="store-eyebrow">COMPANY</p><h2>会社情報</h2>
      <dl>
        <div><dt>会社名</dt><dd>アジャズジャパン株式会社</dd></div>
        <div><dt>所在地</dt><dd>〒340-0043 埼玉県草加市草加2-13-21-7</dd></div>
        <div><dt>電話番号</dt><dd>070-9319-5121</dd></div>
        <div><dt>メール</dt><dd><a href="mailto:xiet@a-jazz.com">xiet@a-jazz.com</a></dd></div>
      </dl>
    </section>
    <footer className="store-footer">
      <img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" />
      <p>アジャズジャパン株式会社<br />〒340-0043 埼玉県草加市草加2-13-21-7</p>
      <div><Link href="/legal">特定商取引法に基づく表記</Link><Link href="/privacy">プライバシーポリシー</Link><Link href="/terms">利用規約</Link></div>
    </footer>
  </main>;
}
