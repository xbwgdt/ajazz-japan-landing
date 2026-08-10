import type { ReactNode } from "react";
import type { SiteSettingsViewModel } from "../../lib/cms/site-settings";
import { StoreFooter } from "./StoreFooter";
import { StoreHeader } from "./StoreHeader";

interface StoreShellProps {
  settings: SiteSettingsViewModel;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function StoreShell({
  settings,
  children,
  className,
  footer,
}: StoreShellProps): React.ReactElement {
  const classes = ["storefront", "store-shell", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <StoreHeader />
      <main className="store-shell-main">{children}</main>
      {footer === undefined ? <StoreFooter settings={settings} /> : footer}
    </div>
  );
}
