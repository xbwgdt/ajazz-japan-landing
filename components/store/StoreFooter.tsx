import Link from "next/link";
import { DRIVER_LINK_PROPS, type SiteSettingsViewModel } from "../../lib/cms/site-settings";
import { StoreLogo } from "./StoreLogo";

export function StoreFooter({ settings }: { settings: SiteSettingsViewModel }): React.ReactElement {
  const phoneDigits = settings.contact.phone.replace(/\D/g, "");
  const telephoneHref = settings.contact.phone.trim().startsWith("+") ? `+${phoneDigits}` : phoneDigits;

  return (
    <footer className="store-footer">
      <div className="store-footer-brand">
        <Link href="/" className="store-footer-logo" aria-label="AJAZZ JAPAN ホーム">
          <StoreLogo />
        </Link>
        <p>{settings.footer.companyName}<br />{settings.footer.address}</p>
        <div className="store-footer-contact">
          <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a>
          <a href={`tel:${telephoneHref}`}>{settings.contact.phone}</a>
        </div>
      </div>

      <nav className="store-footer-column" aria-label="フッターナビゲーション">
        <p>ご案内</p>
        {settings.footer.navigation.map((link) => (
          <Link key={link.href} href={link.href}>{link.label}</Link>
        ))}
      </nav>

      <div className="store-footer-column">
        <p>サポート</p>
        <a {...DRIVER_LINK_PROPS}>ドライバー</a>
      </div>

      {settings.socialLinks.length > 0 ? (
        <div className="store-footer-column">
          <p>ソーシャル</p>
          {settings.socialLinks.map((link) => (
            <a
              key={`${link.href}-${link.label}`}
              href={link.href}
              rel={link.href.startsWith("https:") ? "noopener noreferrer" : undefined}
              target={link.href.startsWith("https:") ? "_blank" : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </footer>
  );
}
