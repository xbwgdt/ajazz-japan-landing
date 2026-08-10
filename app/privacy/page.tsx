import { DEFAULT_SITE_SETTINGS, type SiteSettingsViewModel } from "../../lib/cms/site-settings";
import { getPublishedSiteSettings } from "../../lib/cms/site-settings-reader";
import { StoreShell } from "../../components/store/StoreShell";

export const metadata = { title: "プライバシーポリシー | AJAZZ JAPAN" };
export const dynamic = "force-dynamic";

export function PrivacyContent({ settings = DEFAULT_SITE_SETTINGS }: { settings?: SiteSettingsViewModel }) {
  return <StoreShell settings={settings} className="store-legal-page">
    <article className="store-legal-document">
      <header className="store-legal-header"><p className="store-eyebrow">PRIVACY</p><h1>プライバシーポリシー</h1></header>
      <div className="store-legal-body store-legal-sections">
      <article><h2>取得する情報</h2><p>当社は、ご注文・お問い合わせに際して、氏名、配送先住所、電話番号、メールアドレス、注文内容および配送情報を取得します。クレジットカード情報は決済事業者Stripeが取り扱い、当社はカード番号を保有しません。</p></article>
      <article><h2>利用目的</h2><p>取得した情報は、商品の販売、決済確認、発送、返品・交換対応、お問い合わせ対応、不正利用の防止および法令上の義務の履行のために利用します。</p></article>
      <article><h2>第三者提供</h2><p>当社は、配送、決済および法令上必要な場合を除き、本人の同意なく個人情報を第三者へ提供しません。決済にはStripeを、配送には当社が委託する配送事業者を利用します。</p></article>
      <article><h2>アクセス解析</h2><p>当サイトでは、サイトの利用状況を把握し、サービスを改善するためにGoogle アナリティクスを利用しています。Google アナリティクスはCookie等を使用し、閲覧ページ、利用端末、ブラウザおよびおおよその地域などの情報を収集します。これらの情報に当社が氏名等を直接結び付けることはありません。収集・利用の詳細はGoogleのプライバシーポリシーおよびGoogle アナリティクス利用規約をご確認ください。</p></article>
      <article><h2>安全管理・開示等</h2><p>当社は適切な安全管理措置を講じます。保有個人データの開示、訂正、削除等のご要望は、本人確認のうえ法令に従って対応します。</p></article>
      <article><h2>お問い合わせ</h2><p>{settings.footer.companyName}<br />{settings.contact.email}<br />{settings.contact.phone}</p></article>
      </div>
    </article>
  </StoreShell>;
}

export default async function PrivacyPage() {
  return <PrivacyContent settings={await getPublishedSiteSettings()} />;
}
