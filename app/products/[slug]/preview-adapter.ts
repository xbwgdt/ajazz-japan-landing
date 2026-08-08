import configPromise from "@payload-config";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";
import { createLocalReq, getPayload, type Payload } from "payload";
import type { Media, Product } from "../../../payload-types";
import { authenticateAdmin } from "../../../lib/cms/auth";
import { CommerceDatabaseNotConfiguredError } from "../../../lib/commerce/db";
import {
  getStorefrontDatabaseProduct,
  type StorefrontDatabaseProduct,
} from "../../../lib/commerce/storefront-db";
import { getStorefrontProduct } from "../../../components/store/catalogue";

type ProductPageProduct = StorefrontDatabaseProduct | ReturnType<typeof getStorefrontProduct>;

interface ProductPageDependencies {
  loadDraft?: (slug: string, headers: Headers) => Promise<ProductPageProduct>;
  loadFallback?: (slug: string) => ProductPageProduct;
  loadLive?: (slug: string) => Promise<ProductPageProduct>;
}

function mediaURL(value: Product["primaryImageId"], label: string): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "object") throw new Error(`Preview ${label} media is unresolved`);
  const media = value as Media;
  if (media.retiredAt || typeof media.url !== "string") {
    throw new Error(`Preview ${label} media is retired or unresolved`);
  }
  const url = media.url.trim();
  if (!url.startsWith("/api/cms/media/file/")) {
    throw new Error(`Preview ${label} media must use the Payload media URL`);
  }
  return url;
}

function relationMediaURL(value: unknown, label: string): string | undefined {
  return mediaURL(value as Product["primaryImageId"], label);
}

function descriptionHTML(description: Product["description"]): string {
  if (!description?.root) return "";
  return convertLexicalToHTML({
    data: description as Parameters<typeof convertLexicalToHTML>[0]["data"],
    disableContainer: true,
  });
}

export function adaptDraftProduct(product: Product): StorefrontDatabaseProduct {
  const images = [
    mediaURL(product.primaryImageId, "primary"),
    ...(product.galleryImageIds ?? []).map((value, index) => relationMediaURL(value, `gallery ${index + 1}`)),
    ...(product.sceneImageIds ?? []).map((value, index) => relationMediaURL(value, `scene ${index + 1}`)),
  ].filter((value): value is string => Boolean(value));

  const variants = (product.variants ?? [])
    .filter((variant) => variant.active !== false)
    .map((variant, index) => {
      const comparisonApproved = Boolean(variant.comparisonApprovedBy && variant.comparisonApprovedAt);
      return {
        id: variant.operationalVariantId
          ? String(variant.operationalVariantId)
          : `preview:${variant.id || index}`,
        rmsSkuNumber: variant.rmsSkuNumber || variant.sku,
        priceJpy: Number(variant.salePriceJpy),
        compareAtPriceJpy: comparisonApproved
          && Number(variant.compareAtPriceJpy) > Number(variant.salePriceJpy)
          ? Number(variant.compareAtPriceJpy)
          : undefined,
        colorName: variant.colorName || undefined,
        imageUrl: relationMediaURL(variant.imageId, `variant ${index + 1}`),
        availableQuantity: 0,
      };
    });

  return {
    name: product.name,
    descriptionHtml: descriptionHTML(product.description),
    images: [...new Set(images)],
    variants,
  };
}

export async function loadAuthenticatedDraftProduct(
  slug: string,
  headers: Headers,
  dependencies: {
    authenticate?: typeof authenticateAdmin;
    createRequest?: typeof createLocalReq;
    payload?: Payload;
  } = {},
): Promise<StorefrontDatabaseProduct | undefined> {
  const payload = dependencies.payload ?? await getPayload({ config: configPromise });
  const admin = await (dependencies.authenticate ?? authenticateAdmin)(headers, payload);
  if (!admin) return undefined;
  const req = await (dependencies.createRequest ?? createLocalReq)({ req: { headers }, user: admin }, payload);
  const result = await payload.find({
    collection: "products",
    depth: 1,
    draft: true,
    limit: 1,
    overrideAccess: false,
    req,
    where: { slug: { equals: slug } },
  });
  return result.docs[0] ? adaptDraftProduct(result.docs[0]) : undefined;
}

export async function loadProductPageData(
  slug: string,
  draftEnabled: boolean,
  headers: Headers,
  dependencies: ProductPageDependencies = {},
): Promise<ProductPageProduct> {
  if (draftEnabled) {
    return (dependencies.loadDraft ?? loadAuthenticatedDraftProduct)(slug, headers);
  }

  const fallback = (dependencies.loadFallback ?? getStorefrontProduct)(slug);
  try {
    return await (dependencies.loadLive ?? getStorefrontDatabaseProduct)(slug);
  } catch (error) {
    if (error instanceof CommerceDatabaseNotConfiguredError) return fallback;
    throw error;
  }
}
