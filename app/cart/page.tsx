import { CartPage } from "../../components/store/CartPage";
import { StoreShell } from "../../components/store/StoreShell";
import { getPublishedSiteSettings } from "../../lib/cms/site-settings-reader";

export const metadata = { title: "カート | AJAZZ JAPAN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Cart() {
  const settings = await getPublishedSiteSettings();

  return <StoreShell settings={settings} className="store-cart-route">
    <CartPage />
  </StoreShell>;
}
