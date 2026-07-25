import Link from "next/link";

export const metadata = { title: "プライバシーポリシー | AJAZZ JAPAN" };

export default function PrivacyPage() {
  return <main className="storefront store-legal-page">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link><Link href="/">ストアへ戻る</Link></header>
    <section className="store-legal"><p className="store-eyebrow">PRIVACY</p><h1>プライバシーポリシー</h1>
      <article><h2>取得する情報</h2><p>当社は、ご注文・お問い合わせに際して、氏名、配送先住所、電話番号、メールアドレス、注文内容および配送情報を取得します。クレジットカード情報は決済事業者Stripeが取り扱い、当社はカード番号を保有しません。</p></article>
      <article><h2>利用目的</h2><p>取得した情報は、商品の販売、決済確認、発送、返品・交換対応、お問い合わせ対応、不正利用の防止および法令上の義務の履行のために利用します。</p></article>
      <article><h2>第三者提供</h2><p>当社は、配送、決済および法令上必要な場合を除き、本人の同意なく個人情報を第三者へ提供しません。決済にはStripeを、配送には当社が委託する配送事業者を利用します。</p></article>
      <article><h2>安全管理・開示等</h2><p>当社は適切な安全管理措置を講じます。保有個人データの開示、訂正、削除等のご要望は、本人確認のうえ法令に従って対応します。</p></article>
      <article><h2>お問い合わせ</h2><p>アジャズジャパン株式会社<br />xiet@a-jazz.com<br />070-9319-5121</p></article>
    </section>
  </main>;
}
