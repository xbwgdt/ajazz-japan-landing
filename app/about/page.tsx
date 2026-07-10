import type { Metadata } from "next";

const siteUrl = "https://ajazz-japan-landing.vercel.app";

export const metadata: Metadata = {
  title: "AJAZZについて - AJAZZ 日本公式",
  description:
    "AJAZZ（黑爵）は2009年に設立された、ゲーミングギア＆キーボードブランドです。世界中のゲーマーに愛される製品をお届けします。",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: `${siteUrl}/about`,
    siteName: "AJAZZ Japan",
    title: "AJAZZについて - AJAZZ 日本公式",
    description:
      "AJAZZ（黑爵）は2009年に設立された、ゲーミングギア＆キーボードブランドです。",
  },
};

export default function AboutPage() {
  return (
    <main className="main">
      <div className="about-page">
        <section className="about-hero">
          <h1>AJAZZ について</h1>
          <p className="about-subtitle">ゲーミングギアの可能性を広げる</p>
        </section>

        <section className="about-section">
          <div className="about-card">
            <h2>ブランドストーリー</h2>
            <p>
              AJAZZ（黑爵）は2009年に中国で誕生したゲーミングギアブランドです。
              設立以来、「高品質・高コスパ」をモットーに、世界中のゲーマーに向けて
              キーボード、マウス、オーディオ機器を開発・提供しています。
            </p>
            <p>
              私たちは単なる製品メーカーではなく、ゲーマーの声に耳を傾け、
              実際のプレイ体験を向上させる製品づくりを追求しています。
              プロゲーマーからカジュアルユーザーまで、あらゆるプレイヤーに
              最適なギアをお届けします。
            </p>
          </div>

          <div className="about-card">
            <h2>私たちの強み</h2>
            <div className="strength-grid">
              <div className="strength-item">
                <span className="strength-icon">🔧</span>
                <h3>高品質な製造</h3>
                <p>自社工場と厳格な品質管理により、安定した製品品質を実現。</p>
              </div>
              <div className="strength-item">
                <span className="strength-icon">💡</span>
                <h3>革新的なデザイン</h3>
                <p>TFTスクリーン搭載、磁気スイッチ、ガスケットマウントなど、最新技術を積極採用。</p>
              </div>
              <div className="strength-item">
                <span className="strength-icon">💰</span>
                <h3>圧倒的なコスパ</h3>
                <p>高機能でありながら手の届きやすい価格設定。ゲーマーの味方であり続けます。</p>
              </div>
              <div className="strength-item">
                <span className="strength-icon">🌏</span>
                <h3>グローバル展開</h3>
                <p>日本・アメリカ・ヨーロッパ・東南アジアなど、世界各国で販売中。</p>
              </div>
            </div>
          </div>

          <div className="about-card">
            <h2>日本におけるAJAZZ</h2>
            <p>
              AJAZZ Japanは日本のゲーマーの皆様に最適な製品をお届けするため、
              楽天市場とAmazon.co.jpに公式ストアを開設しています。
              すべての製品は日本国内発送・送料無料でお届け。
              日本語カスタマーサポートも対応しておりますので、
              安心してご購入いただけます。
            </p>
          </div>

          <div className="about-card">
            <h2>お問い合わせ</h2>
            <p>
              製品に関するご質問・ご要望がございましたら、
              以下のメールアドレスまでお気軽にご連絡ください。
            </p>
            <p className="about-email">
              📧 <a href="mailto:xiet@a-jazz.com">xiet@a-jazz.com</a>
            </p>
          </div>
        </section>

        <div className="about-footer-link">
          <a href="/" className="cta-button">製品一覧に戻る</a>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <p>&copy; 2026 AJAZZ Japan. All rights reserved.</p>
          <div className="footer-links">
            <a href="https://item.rakuten.co.jp/ajazz" target="_blank" rel="noopener noreferrer">楽天市場</a>
            <a href="https://www.youtube.com/@AJAZZJAPAN" target="_blank" rel="noopener noreferrer">YouTube</a>
            <a href="https://www.instagram.com/ajazzjp/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://x.com/AjazzJapan" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
            <a href="mailto:xiet@a-jazz.com">お問い合わせ</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
