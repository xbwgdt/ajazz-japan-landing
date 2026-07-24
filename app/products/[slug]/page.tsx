import { notFound } from "next/navigation";
import { ProductDetail } from "../../../components/store/ProductDetail";
import { getStorefrontProduct } from "../../../components/store/catalogue";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getStorefrontProduct(slug);

  if (!product) {
    notFound();
  }

  return <main className="storefront store-product-page"><ProductDetail product={product} /></main>;
}
