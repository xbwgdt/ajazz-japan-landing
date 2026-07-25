import { Storefront } from "../components/store/Storefront";
import { CommerceDatabaseNotConfiguredError } from "../lib/commerce/db";
import { listStorefrontDatabaseCards } from "../lib/commerce/storefront-db";
import { storefrontProducts } from "../components/store/catalogue";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await listStorefrontDatabaseCards().catch((error) => {
    if (error instanceof CommerceDatabaseNotConfiguredError) return storefrontProducts;
    throw error;
  });
  return <Storefront products={products.length ? products : storefrontProducts} />;
}
