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
    <section className="store-about-grid">
      <article><p className="store-eyebrow">OUR APPROACH</p><h2>毎日の入力を、<br />もっと正確に。</h2><p>キーボード、マウス、ストリームコントローラーを通じて、プレイと作業の反応速度、操作性、カスタマイズ性を追求します。</p></article>
      <article className="store-about-mark" aria-hidden="true"><img src="/brand/ajazz-japan-logo.jpg" alt="" /></article>
    </section>
    <section className="store-about-company">
      <p className="store-eyebrow">COMPANY</p><h2>会社情報</h2>
      <dl>
        <div><dt>会社名</dt><dd>アジャズジャパン株式会社</dd></div>
        <div><dt>代表者</dt><dd>代表取締役社長 謝天</dd></div>
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
