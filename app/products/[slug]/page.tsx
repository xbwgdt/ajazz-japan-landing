import { notFound } from "next/navigation";
import { draftMode, headers } from "next/headers";
import { ProductDetail } from "../../../components/store/ProductDetail";
import { StoreShell } from "../../../components/store/StoreShell";
import { getPublishedSiteSettings } from "../../../lib/cms/site-settings-reader";
import { loadProductPageData } from "./preview-adapter";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, draft, requestHeaders] = await Promise.all([params, draftMode(), headers()]);
  const [product, settings] = await Promise.all([
    loadProductPageData(slug, draft.isEnabled, requestHeaders),
    getPublishedSiteSettings(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <StoreShell settings={settings} className="store-product-route">
      <div className="store-product-page"><ProductDetail product={product} /></div>
    </StoreShell>
  );
}
