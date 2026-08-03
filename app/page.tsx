import { Storefront } from "../components/store/Storefront";
import { CommerceDatabaseNotConfiguredError } from "../lib/commerce/db";
import { listStorefrontDatabaseCards } from "../lib/commerce/storefront-db";
import { storefrontProducts } from "../components/store/catalogue";
import { resolveStorefrontCards } from "../lib/commerce/storefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const databaseProducts = await listStorefrontDatabaseCards().catch((error) => {
    if (error instanceof CommerceDatabaseNotConfiguredError) return undefined;
    throw error;
  });
  return <Storefront products={resolveStorefrontCards(databaseProducts, storefrontProducts)} />;
}
