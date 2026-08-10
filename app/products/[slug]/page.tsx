import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftMode, headers } from "next/headers";
import { cache } from "react";
import configPromise from "@payload-config";
import { getPayload } from "payload";
import { ProductDetail } from "../../../components/store/ProductDetail";
import { StoreShell } from "../../../components/store/StoreShell";
import { getPublishedSiteSettings } from "../../../lib/cms/site-settings-reader";
import { loadProductPageData } from "./preview-adapter";
import type { Media, Product } from "../../../payload-types";
import {
  sanitizeProductForRendering,
  type ProductWithSanitizedHtml,
} from "../../../lib/commerce/product-html";

export const dynamic = "force-dynamic";

interface ProductMetadataInput {
  name: string;
  descriptionHtml: string;
  images: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string;
}

interface ProductSeoFields {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImageUrl?: string;
}

interface ProductMetadataDependencies {
  loadProduct?: typeof loadProductPageData;
  loadSeo?: (slug: string, draftEnabled: boolean) => Promise<ProductSeoFields | undefined>;
  handleNotFound?: () => never;
}

type LoadedProduct = Awaited<ReturnType<typeof loadProductPageData>>;

interface ProductRequestData {
  product: ProductWithSanitizedHtml<NonNullable<LoadedProduct>> | undefined;
  seo: ProductSeoFields | undefined;
}

function plainTextDescription(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function safeImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  return url.startsWith("/") || /^https?:\/\//i.test(url) ? url : undefined;
}

function cmsMediaUrl(value: Product["seoImageId"]): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  return safeImageUrl((value as Media).url);
}

async function loadCmsProductSeo(slug: string, draftEnabled: boolean): Promise<ProductSeoFields | undefined> {
  try {
    const payload = await getPayload({ config: configPromise });
    const result = await payload.find({
      collection: "products",
      depth: 1,
      draft: draftEnabled,
      limit: 1,
      overrideAccess: true,
      where: { slug: { equals: slug } },
    });
    const product = result.docs[0];
    if (!product) return undefined;
    return {
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      seoImageUrl: cmsMediaUrl(product.seoImageId),
    };
  } catch {
    return undefined;
  }
}

async function resolveProductRequestData(
  slug: string,
  draftEnabled: boolean,
  requestHeaders: Headers,
): Promise<ProductRequestData> {
  const [product, seo] = await Promise.all([
    loadProductPageData(slug, draftEnabled, requestHeaders),
    loadCmsProductSeo(slug, draftEnabled),
  ]);
  return {
    product: product ? sanitizeProductForRendering(product) : undefined,
    seo,
  };
}

// React cache is scoped to the current server request; draft and auth headers are read inside it.
const loadProductRequestData = cache(async (slug: string): Promise<ProductRequestData> => {
  const [draft, requestHeaders] = await Promise.all([draftMode(), headers()]);
  return resolveProductRequestData(slug, draft.isEnabled, requestHeaders);
});

export function buildProductMetadata(slug: string, product: ProductMetadataInput): Metadata {
  const title = product.seoTitle?.trim() || product.name;
  const description = product.seoDescription?.trim().slice(0, 160)
    || plainTextDescription(product.descriptionHtml)
    || `${product.name}の商品情報。AJAZZ JAPAN公式オンラインストア。`;
  const image = safeImageUrl(product.seoImageUrl) ?? product.images.map(safeImageUrl).find(Boolean);
  const images = image ? [{ url: image, alt: product.name }] : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/products/${encodeURIComponent(slug)}` },
    openGraph: {
      type: "website",
      title,
      description,
      url: `/products/${encodeURIComponent(slug)}`,
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export async function resolveProductMetadata(
  slug: string,
  draftEnabled: boolean,
  requestHeaders: Headers,
  dependencies: ProductMetadataDependencies = {},
): Promise<Metadata> {
  const [product, seo] = await Promise.all([
    (dependencies.loadProduct ?? loadProductPageData)(slug, draftEnabled, requestHeaders),
    (dependencies.loadSeo ?? loadCmsProductSeo)(slug, draftEnabled),
  ]);
  if (!product) (dependencies.handleNotFound ?? notFound)();
  const sanitizedProduct = sanitizeProductForRendering(product);
  return buildProductMetadata(slug, {
    ...sanitizedProduct,
    descriptionHtml: sanitizedProduct.sanitizedDescriptionHtml,
    ...seo,
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { product, seo } = await loadProductRequestData(slug);
  if (!product) notFound();
  return buildProductMetadata(slug, {
    ...product,
    descriptionHtml: product.sanitizedDescriptionHtml,
    ...seo,
  });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ product }, settings] = await Promise.all([
    loadProductRequestData(slug),
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
