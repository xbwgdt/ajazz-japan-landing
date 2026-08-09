import { Storefront } from "../components/store/Storefront";
import { CommerceDatabaseNotConfiguredError } from "../lib/commerce/db";
import { listStorefrontDatabaseCards } from "../lib/commerce/storefront-db";
import { storefrontProducts } from "../components/store/catalogue";
import { resolveStorefrontCards } from "../lib/commerce/storefront";
import { getPublishedSiteSettings } from "../lib/cms/site-settings-reader";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [databaseProducts, settings] = await Promise.all([
    listStorefrontDatabaseCards().catch((error) => {
      if (error instanceof CommerceDatabaseNotConfiguredError) return undefined;
      throw error;
    }),
    getPublishedSiteSettings(),
  ]);
  return <Storefront settings={settings} products={resolveStorefrontCards(databaseProducts, storefrontProducts)} />;
}
