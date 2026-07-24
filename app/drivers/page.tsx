import Link from "next/link";

const downloads = [
  ["Magnetic Keyboard", "AK820 MAX ULTRA / AK820 Series", "ドライバー公開準備中"],
  ["Gaming Mouse", "AJ179 APEX / AJ159 Series", "ドライバー公開準備中"],
  ["Stream Control", "AKP05 PRO", "ドライバー公開準備中"],
];

export default function DriversPage() {
  return (
    <main className="storefront store-drivers-page">
      <header className="store-nav"><Link href="/" className="store-brand"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link></header>
      <section className="store-drivers">
        <p className="store-eyebrow">SOFTWARE &amp; FIRMWARE</p>
        <h1>ドライバー<br />ダウンロード</h1>
        <p>ご使用のモデルを確認し、対応するソフトウェアをご利用ください。</p>
        <div className="store-download-list">
          {downloads.map(([category, model, state]) => <article key={model}><p>{category}</p><h2>{model}</h2><span>{state}</span></article>)}
        </div>
      </section>
    </main>
  );
}
