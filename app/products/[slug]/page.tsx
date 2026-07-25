import { notFound } from "next/navigation";
import { ProductDetail } from "../../../components/store/ProductDetail";
import { getStorefrontProduct } from "../../../components/store/catalogue";
import { getStorefrontDatabaseProduct } from "../../../lib/commerce/storefront-db";
import { CommerceDatabaseNotConfiguredError } from "../../../lib/commerce/db";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fallback = getStorefrontProduct(slug);
  const product = await getStorefrontDatabaseProduct(slug).catch((error) => {
    if (error instanceof CommerceDatabaseNotConfiguredError) return fallback;
    throw error;
  });

  if (!product) {
    notFound();
  }

  return <main className="storefront store-product-page"><ProductDetail product={product} /></main>;
}
