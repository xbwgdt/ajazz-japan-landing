import {
  PRODUCT_CATEGORIES,
  type ProductCategoryKey,
} from "../commerce/product-categories";

export type ProductSourceType = "rms" | "manual";
export type InventoryMode = "rms" | "manual";
export type ProductLifecycle = "active" | "unpublished" | "archived";
export type ComparisonEvidenceType =
  | "manufacturer_price"
  | "recent_price"
  | "market_price";

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export const PRODUCT_CATEGORY_KEYS = PRODUCT_CATEGORIES.map(({ key }) => key) as readonly ProductCategoryKey[];

const categoryKeys = new Set<string>(PRODUCT_CATEGORY_KEYS);

export interface EditorialVariantInput {
  operationalVariantId?: string;
  sku: string;
  rmsSkuNumber?: string;
  colorName: string;
  colorSwatch?: string;
  thumbnailId?: string;
  imageId?: string;
  salePriceJpy: number;
  compareAtPriceJpy?: number;
  comparisonEvidenceType?: ComparisonEvidenceType;
  comparisonEvidenceReference?: string;
  comparisonApprovedBy?: string;
  comparisonApprovedAt?: string;
  inventoryMode: InventoryMode;
  active: boolean;
}

export interface EditorialProductInput {
  sourceType: ProductSourceType;
  rmsManageNumber?: string;
  operationalProductId?: string;
  name: string;
  slug: string;
  slugIsUnique: boolean;
  shortStatement?: string;
  category: ProductCategoryKey;
  primaryImageId?: string;
  featured?: boolean;
  merchandisingOrder?: number;
  lifecycle?: ProductLifecycle;
  variants: EditorialVariantInput[];
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validYenPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function addIssue(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message });
}

export function validateProductDraft(input: EditorialProductInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const sourceType = input?.sourceType;
  const variants = Array.isArray(input?.variants) ? input.variants : [];

  if (sourceType !== "rms" && sourceType !== "manual") {
    addIssue(issues, "sourceType", "invalid_source_type", "Select an RMS or manual source.");
  }
  if (sourceType === "rms" && !hasText(input?.rmsManageNumber)) {
    addIssue(issues, "rmsManageNumber", "required", "RMS products require a management number.");
  }
  if (!hasText(input?.name)) {
    addIssue(issues, "name", "required", "A product name is required for publication.");
  }
  if (!hasText(input?.slug)) {
    addIssue(issues, "slug", "required", "A product slug is required for publication.");
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    addIssue(issues, "slug", "invalid_slug", "The slug must use lowercase letters, numbers, and hyphens.");
  }
  if (input?.slugIsUnique === false) {
    addIssue(issues, "slug", "slug_not_unique", "The product slug is already in use.");
  } else if (input?.slugIsUnique !== true) {
    addIssue(issues, "slug", "slug_uniqueness_unverified", "Slug uniqueness must be verified before publication.");
  }
  if (!categoryKeys.has(input?.category)) {
    addIssue(issues, "category", "invalid_category", "Select a canonical storefront category.");
  }
  if (!hasText(input?.primaryImageId)) {
    addIssue(issues, "primaryImageId", "required", "A primary product image is required for publication.");
  }

  const activeVariants = variants.filter((variant) => variant?.active === true);
  if (activeVariants.length === 0) {
    addIssue(issues, "variants", "active_variant_required", "At least one active variant is required.");
  }

  const seenSkus = new Set<string>();
  variants.forEach((variant, index) => {
    const path = `variants.${index}`;
    const normalizedSku = hasText(variant?.sku) ? variant.sku.trim().toLowerCase() : "";

    if (variant?.active && !normalizedSku) {
      addIssue(issues, `${path}.sku`, "required", "Active variants require a SKU.");
    }
    if (normalizedSku && seenSkus.has(normalizedSku)) {
      addIssue(issues, `${path}.sku`, "duplicate_sku", "Variant SKUs must be unique.");
    }
    if (normalizedSku) seenSkus.add(normalizedSku);

    if (variant?.active && !hasText(variant?.colorName)) {
      addIssue(issues, `${path}.colorName`, "required", "Active variants require a color name.");
    }
    if (variant?.active && !validYenPrice(variant?.salePriceJpy)) {
      addIssue(issues, `${path}.salePriceJpy`, "invalid_yen_price", "Sale price must be a positive integer in yen.");
    }

    if (sourceType === "rms") {
      if (!hasText(variant?.rmsSkuNumber)) {
        addIssue(issues, `${path}.rmsSkuNumber`, "required", "RMS variants require an RMS SKU number.");
      }
      if (variant?.inventoryMode !== "rms") {
        addIssue(issues, `${path}.inventoryMode`, "invalid_inventory_authority", "RMS variants must use RMS inventory.");
      }
    }
    if (sourceType === "manual" && variant?.inventoryMode !== "manual") {
      addIssue(issues, `${path}.inventoryMode`, "invalid_inventory_authority", "Manual products must use manual inventory.");
    }

    if (variant?.compareAtPriceJpy !== undefined) {
      if (!validYenPrice(variant.compareAtPriceJpy)) {
        addIssue(issues, `${path}.compareAtPriceJpy`, "invalid_yen_price", "Comparison price must be a positive integer in yen.");
      }
      if (
        validYenPrice(variant.compareAtPriceJpy)
        && validYenPrice(variant.salePriceJpy)
        && variant.compareAtPriceJpy <= variant.salePriceJpy
      ) {
        addIssue(issues, `${path}.compareAtPriceJpy`, "comparison_price_not_higher", "Comparison price must be higher than the sale price.");
      }
      const approvedAt = hasText(variant.comparisonApprovedAt)
        ? Date.parse(variant.comparisonApprovedAt)
        : Number.NaN;
      const validApproval = Boolean(
        variant.comparisonEvidenceType
          && hasText(variant.comparisonEvidenceReference)
          && hasText(variant.comparisonApprovedBy)
          && hasText(variant.comparisonApprovedAt)
          && !Number.isNaN(approvedAt),
      );
      if (!validApproval) {
        addIssue(issues, `${path}.compareAtPriceJpy`, "comparison_price_unapproved", "Comparison prices require complete evidence and approval.");
      }
      if (!Number.isNaN(approvedAt) && approvedAt > Date.now()) {
        addIssue(issues, `${path}.comparisonApprovedAt`, "comparison_approval_in_future", "Comparison price approval cannot be dated in the future.");
      }
    }
  });

  return issues;
}
