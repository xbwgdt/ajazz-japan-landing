import Link from "next/link";

export const metadata = { title: "特定商取引法に基づく表記 | AJAZZ JAPAN" };

const rows = [
  ["販売業者", "アジャズジャパン株式会社"],
  ["運営責任者", "代表取締役社長 謝天"],
  ["所在地", "〒340-0043 埼玉県草加市草加2-13-21-7"],
  ["電話番号", "070-9319-5121"],
  ["メールアドレス", "xiet@a-jazz.com"],
  ["販売価格", "各商品ページに表示する価格（税込）"],
  ["商品代金以外の必要料金", "日本国内の送料は無料です。インターネット接続にかかる通信費等はお客様のご負担です。"],
  ["お支払い方法・時期", "クレジットカード決済（Stripe）。ご注文時に決済されます。"],
  ["商品の引渡時期", "ご注文確定後、通常3営業日以内に発送します。天候・配送事情・在庫状況等により遅れる場合があります。"],
  ["配送地域", "日本国内"],
  ["返品・交換", "商品到着後7日以内にご連絡ください。お客様都合の返品・交換は返送料をご負担いただきます。初期不良と確認できた場合の返送料は当社が負担します。使用済み商品、付属品・外装の欠損がある商品等はお受けできない場合があります。"],
  ["返金", "返品商品を確認後、返金対象額を元のお支払い方法へ返金します。返金時期はカード会社の処理により異なります。"],
  ["販売数量", "各商品ページに表示する在庫数の範囲内です。"],
];

export default function LegalPage() {
  return <main className="storefront store-legal-page">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link><Link href="/">ストアへ戻る</Link></header>
    <section className="store-legal"><p className="store-eyebrow">LEGAL NOTICE</p><h1>特定商取引法に基づく表記</h1>
      <dl>{rows.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>
    </section>
  </main>;
}
