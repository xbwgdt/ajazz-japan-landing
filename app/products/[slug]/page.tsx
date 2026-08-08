import { notFound } from "next/navigation";
import { draftMode, headers } from "next/headers";
import { ProductDetail } from "../../../components/store/ProductDetail";
import { loadProductPageData } from "./preview-adapter";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const draft = await draftMode();
  const product = await loadProductPageData(slug, draft.isEnabled, await headers());

  if (!product) {
    notFound();
  }

  return <main className="storefront store-product-page"><ProductDetail product={product} /></main>;
}
