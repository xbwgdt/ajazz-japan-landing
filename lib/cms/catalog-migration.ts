export type CatalogSourceType = "manual" | "rms";
export type CatalogLifecycle = "active" | "unpublished" | "archived";
export type CatalogPublicationStatus = "draft" | "published";
export type CatalogInventoryMode = "manual" | "rms";
export type CatalogComparisonEvidenceType = "manufacturer_price" | "market_price" | "recent_price";

export interface OperationalCatalogVariant {
  id: number;
  cmsVariantId: string | null;
  sku: string | null;
  rmsSkuNumber: string | null;
  inventoryMode: CatalogInventoryMode;
  priceJpy: number;
  compareAtPriceJpy: number | null;
  comparisonEvidenceType: CatalogComparisonEvidenceType | null;
  comparisonEvidenceReference: string | null;
  comparisonApprovedBy: string | null;
  comparisonApprovedAt: string | null;
  colorName: string | null;
  colorSwatch: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  active: boolean;
}

export interface OperationalCatalogImage {
  id: number;
  url: string;
  position: number;
}

export interface OperationalCatalogProduct {
  id: number;
  cmsProductId: string | null;
  sourceType: CatalogSourceType;
  rmsManageNumber: string | null;
  slug: string;
  name: string;
  descriptionHtml: string;
  category: string;
  shortStatement: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  merchandisingOrder: number;
  lifecycle: CatalogLifecycle;
  published: boolean;
  publicationRevision: number;
  images: OperationalCatalogImage[];
  variants: OperationalCatalogVariant[];
}

export interface CmsCatalogVariant {
  id: string;
  operationalVariantId: string | null;
  sku: string;
  rmsSkuNumber: string | null;
  inventoryMode: CatalogInventoryMode;
  salePriceJpy: number;
  compareAtPriceJpy: number | null;
  comparisonEvidenceType: CatalogComparisonEvidenceType | null;
  comparisonEvidenceReference: string | null;
  comparisonApprovedBy: string | null;
  comparisonApprovedAt: string | null;
  colorName: string;
  colorSwatch: string | null;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  active: boolean;
}

export interface CmsCatalogProduct {
  id: string;
  operationalProductId: string | null;
  sourceType: CatalogSourceType;
  rmsManageNumber: string | null;
  slug: string;
  name: string;
  descriptionHtml: string;
  category: string;
  shortStatement: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  featured: boolean;
  merchandisingOrder: number;
  lifecycle: CatalogLifecycle;
  status: CatalogPublicationStatus;
  publicationRevision: number;
  images: Array<{ url: string; position: number }>;
  variants: CmsCatalogVariant[];
}

export type CatalogMigrationCreate = Omit<CmsCatalogProduct, "id">;

export interface CatalogMigrationConflict {
  code: "duplicate_cms_match" | "product_identity_conflict" | "variant_identity_conflict";
  operationalProductId: string;
  detail: string;
}

export interface CatalogMigrationVariantMatch {
  operationalVariantId: string;
  cmsVariantId: string;
  matchedBy: "operationalVariantId" | "rmsSkuNumber";
}

export interface CatalogMigrationMatch {
  operationalProductId: string;
  cmsProductId: string;
  matchedBy: "operationalProductId" | "rmsManageNumber";
  variants: CatalogMigrationVariantMatch[];
}

export interface CatalogMigrationLink {
  operationalProductId: string;
  cmsProductId: string;
  setCmsOperationalProductId: boolean;
  variants: Array<{
    operationalVariantId: string;
    cmsVariantId: string;
    setCmsOperationalVariantId: boolean;
  }>;
}

export interface MigrationPlan {
  creates: CatalogMigrationCreate[];
  links: CatalogMigrationLink[];
  matches: CatalogMigrationMatch[];
  conflicts: CatalogMigrationConflict[];
}

export interface ReconciliationReport {
  ok: boolean;
  productCount: { operational: number; cms: number; matches: boolean };
  variantCount: { operational: number; cms: number; matches: boolean };
  rmsLinkMismatches: Array<Record<string, string | null>>;
  skuMismatches: Array<Record<string, string | null>>;
  priceMismatches: Array<Record<string, string | number | null>>;
  imageCountMismatches: Array<Record<string, string | number>>;
  publicationStateMismatches: Array<Record<string, string | boolean>>;
}

function compareStableIds(left: string, right: string): number {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : Number.NaN;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : Number.NaN;
  if (Number.isSafeInteger(leftNumber) && Number.isSafeInteger(rightNumber)) return leftNumber - rightNumber;
  return left.localeCompare(right, "en");
}

function sortedOperational(products: readonly OperationalCatalogProduct[]) {
  return [...products].sort((left, right) => compareStableIds(String(left.id), String(right.id)));
}

function sortedImages(images: readonly OperationalCatalogImage[]) {
  return [...images]
    .sort((left, right) => left.position - right.position || left.id - right.id)
    .map(({ url, position }) => ({ url, position }));
}

function sortedVariants(variants: readonly OperationalCatalogVariant[]) {
  return [...variants].sort((left, right) => left.id - right.id);
}

function createFromOperational(product: OperationalCatalogProduct): CatalogMigrationCreate {
  return {
    operationalProductId: String(product.id),
    sourceType: product.sourceType,
    rmsManageNumber: product.rmsManageNumber,
    slug: product.slug,
    name: product.name,
    descriptionHtml: product.descriptionHtml,
    category: product.category,
    shortStatement: product.shortStatement,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    featured: product.featured,
    merchandisingOrder: product.merchandisingOrder,
    lifecycle: product.lifecycle,
    status: product.published ? "published" : "draft",
    publicationRevision: Math.max(1, product.publicationRevision),
    images: sortedImages(product.images),
    variants: sortedVariants(product.variants).map((variant) => ({
      id: variant.cmsVariantId ?? `migration:${product.id}:${variant.id}`,
      operationalVariantId: String(variant.id),
      sku: variant.sku ?? variant.rmsSkuNumber ?? String(variant.id),
      rmsSkuNumber: variant.rmsSkuNumber,
      inventoryMode: variant.inventoryMode,
      salePriceJpy: variant.priceJpy,
      compareAtPriceJpy: variant.compareAtPriceJpy,
      comparisonEvidenceType: variant.comparisonEvidenceType,
      comparisonEvidenceReference: variant.comparisonEvidenceReference,
      comparisonApprovedBy: variant.comparisonApprovedBy,
      comparisonApprovedAt: variant.comparisonApprovedAt,
      colorName: variant.colorName ?? variant.sku ?? variant.rmsSkuNumber ?? `Variant ${variant.id}`,
      colorSwatch: variant.colorSwatch,
      thumbnailUrl: variant.thumbnailUrl,
      imageUrl: variant.imageUrl,
      active: variant.active,
    })),
  };
}

function productCandidates(
  product: OperationalCatalogProduct,
  cms: readonly CmsCatalogProduct[],
): { match?: CmsCatalogProduct; matchedBy?: CatalogMigrationMatch["matchedBy"]; conflict?: string } {
  const byOperationalId = cms.filter((candidate) => candidate.operationalProductId === String(product.id));
  const byRms = product.rmsManageNumber
    ? cms.filter((candidate) => candidate.rmsManageNumber === product.rmsManageNumber)
    : [];
  if (byOperationalId.length > 1 || byRms.length > 1) {
    return { conflict: "Multiple CMS products share one stable operational identity." };
  }
  if (byOperationalId[0] && byRms[0] && byOperationalId[0].id !== byRms[0].id) {
    return { conflict: "Operational product ID and RMS management number resolve to different CMS products." };
  }
  if (byOperationalId[0]) return { match: byOperationalId[0], matchedBy: "operationalProductId" };
  if (byRms[0]) return { match: byRms[0], matchedBy: "rmsManageNumber" };
  return {};
}

function matchVariants(
  product: OperationalCatalogProduct,
  cmsProduct: CmsCatalogProduct,
): { matches: CatalogMigrationVariantMatch[]; conflicts: CatalogMigrationConflict[] } {
  const matches: CatalogMigrationVariantMatch[] = [];
  const conflicts: CatalogMigrationConflict[] = [];
  const claimedCmsIds = new Set<string>();

  for (const variant of sortedVariants(product.variants)) {
    const byId = cmsProduct.variants.filter((candidate) => candidate.operationalVariantId === String(variant.id));
    const byRms = variant.rmsSkuNumber
      ? cmsProduct.variants.filter((candidate) => candidate.rmsSkuNumber === variant.rmsSkuNumber)
      : [];
    const conflict = byId.length > 1
      || byRms.length > 1
      || Boolean(byId[0] && byRms[0] && byId[0].id !== byRms[0].id);
    if (conflict) {
      conflicts.push({
        code: "variant_identity_conflict",
        operationalProductId: String(product.id),
        detail: `Variant ${variant.id} has conflicting CMS identities.`,
      });
      continue;
    }
    const match = byId[0] ?? byRms[0];
    if (!match) {
      conflicts.push({
        code: "variant_identity_conflict",
        operationalProductId: String(product.id),
        detail: `Operational variant ${variant.id} has no CMS variant match.`,
      });
      continue;
    }
    if (
      (match.operationalVariantId != null && match.operationalVariantId !== String(variant.id))
      || (variant.cmsVariantId != null && variant.cmsVariantId !== match.id)
    ) {
      conflicts.push({
        code: "variant_identity_conflict",
        operationalProductId: String(product.id),
        detail: `Variant ${variant.id} has incompatible existing linkage.`,
      });
      continue;
    }
    if (claimedCmsIds.has(match.id)) {
      conflicts.push({
        code: "variant_identity_conflict",
        operationalProductId: String(product.id),
        detail: `CMS variant ${match.id} matches more than one operational variant.`,
      });
      continue;
    }
    claimedCmsIds.add(match.id);
    matches.push({
      operationalVariantId: String(variant.id),
      cmsVariantId: match.id,
      matchedBy: byId[0] ? "operationalVariantId" : "rmsSkuNumber",
    });
  }
  return { matches, conflicts };
}

export function planCatalogMigration(
  operational: readonly OperationalCatalogProduct[],
  cms: readonly CmsCatalogProduct[],
): MigrationPlan {
  const plan: MigrationPlan = { creates: [], links: [], matches: [], conflicts: [] };
  const claimedCmsIds = new Set<string>();

  for (const product of sortedOperational(operational)) {
    const candidate = productCandidates(product, cms);
    if (candidate.conflict) {
      plan.conflicts.push({
        code: "product_identity_conflict",
        operationalProductId: String(product.id),
        detail: candidate.conflict,
      });
      continue;
    }
    if (!candidate.match || !candidate.matchedBy) {
      if (product.cmsProductId != null) {
        plan.conflicts.push({
          code: "product_identity_conflict",
          operationalProductId: String(product.id),
          detail: `Operational linkage points to missing CMS product ${product.cmsProductId}.`,
        });
        continue;
      }
      plan.creates.push(createFromOperational(product));
      continue;
    }
    if (candidate.match.sourceType !== product.sourceType) {
      plan.conflicts.push({
        code: "product_identity_conflict",
        operationalProductId: String(product.id),
        detail: `Operational source ${product.sourceType} cannot link to CMS source ${candidate.match.sourceType}.`,
      });
      continue;
    }
    if (
      (candidate.match.operationalProductId != null
        && candidate.match.operationalProductId !== String(product.id))
      || (product.cmsProductId != null && product.cmsProductId !== candidate.match.id)
    ) {
      plan.conflicts.push({
        code: "product_identity_conflict",
        operationalProductId: String(product.id),
        detail: "The matched product has incompatible existing linkage.",
      });
      continue;
    }
    if (claimedCmsIds.has(candidate.match.id)) {
      plan.conflicts.push({
        code: "duplicate_cms_match",
        operationalProductId: String(product.id),
        detail: `CMS product ${candidate.match.id} matches more than one operational product.`,
      });
      continue;
    }
    claimedCmsIds.add(candidate.match.id);
    const variants = matchVariants(product, candidate.match);
    plan.conflicts.push(...variants.conflicts);
    plan.matches.push({
      operationalProductId: String(product.id),
      cmsProductId: candidate.match.id,
      matchedBy: candidate.matchedBy,
      variants: variants.matches,
    });
    if (variants.conflicts.length === 0) {
      const variantLinks = variants.matches.map((match) => {
        const operationalVariant = product.variants.find(({ id }) => String(id) === match.operationalVariantId);
        const cmsVariant = candidate.match?.variants.find(({ id }) => id === match.cmsVariantId);
        return {
          operationalVariantId: match.operationalVariantId,
          cmsVariantId: match.cmsVariantId,
          setCmsOperationalVariantId: cmsVariant?.operationalVariantId == null,
          needsOperationalLink: operationalVariant?.cmsVariantId == null,
        };
      });
      if (
        product.cmsProductId == null
        || candidate.match.operationalProductId == null
        || variantLinks.some(({ setCmsOperationalVariantId, needsOperationalLink }) => (
          setCmsOperationalVariantId || needsOperationalLink
        ))
      ) {
        plan.links.push({
          cmsProductId: candidate.match.id,
          operationalProductId: String(product.id),
          setCmsOperationalProductId: candidate.match.operationalProductId == null,
          variants: variantLinks.map(({ needsOperationalLink: _needsOperationalLink, ...link }) => link),
        });
      }
    }
  }

  plan.links.sort((left, right) => compareStableIds(left.operationalProductId, right.operationalProductId));
  plan.matches.sort((left, right) => compareStableIds(left.operationalProductId, right.operationalProductId));
  return plan;
}

function matchedProducts(
  operational: readonly OperationalCatalogProduct[],
  cms: readonly CmsCatalogProduct[],
) {
  return sortedOperational(operational).map((product) => ({
    product,
    candidate: productCandidates(product, cms).match,
  }));
}

export function reconcileCatalog(
  operational: readonly OperationalCatalogProduct[],
  cms: readonly CmsCatalogProduct[],
): ReconciliationReport {
  const rmsLinkMismatches: ReconciliationReport["rmsLinkMismatches"] = [];
  const skuMismatches: ReconciliationReport["skuMismatches"] = [];
  const priceMismatches: ReconciliationReport["priceMismatches"] = [];
  const imageCountMismatches: ReconciliationReport["imageCountMismatches"] = [];
  const publicationStateMismatches: ReconciliationReport["publicationStateMismatches"] = [];

  for (const { product, candidate } of matchedProducts(operational, cms)) {
    if (!candidate) {
      rmsLinkMismatches.push({
        operationalProductId: String(product.id),
        cmsProductId: product.cmsProductId,
        rmsManageNumber: product.rmsManageNumber,
        reason: "cms_product_missing",
      });
      continue;
    }
    if (
      product.cmsProductId !== candidate.id
      || candidate.operationalProductId !== String(product.id)
      || candidate.rmsManageNumber !== product.rmsManageNumber
    ) {
      rmsLinkMismatches.push({
        operationalProductId: String(product.id),
        cmsProductId: candidate.id,
        rmsManageNumber: candidate.rmsManageNumber,
        reason: "product_link_mismatch",
      });
    }
    if (candidate.images.length !== product.images.length) {
      imageCountMismatches.push({
        operationalProductId: String(product.id),
        operational: product.images.length,
        cms: candidate.images.length,
      });
    }
    const expectedStatus = product.published ? "published" : "draft";
    if (candidate.status !== expectedStatus || candidate.lifecycle !== product.lifecycle) {
      publicationStateMismatches.push({
        operationalProductId: String(product.id),
        operationalPublished: product.published,
        operationalLifecycle: product.lifecycle,
        cmsStatus: candidate.status,
        cmsLifecycle: candidate.lifecycle,
      });
    }

    for (const variant of sortedVariants(product.variants)) {
      const byId = candidate.variants.find((entry) => entry.operationalVariantId === String(variant.id));
      const byRms = variant.rmsSkuNumber
        ? candidate.variants.find((entry) => entry.rmsSkuNumber === variant.rmsSkuNumber)
        : undefined;
      const cmsVariant = byId ?? byRms;
      if (
        !cmsVariant
        || variant.cmsVariantId !== cmsVariant.id
        || cmsVariant.operationalVariantId !== String(variant.id)
        || cmsVariant.rmsSkuNumber !== variant.rmsSkuNumber
        || cmsVariant.sku !== (variant.sku ?? variant.rmsSkuNumber ?? String(variant.id))
      ) {
        skuMismatches.push({
          operationalProductId: String(product.id),
          operationalVariantId: String(variant.id),
          operationalSku: variant.sku,
          operationalRmsSku: variant.rmsSkuNumber,
          cmsVariantId: cmsVariant?.id ?? null,
          cmsSku: cmsVariant?.sku ?? null,
          cmsRmsSku: cmsVariant?.rmsSkuNumber ?? null,
        });
      }
      if (
        cmsVariant
        && (
          cmsVariant.salePriceJpy !== variant.priceJpy
          || cmsVariant.compareAtPriceJpy !== variant.compareAtPriceJpy
        )
      ) {
        priceMismatches.push({
          operationalProductId: String(product.id),
          operationalVariantId: String(variant.id),
          operationalSalePriceJpy: variant.priceJpy,
          cmsSalePriceJpy: cmsVariant.salePriceJpy,
          operationalCompareAtPriceJpy: variant.compareAtPriceJpy,
          cmsCompareAtPriceJpy: cmsVariant.compareAtPriceJpy,
        });
      }
    }
  }

  const operationalVariantCount = operational.reduce((total, product) => total + product.variants.length, 0);
  const cmsVariantCount = cms.reduce((total, product) => total + product.variants.length, 0);
  const productCount = {
    operational: operational.length,
    cms: cms.length,
    matches: operational.length === cms.length,
  };
  const variantCount = {
    operational: operationalVariantCount,
    cms: cmsVariantCount,
    matches: operationalVariantCount === cmsVariantCount,
  };
  const mismatchGroups = [
    rmsLinkMismatches,
    skuMismatches,
    priceMismatches,
    imageCountMismatches,
    publicationStateMismatches,
  ];

  return {
    ok: productCount.matches && variantCount.matches && mismatchGroups.every((group) => group.length === 0),
    productCount,
    variantCount,
    rmsLinkMismatches,
    skuMismatches,
    priceMismatches,
    imageCountMismatches,
    publicationStateMismatches,
  };
}
