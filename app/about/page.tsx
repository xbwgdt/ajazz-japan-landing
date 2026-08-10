import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettingsViewModel,
} from "../../lib/cms/site-settings";
import { getPublishedSiteSettings } from "../../lib/cms/site-settings-reader";
import { StoreShell } from "../../components/store/StoreShell";

export const metadata = {
  title: "AJAZZ JAPANについて",
  description: "AJAZZ JAPAN公式ストアの運営会社とブランドについて。",
};
export const dynamic = "force-dynamic";

function titleLines(value: string) {
  return value.split("\n").map((line, index) => <span key={`${line}-${index}`}>{index > 0 ? <br /> : null}{line}</span>);
}

export function AboutContent({ settings = DEFAULT_SITE_SETTINGS }: { settings?: SiteSettingsViewModel }) {
  const subject = encodeURIComponent("OEM・卸売事業についてのご相談");
  return <StoreShell settings={settings} className="store-about-page">
    <section className="store-about-hero store-editorial-reveal">
      <p className="store-eyebrow">AJAZZ JAPAN</p>
      <h1>PERFORMANCE<br />WITHOUT<br />COMPROMISE.</h1>
      <p>ラピッドトリガー、ハイポーリングレート、細部まで調整できる入力体験。AJAZZ JAPANは、日本のゲーマーとクリエイターに向けて、性能を妥協しないデバイスを届けます。</p>
    </section>
    <section className="store-about-pillars" aria-label="AJAZZブランドと日本法人について">
      <article className="store-about-brand store-editorial-reveal">
        <p className="store-eyebrow">{settings.company.brand.eyebrow}</p>
        <h2>{titleLines(settings.company.brand.title)}</h2>
        <div>{settings.company.brand.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </article>
      <article className="store-about-support store-editorial-reveal">
        <p className="store-eyebrow">{settings.company.support.eyebrow}</p>
        <h2>{titleLines(settings.company.support.title)}</h2>
        <div>{settings.company.support.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </article>
    </section>
    <section className="store-business-capability store-editorial-reveal" id="business">
      <p className="store-eyebrow">{settings.company.business.eyebrow}</p>
      <h2>{titleLines(settings.company.business.title)}</h2>
      {settings.company.business.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <a className="store-button store-button-primary" href={`mailto:${settings.contact.email}?subject=${subject}`}>{settings.company.business.commandLabel}</a>
    </section>
    <section className="store-about-company store-editorial-reveal">
      <p className="store-eyebrow">COMPANY</p><h2>会社情報</h2>
      <dl>
        <div><dt>会社名</dt><dd>{settings.footer.companyName}</dd></div>
        <div><dt>所在地</dt><dd>{settings.footer.address}</dd></div>
        <div><dt>電話番号</dt><dd>{settings.contact.phone}</dd></div>
        <div><dt>メール</dt><dd><a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a></dd></div>
      </dl>
    </section>
  </StoreShell>;
}

export default async function AboutPage() {
  return <AboutContent settings={await getPublishedSiteSettings()} />;
}
