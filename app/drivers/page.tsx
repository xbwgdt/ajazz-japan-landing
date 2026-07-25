import Link from "next/link";

const models = [
  ["MAGNETIC KEYBOARD", "AK029 / AK680 V2 / AK820 MAX ULTRA / AK820 V2 / AK980 MAX"],
  ["GAMING MOUSE", "AJ159 Series / AJ179 Series / AJ199 Series"],
  ["STREAM CONTROLLER", "AKP03 / AKP05 PRO / AKP153 / N1"],
];

export const metadata = { title: "ドライバー・ダウンロード | AJAZZ JAPAN" };

export default function DriversPage() {
  return <main className="storefront store-drivers-page">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link><Link href="/">ストアへ戻る</Link></header>
    <section className="store-drivers">
      <p className="store-eyebrow">SOFTWARE &amp; FIRMWARE</p>
      <h1>ドライバー<br />ダウンロード</h1>
      <p>対応ソフトウェア、設定ツールおよびファームウェアは、モデルごとに提供します。お使いのモデル名を確認してからご利用ください。</p>
      <div className="store-download-list">
        {models.map(([category, model]) => <article key={category}><p>{category}</p><h2>{model}</h2><span>配布準備中</span></article>)}
      </div>
      <div className="store-drivers-contact"><p>対象モデルのドライバーが見つからない場合は、製品名とご利用のOSを記載してお問い合わせください。</p><a className="store-button store-button-primary" href="mailto:xiet@a-jazz.com?subject=AJAZZ%20%E3%83%89%E3%83%A9%E3%82%A4%E3%83%90%E3%83%BC%E3%81%AB%E9%96%A2%E3%81%99%E3%82%8B%E5%95%8F%E3%81%84%E5%90%88%E3%82%8F%E3%81%9B">メールで問い合わせる</a></div>
    </section>
  </main>;
}
