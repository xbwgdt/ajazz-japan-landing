import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettingsViewModel,
} from "../../lib/cms/site-settings";
import { getPublishedSiteSettings } from "../../lib/cms/site-settings-reader";
import { StoreShell } from "../../components/store/StoreShell";

export const metadata = { title: "特定商取引法に基づく表記" };
export const dynamic = "force-dynamic";

function legalRows(settings: SiteSettingsViewModel): Array<[string, string]> {
  return [
    ["販売業者", settings.legal.sellerName],
    ["運営責任者", settings.legal.responsiblePerson],
    ["所在地", settings.legal.address],
    ["電話番号", settings.legal.phone],
    ["メールアドレス", settings.legal.email],
    ["販売価格", settings.legal.priceNotice],
    ["商品代金以外の必要料金", settings.legal.additionalFees],
    ["お支払い方法・時期", settings.legal.payment],
    ["商品の引渡時期", settings.legal.delivery],
    ["配送地域", settings.legal.deliveryArea],
    ["返品・交換", settings.legal.returns],
    ["返金", settings.legal.refunds],
    ["販売数量", settings.legal.quantity],
  ];
}

export function LegalContent({ settings = DEFAULT_SITE_SETTINGS }: { settings?: SiteSettingsViewModel }) {
  return <StoreShell settings={settings} className="store-legal-page">
    <article className="store-legal-document">
      <header className="store-legal-header"><p className="store-eyebrow">LEGAL NOTICE</p><h1>特定商取引法に基づく表記</h1></header>
      <dl className="store-legal-body store-legal-definitions">{legalRows(settings).map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl>
    </article>
  </StoreShell>;
}

export default async function LegalPage() {
  return <LegalContent settings={await getPublishedSiteSettings()} />;
}
