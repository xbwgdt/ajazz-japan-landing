import {
  validateProductDraft,
  type ComparisonEvidenceType,
  type EditorialProductInput,
  type InventoryMode,
  type ProductSourceType,
  type ValidationIssue,
} from "./product-schema";

export type PublicationActor = { id: string; email: string };

export type PublishedImage = {
  mediaId: string;
  position: number;
  url: string;
};

export type PublishedVariant = {
  active: boolean;
  cmsVariantId: string;
  colorName: string;
  colorSwatch: string | null;
  compareAtPriceJpy: number | null;
  comparisonApprovedAt: string | null;
  comparisonApprovedBy: string | null;
  comparisonEvidenceReference: string | null;
  comparisonEvidenceType: ComparisonEvidenceType | null;
  imageUrl: string | null;
  inventoryMode: InventoryMode;
  operationalVariantId: string | null;
  priceJpy: number;
  rmsSkuNumber: string | null;
  sku: string;
  thumbnailUrl: string | null;
};

export type PublishedProductSnapshot = {
  category: string;
  cmsProductId: string;
  correlationId: string;
  descriptionHtml: string;
  featured: boolean;
  merchandisingOrder: number;
  name: string;
  revision: number;
  rmsManageNumber: string | null;
  seoDescription: string | null;
  seoTitle: string | null;
  shortStatement: string | null;
  slug: string;
  sourceType: ProductSourceType;
};

export type PublicationAuditInput = {
  action: "publish" | "unpublish";
  actorEmail: string;
  actorId: string;
  cmsProductId: string;
  correlationId: string;
  operationalProductId: string;
  revision: number;
};

export interface PublicationTransaction {
  appendPublicationAudit(event: PublicationAuditInput): Promise<void>;
  assertSlugAvailable(slug: string, cmsProductId: string): Promise<void>;
  disableMissingVariants(productId: string, operationalVariantIds: string[]): Promise<void>;
  replaceImages(productId: string, images: PublishedImage[]): Promise<void>;
  setPublished(
    cmsProductId: string,
    expectedRevision: number,
    published: boolean,
    correlationId: string,
  ): Promise<{ operationalProductId: string; slug: string }>;
  upsertProduct(snapshot: PublishedProductSnapshot): Promise<{ operationalProductId: string }>;
  upsertVariants(productId: string, variants: PublishedVariant[]): Promise<string[]>;
}

export interface PublicationStore {
  transaction<T>(work: (tx: PublicationTransaction) => Promise<T>): Promise<T>;
}

export interface PublicationDraft extends EditorialProductInput {
  descriptionHtml?: string;
  images: PublishedImage[];
  seoDescription?: string;
  seoTitle?: string;
  variants: Array<EditorialProductInput["variants"][number] & {
    cmsVariantId: string;
    imageUrl?: string;
    thumbnailUrl?: string;
  }>;
}

export type PublishProductInput = {
  actor: PublicationActor;
  cmsProductId: string;
  correlationId: string;
  currentRevision: number;
  draft: PublicationDraft;
  expectedRevision: number;
};

export type UnpublishProductInput = Omit<PublishProductInput, "draft">;

export type PublicationResult = {
  cachePaths: string[];
  correlationId: string;
  operationalProductId: string;
  slug: string;
};

export class PublicationValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super("Product draft is not publishable");
    this.name = "PublicationValidationError";
    this.issues = issues;
  }
}

export class PublicationConflictError extends Error {
  readonly code = "stale_publication_revision";
  readonly currentRevision?: number;

  constructor(currentRevision?: number) {
    super("The product revision is stale");
    this.name = "PublicationConflictError";
    this.currentRevision = currentRevision;
  }
}

function assertCurrentRevision(input: { currentRevision: number; expectedRevision: number }) {
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== input.currentRevision) {
    throw new PublicationConflictError(input.currentRevision);
  }
}

function publicationIssues(draft: PublicationDraft): ValidationIssue[] {
  const issues = validateProductDraft(draft);
  const seenPositions = new Set<number>();
  for (const [index, image] of draft.images.entries()) {
    if (!image.url?.trim()) {
      issues.push({ path: `images.${index}.url`, code: "media_url_unresolved", message: "Every publication image must resolve to an active media URL." });
    }
    if (seenPositions.has(image.position)) {
      issues.push({ path: `images.${index}.position`, code: "duplicate_image_position", message: "Image positions must be unique." });
    }
    seenPositions.add(image.position);
  }
  for (const [index, variant] of draft.variants.entries()) {
    if (!variant.cmsVariantId?.trim()) {
      issues.push({ path: `variants.${index}.cmsVariantId`, code: "cms_variant_id_required", message: "Every variant requires a stable CMS identifier." });
    }
  }
  return issues;
}

export async function publishProduct(
  input: PublishProductInput,
  store: PublicationStore,
): Promise<PublicationResult> {
  assertCurrentRevision(input);
  const issues = publicationIssues(input.draft);
  if (issues.length) throw new PublicationValidationError(issues);

  const snapshot: PublishedProductSnapshot = {
    category: input.draft.category,
    cmsProductId: input.cmsProductId,
    correlationId: input.correlationId,
    descriptionHtml: input.draft.descriptionHtml ?? "",
    featured: input.draft.featured ?? false,
    merchandisingOrder: input.draft.merchandisingOrder ?? 0,
    name: input.draft.name,
    revision: input.expectedRevision,
    rmsManageNumber: input.draft.rmsManageNumber?.trim() || null,
    seoDescription: input.draft.seoDescription?.trim() || null,
    seoTitle: input.draft.seoTitle?.trim() || null,
    shortStatement: input.draft.shortStatement?.trim() || null,
    slug: input.draft.slug,
    sourceType: input.draft.sourceType,
  };
  const variants: PublishedVariant[] = input.draft.variants.filter((variant) => variant.active).map((variant) => ({
    active: variant.active,
    cmsVariantId: variant.cmsVariantId,
    colorName: variant.colorName,
    colorSwatch: variant.colorSwatch?.trim() || null,
    compareAtPriceJpy: variant.compareAtPriceJpy ?? null,
    comparisonApprovedAt: variant.comparisonApprovedAt ?? null,
    comparisonApprovedBy: variant.comparisonApprovedBy?.trim() || null,
    comparisonEvidenceReference: variant.comparisonEvidenceReference?.trim() || null,
    comparisonEvidenceType: variant.comparisonEvidenceType ?? null,
    imageUrl: variant.imageUrl?.trim() || null,
    inventoryMode: variant.inventoryMode,
    operationalVariantId: variant.operationalVariantId?.trim() || null,
    priceJpy: variant.salePriceJpy,
    rmsSkuNumber: variant.rmsSkuNumber?.trim() || null,
    sku: variant.sku.trim(),
    thumbnailUrl: variant.thumbnailUrl?.trim() || null,
  }));

  return store.transaction(async (tx) => {
    await tx.assertSlugAvailable(snapshot.slug, snapshot.cmsProductId);
    const { operationalProductId } = await tx.upsertProduct(snapshot);
    await tx.replaceImages(operationalProductId, input.draft.images);
    const operationalVariantIds = await tx.upsertVariants(operationalProductId, variants);
    await tx.disableMissingVariants(operationalProductId, operationalVariantIds);
    await tx.appendPublicationAudit({
      action: "publish",
      actorEmail: input.actor.email,
      actorId: input.actor.id,
      cmsProductId: input.cmsProductId,
      correlationId: input.correlationId,
      operationalProductId,
      revision: input.expectedRevision,
    });
    return {
      cachePaths: ["/", `/products/${snapshot.slug}`],
      correlationId: input.correlationId,
      operationalProductId,
      slug: snapshot.slug,
    };
  });
}

export async function unpublishProduct(
  input: UnpublishProductInput,
  store: PublicationStore,
): Promise<void> {
  assertCurrentRevision(input);
  await store.transaction(async (tx) => {
    const product = await tx.setPublished(input.cmsProductId, input.expectedRevision, false, input.correlationId);
    await tx.appendPublicationAudit({
      action: "unpublish",
      actorEmail: input.actor.email,
      actorId: input.actor.id,
      cmsProductId: input.cmsProductId,
      correlationId: input.correlationId,
      operationalProductId: product.operationalProductId,
      revision: input.expectedRevision,
    });
  });
}
