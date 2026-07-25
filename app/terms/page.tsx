import Link from "next/link";

export const metadata = { title: "利用規約 | AJAZZ JAPAN" };

const sections = [
  ["適用", "本規約は、アジャズジャパン株式会社が運営するAJAZZ JAPAN公式オンラインストア（以下「当ストア」）での商品購入および関連サービスの利用に適用されます。"],
  ["注文と契約成立", "ご注文後、Stripeによる決済が完了し、当社が注文確認を行った時点で売買契約が成立します。在庫状況、価格表示の明らかな誤り、不正利用その他の合理的な理由がある場合、当社は注文を取り消すことがあります。"],
  ["価格・送料・支払い", "表示価格は日本円（税込）です。日本国内の配送料は無料です。お支払いはStripeを利用したクレジットカード決済に対応します。"],
  ["配送", "日本国内を配送対象とし、ご注文確認後、原則として3営業日以内に発送します。天候、交通事情、繁忙期、在庫状況その他の事情により配送が遅れる場合があります。"],
  ["返品・交換", "商品到着後7日以内であれば、未使用かつ再販売可能な状態の商品について返品または交換を承ります。お客様都合の返品・交換にかかる送料はお客様のご負担です。初期不良または注文内容と異なる商品が到着した場合は、確認後に当社が送料を負担します。詳細は特定商取引法に基づく表記をご確認ください。"],
  ["禁止事項", "法令または公序良俗に反する行為、当ストアの運営を妨げる行為、不正な決済、他者になりすます行為、当社または第三者の権利を侵害する行為を禁止します。"],
  ["サービスの変更", "当社は、保守、障害対応、法令対応その他の必要がある場合、当ストアの内容を変更、停止または終了することがあります。"],
  ["規約の変更", "当社は必要に応じて本規約を変更します。変更後の規約は当ストア上に掲載した時点から効力を生じます。"],
  ["お問い合わせ", "アジャズジャパン株式会社\nメール: xiet@a-jazz.com\n電話: 070-9319-5121"],
];

export default function TermsPage() {
  return <main className="storefront store-legal-page">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link><Link href="/">ストアへ戻る</Link></header>
    <section className="store-legal"><p className="store-eyebrow">TERMS</p><h1>利用規約</h1>
      <p>最終更新日: 2026年7月25日</p>
      <dl>{sections.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>
    </section>
  </main>;
}
