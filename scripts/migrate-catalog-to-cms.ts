import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import {
  planCatalogMigration,
  reconcileCatalog,
  type CatalogMigrationCreate,
  type CatalogMigrationLink,
  type CmsCatalogProduct,
  type OperationalCatalogProduct,
} from "../lib/cms/catalog-migration";

const APPLY_CONFIRMATION = "AJAZZ_CATALOG_2026";
const BATCH_SIZE = 25;

export type CatalogMigrationMode = "apply" | "dry-run" | "help" | "reconcile";

export interface CatalogMigrationArguments {
  mode: CatalogMigrationMode;
  jsonPath?: string;
}

export interface CatalogMigrationCheckpoint {
  version: 1;
  runId: string;
  planFingerprint: string;
  status: "completed" | "running";
  completedOperationalProductIds: string[];
  linkedCmsProductIds: Record<string, string>;
  updatedAt: string;
}

export interface CatalogMigrationExecutionDependencies {
  arguments: CatalogMigrationArguments;
  environment: Record<string, string | undefined>;
  loadCatalogs: () => Promise<{
    operational: OperationalCatalogProduct[];
    cms: CmsCatalogProduct[];
    publishedCms?: CmsCatalogProduct[];
  }>;
  createCmsProduct?: (create: CatalogMigrationCreate) => Promise<CatalogMigrationLink>;
  linkCatalogIdentities?: (link: CatalogMigrationLink) => Promise<void>;
  readCheckpoint?: (path: string) => Promise<CatalogMigrationCheckpoint | null>;
  writeCheckpoint?: (checkpoint: CatalogMigrationCheckpoint, path: string) => Promise<void>;
  writeOutput?: (path: string, output: unknown) => Promise<void>;
  createRunId?: () => string;
  now?: () => Date;
}

export interface CatalogMigrationExecutionResult {
  artifact: "ajazz-catalog-migration/v1";
  exitCode: number;
  mode: CatalogMigrationMode;
  planFingerprint: string;
  plan?: ReturnType<typeof planCatalogMigration>;
  reconciliation?: ReturnType<typeof reconcileCatalog>;
  summary?: {
    batches: number;
    created: number;
    linked: number;
    resumed: number;
    runId: string;
  };
}

function usage(): string {
  return [
    "AJAZZ catalog to CMS migration",
    "",
    "Usage:",
    "  pnpm cms:migrate-catalog -- [--json C:\\absolute\\report.json]",
    "  pnpm cms:migrate-catalog -- --apply --json C:\\absolute\\checkpoint.json",
    "  pnpm cms:migrate-catalog -- --reconcile [--json C:\\absolute\\report.json]",
    "  pnpm cms:migrate-catalog -- --help",
    "",
    "The default mode is a read-only dry run. Apply requires:",
    `  CMS_MIGRATION_CONFIRM=${APPLY_CONFIRMATION}`,
  ].join("\n");
}

export function parseCatalogMigrationArguments(argv: readonly string[]): CatalogMigrationArguments {
  let mode: CatalogMigrationMode = "dry-run";
  let jsonPath: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--") continue;
    if (argument === "--help" || argument === "-h") {
      if (mode !== "dry-run") throw new Error("Only one migration mode may be selected.");
      mode = "help";
      continue;
    }
    if (argument === "--apply" || argument === "--reconcile") {
      if (mode !== "dry-run") throw new Error("Only one migration mode may be selected.");
      mode = argument === "--apply" ? "apply" : "reconcile";
      continue;
    }
    if (argument === "--json") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--json requires an absolute path.");
      if (!isAbsolute(value)) throw new Error("--json requires an absolute path.");
      if (!value.toLowerCase().endsWith(".json")) throw new Error("--json requires a .json file.");
      jsonPath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (mode === "apply" && !jsonPath) {
    throw new Error("--apply requires --json with an absolute checkpoint path.");
  }
  return { mode, ...(jsonPath ? { jsonPath } : {}) };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

function fingerprintMigrationSource(operational: readonly OperationalCatalogProduct[]): string {
  const stableSource = [...operational]
    .sort((left, right) => compareIds(String(left.id), String(right.id)))
    .map(({ cmsProductId: _linkageMayChangeDuringApply, variants, ...product }) => ({
      ...product,
      variants: variants.map(({ cmsVariantId: _variantLinkageMayChangeDuringApply, ...variant }) => variant),
    }));
  return createHash("sha256").update(JSON.stringify(canonicalize(stableSource))).digest("hex");
}

function compareIds(left: string, right: string): number {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : Number.NaN;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : Number.NaN;
  if (Number.isSafeInteger(leftNumber) && Number.isSafeInteger(rightNumber)) return leftNumber - rightNumber;
  return left.localeCompare(right, "en");
}

function assertCheckpoint(value: unknown): CatalogMigrationCheckpoint | null {
  if (!value || typeof value !== "object") return null;
  const checkpoint = value as Partial<CatalogMigrationCheckpoint>;
  const linkedEntries = checkpoint.linkedCmsProductIds && typeof checkpoint.linkedCmsProductIds === "object"
    && !Array.isArray(checkpoint.linkedCmsProductIds)
    ? Object.entries(checkpoint.linkedCmsProductIds)
    : [];
  if (
    checkpoint.version !== 1
    || typeof checkpoint.runId !== "string"
    || typeof checkpoint.planFingerprint !== "string"
    || (checkpoint.status !== "running" && checkpoint.status !== "completed")
    || !Array.isArray(checkpoint.completedOperationalProductIds)
    || checkpoint.completedOperationalProductIds.some((id) => typeof id !== "string" || !id)
    || new Set(checkpoint.completedOperationalProductIds).size !== checkpoint.completedOperationalProductIds.length
    || !checkpoint.linkedCmsProductIds
    || typeof checkpoint.linkedCmsProductIds !== "object"
    || Array.isArray(checkpoint.linkedCmsProductIds)
    || linkedEntries.some(([operationalId, cmsId]) => !operationalId || typeof cmsId !== "string" || !cmsId)
    || checkpoint.completedOperationalProductIds.some((id) => !linkedEntries.some(([linkedId]) => linkedId === id))
    || typeof checkpoint.updatedAt !== "string"
  ) return null;
  return checkpoint as CatalogMigrationCheckpoint;
}

export async function executeCatalogMigration(
  dependencies: CatalogMigrationExecutionDependencies,
): Promise<CatalogMigrationExecutionResult> {
  if (dependencies.arguments.mode === "help") {
    return { artifact: "ajazz-catalog-migration/v1", exitCode: 0, mode: "help", planFingerprint: "" };
  }

  if (
    dependencies.arguments.mode === "apply"
    && dependencies.environment.CMS_MIGRATION_CONFIRM !== APPLY_CONFIRMATION
  ) {
    throw new Error(`--apply requires CMS_MIGRATION_CONFIRM=${APPLY_CONFIRMATION}.`);
  }

  const catalogs = await dependencies.loadCatalogs();
  const plan = planCatalogMigration(catalogs.operational, catalogs.cms);
  const planFingerprint = fingerprintMigrationSource(catalogs.operational);

  if (dependencies.arguments.mode === "reconcile") {
    const reconciliation = reconcileCatalog(
      catalogs.operational,
      catalogs.publishedCms ?? catalogs.cms,
    );
    const result: CatalogMigrationExecutionResult = {
      artifact: "ajazz-catalog-migration/v1",
      exitCode: reconciliation.ok ? 0 : 1,
      mode: "reconcile",
      planFingerprint,
      reconciliation,
    };
    if (dependencies.arguments.jsonPath && dependencies.writeOutput) {
      await dependencies.writeOutput(dependencies.arguments.jsonPath, result);
    }
    return result;
  }

  if (dependencies.arguments.mode === "dry-run") {
    const result: CatalogMigrationExecutionResult = {
      artifact: "ajazz-catalog-migration/v1",
      exitCode: plan.conflicts.length === 0 ? 0 : 2,
      mode: "dry-run",
      planFingerprint,
      plan,
    };
    if (dependencies.arguments.jsonPath && dependencies.writeOutput) {
      await dependencies.writeOutput(dependencies.arguments.jsonPath, result);
    }
    return result;
  }

  if (plan.conflicts.length > 0) {
    throw new Error("Migration plan contains identity conflicts; apply is blocked.");
  }
  if (!dependencies.arguments.jsonPath) throw new Error("Apply checkpoint path is required.");
  if (!dependencies.createCmsProduct || !dependencies.linkCatalogIdentities) {
    throw new Error("Apply dependencies are not configured.");
  }

  const now = dependencies.now ?? (() => new Date());
  const readCheckpoint = dependencies.readCheckpoint ?? (async () => null);
  const writeCheckpoint = dependencies.writeCheckpoint ?? (async () => undefined);
  const checkpointValue = await readCheckpoint(dependencies.arguments.jsonPath);
  const previous = checkpointValue === null ? null : assertCheckpoint(checkpointValue);
  if (checkpointValue !== null && !previous) {
    throw new Error("The saved migration checkpoint is invalid.");
  }
  if (previous) {
    for (const [operationalProductId, cmsProductId] of Object.entries(previous.linkedCmsProductIds)) {
      const operational = catalogs.operational.find(({ id }) => String(id) === operationalProductId);
      const cmsProduct = catalogs.cms.find(({ id }) => id === cmsProductId);
      const currentMatch = plan.matches.find((match) => match.operationalProductId === operationalProductId);
      if (
        !operational
        || !cmsProduct
        || (operational.cmsProductId != null && operational.cmsProductId !== cmsProductId)
        || (cmsProduct.operationalProductId != null && cmsProduct.operationalProductId !== operationalProductId)
        || (currentMatch != null && currentMatch.cmsProductId !== cmsProductId)
        || (
          cmsProduct.operationalProductId == null
          && (operational.rmsManageNumber == null || cmsProduct.rmsManageNumber !== operational.rmsManageNumber)
        )
      ) {
        throw new Error(`The saved checkpoint CMS linkage is invalid for ${operationalProductId}.`);
      }
    }
  }
  if (previous && previous.planFingerprint !== planFingerprint) {
    throw new Error("The saved checkpoint does not match the current migration plan.");
  }

  const checkpoint: CatalogMigrationCheckpoint = previous ?? {
    version: 1,
    runId: dependencies.createRunId?.() ?? randomUUID(),
    planFingerprint,
    status: "running",
    completedOperationalProductIds: [],
    linkedCmsProductIds: {},
    updatedAt: now().toISOString(),
  };
  const completed = new Set(checkpoint.completedOperationalProductIds);
  const createById = new Map(plan.creates.map((create) => [create.operationalProductId, create]));
  const existingLinkById = new Map(plan.links.map((link) => [link.operationalProductId, link]));
  const operationalIds = [...new Set([...createById.keys(), ...existingLinkById.keys()])].sort(compareIds);
  let created = 0;
  let linked = 0;
  let resumed = 0;
  let batches = 0;

  checkpoint.status = "running";
  checkpoint.updatedAt = now().toISOString();
  await writeCheckpoint(checkpoint, dependencies.arguments.jsonPath);

  for (let offset = 0; offset < operationalIds.length; offset += BATCH_SIZE) {
    const batch = operationalIds.slice(offset, offset + BATCH_SIZE);
    batches += 1;
    for (const operationalProductId of batch) {
      if (completed.has(operationalProductId)) {
        const currentLink = existingLinkById.get(operationalProductId);
        const cmsProductId = checkpoint.linkedCmsProductIds[operationalProductId]
          ?? currentLink?.cmsProductId;
        if (!cmsProductId) {
          throw new Error(`Completed checkpoint is missing CMS linkage for ${operationalProductId}.`);
        }
        if (currentLink) await dependencies.linkCatalogIdentities(currentLink);
        linked += 1;
        resumed += 1;
        continue;
      }

      let link = existingLinkById.get(operationalProductId);
      let cmsProductId = checkpoint.linkedCmsProductIds[operationalProductId]
        ?? link?.cmsProductId;
      if (!cmsProductId) {
        const create = createById.get(operationalProductId);
        if (!create) throw new Error(`Missing create plan for operational product ${operationalProductId}.`);
        link = await dependencies.createCmsProduct(create);
        cmsProductId = link.cmsProductId;
        checkpoint.linkedCmsProductIds[operationalProductId] = cmsProductId;
        checkpoint.updatedAt = now().toISOString();
        await writeCheckpoint(checkpoint, dependencies.arguments.jsonPath);
        created += 1;
      } else {
        checkpoint.linkedCmsProductIds[operationalProductId] = cmsProductId;
      }

      if (!link) {
        throw new Error(`The current migration plan has no identity link for ${operationalProductId}.`);
      }
      if (link.cmsProductId !== cmsProductId) {
        throw new Error(`Checkpoint CMS linkage conflicts with the current plan for ${operationalProductId}.`);
      }
      await dependencies.linkCatalogIdentities(link);
      linked += 1;
      completed.add(operationalProductId);
      checkpoint.completedOperationalProductIds = [...completed].sort(compareIds);
      checkpoint.updatedAt = now().toISOString();
      await writeCheckpoint(checkpoint, dependencies.arguments.jsonPath);
    }
  }

  checkpoint.status = "completed";
  checkpoint.updatedAt = now().toISOString();
  await writeCheckpoint(checkpoint, dependencies.arguments.jsonPath);

  return {
    artifact: "ajazz-catalog-migration/v1",
    exitCode: 0,
    mode: "apply",
    planFingerprint,
    summary: { batches, created, linked, resumed, runId: checkpoint.runId },
  };
}

type SqlRow = Record<string, unknown>;
type PayloadLike = {
  config: Record<string, unknown>;
  create(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  find(args: Record<string, unknown>): Promise<{ docs: Record<string, unknown>[]; hasNextPage?: boolean; nextPage?: number | null }>;
  findByID?(args: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(args: Record<string, unknown>): Promise<Record<string, unknown>>;
};

type MigrationSql = {
  <T extends readonly unknown[] = readonly unknown[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  begin<T>(callback: (sql: MigrationSql) => Promise<T>): Promise<T>;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function safeInteger(value: unknown, label: string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`Invalid ${label}.`);
  return parsed;
}

function relationRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function relationUrl(value: unknown): string | null {
  return stringOrNull(relationRecord(value)?.url);
}

function relationId(value: unknown): string | null {
  if (typeof value === "number" || typeof value === "string") return String(value);
  const id = relationRecord(value)?.id;
  return typeof id === "number" || typeof id === "string" ? String(id) : null;
}

export async function loadAllCmsProducts(
  payload: PayloadLike,
  draft = true,
): Promise<CmsCatalogProduct[]> {
  const { convertLexicalToHTML } = await import("@payloadcms/richtext-lexical/html");
  const products: Record<string, unknown>[] = [];
  let page = 1;
  do {
    const result = await payload.find({
      collection: "products",
      depth: 1,
      draft,
      limit: 100,
      overrideAccess: true,
      page,
      sort: "id",
    });
    products.push(...result.docs);
    if (!result.hasNextPage || !result.nextPage) break;
    page = result.nextPage;
  } while (true);

  return products.map((product): CmsCatalogProduct => {
    const variants = Array.isArray(product.variants) ? product.variants as Record<string, unknown>[] : [];
    const imageRelations = [
      product.primaryImageId,
      ...(Array.isArray(product.galleryImageIds) ? product.galleryImageIds : []),
      ...(Array.isArray(product.sceneImageIds) ? product.sceneImageIds : []),
    ];
    const images = imageRelations
      .map((value, position) => ({ url: relationUrl(value), position }))
      .filter((image): image is { url: string; position: number } => image.url !== null);
    const descriptionHtml = product.description && typeof product.description === "object"
      ? convertLexicalToHTML({ data: product.description as never, disableContainer: true })
      : "";
    return {
      id: String(product.id),
      operationalProductId: stringOrNull(product.operationalProductId),
      sourceType: product.sourceType === "manual" ? "manual" : "rms",
      rmsManageNumber: stringOrNull(product.rmsManageNumber),
      slug: String(product.slug ?? ""),
      name: String(product.name ?? ""),
      descriptionHtml,
      category: String(product.category ?? "other"),
      shortStatement: stringOrNull(product.shortStatement),
      seoTitle: stringOrNull(product.seoTitle),
      seoDescription: stringOrNull(product.seoDescription),
      featured: product.featured === true,
      merchandisingOrder: Number(product.merchandisingOrder ?? 0),
      lifecycle: product.lifecycle === "active" || product.lifecycle === "archived" ? product.lifecycle : "unpublished",
      status: product._status === "published" ? "published" : "draft",
      publicationRevision: Number(product.lastPublishedRevision ?? product.editorialRevision ?? 0),
      images,
      variants: variants.map((variant) => ({
        id: String(variant.id),
        operationalVariantId: stringOrNull(variant.operationalVariantId),
        sku: String(variant.sku ?? ""),
        rmsSkuNumber: stringOrNull(variant.rmsSkuNumber),
        inventoryMode: variant.inventoryMode === "manual" ? "manual" : "rms",
        salePriceJpy: Number(variant.salePriceJpy),
        compareAtPriceJpy: variant.compareAtPriceJpy == null ? null : Number(variant.compareAtPriceJpy),
        comparisonEvidenceType: variant.comparisonEvidenceType === "manufacturer_price"
          || variant.comparisonEvidenceType === "market_price"
          || variant.comparisonEvidenceType === "recent_price"
          ? variant.comparisonEvidenceType
          : null,
        comparisonEvidenceReference: stringOrNull(variant.comparisonEvidenceReference),
        comparisonApprovedBy: relationId(variant.comparisonApprovedBy),
        comparisonApprovedAt: stringOrNull(variant.comparisonApprovedAt),
        colorName: String(variant.colorName ?? ""),
        colorSwatch: stringOrNull(variant.colorSwatch),
        thumbnailUrl: relationUrl(variant.thumbnailId),
        imageUrl: relationUrl(variant.imageId),
        active: variant.active === true,
      })),
    };
  });
}

export function reconciliationCmsProducts(
  latest: readonly CmsCatalogProduct[],
  published: readonly CmsCatalogProduct[],
  operational: readonly OperationalCatalogProduct[] = [],
): CmsCatalogProduct[] {
  const publishedById = new Map(published.map((product) => [product.id, product]));
  return latest.map((latestProduct) => {
    const publishedProduct = publishedById.get(latestProduct.id);
    const operationalProduct = operational.find((product) => (
      String(product.id) === latestProduct.operationalProductId
      || (product.rmsManageNumber != null && product.rmsManageNumber === latestProduct.rmsManageNumber)
    ));
    if (!publishedProduct || operationalProduct?.published !== true) return latestProduct;
    return {
      ...publishedProduct,
      operationalProductId: latestProduct.operationalProductId,
      rmsManageNumber: latestProduct.rmsManageNumber,
      sourceType: latestProduct.sourceType,
      variants: publishedProduct.variants.map((publishedVariant) => {
        const identity = latestProduct.variants.find((candidate) => (
          candidate.id === publishedVariant.id
          || (
            candidate.operationalVariantId != null
            && candidate.operationalVariantId === publishedVariant.operationalVariantId
          )
          || (
            candidate.rmsSkuNumber != null
            && candidate.rmsSkuNumber === publishedVariant.rmsSkuNumber
          )
        ));
        return identity ? {
          ...publishedVariant,
          id: identity.id,
          operationalVariantId: identity.operationalVariantId,
          rmsSkuNumber: identity.rmsSkuNumber,
          inventoryMode: identity.inventoryMode,
        } : publishedVariant;
      }),
    };
  });
}

async function loadOperationalProducts(database: unknown): Promise<OperationalCatalogProduct[]> {
  const sql = database as (strings: TemplateStringsArray, ...values: unknown[]) => Promise<SqlRow[]>;
  const [productRows, variantRows, imageRows] = await Promise.all([
    sql`SELECT * FROM public.products ORDER BY id`,
    sql`SELECT * FROM public.product_variants ORDER BY product_id, id`,
    sql`SELECT * FROM public.product_images ORDER BY product_id, position, id`,
  ]);
  const variantsByProduct = new Map<string, OperationalCatalogProduct["variants"]>();
  for (const row of variantRows) {
    const productId = String(row.product_id);
    const variants = variantsByProduct.get(productId) ?? [];
    variants.push({
      id: safeInteger(row.id, "operational variant ID"),
      cmsVariantId: stringOrNull(row.cms_variant_id),
      sku: stringOrNull(row.sku),
      rmsSkuNumber: stringOrNull(row.rms_sku_number),
      inventoryMode: row.inventory_mode === "manual" ? "manual" : "rms",
      priceJpy: safeInteger(row.price_jpy, "sale price"),
      compareAtPriceJpy: row.compare_at_price_jpy == null ? null : safeInteger(row.compare_at_price_jpy, "comparison price"),
      comparisonEvidenceType: row.comparison_evidence_type === "manufacturer_price"
        || row.comparison_evidence_type === "market_price"
        || row.comparison_evidence_type === "recent_price"
        ? row.comparison_evidence_type
        : null,
      comparisonEvidenceReference: stringOrNull(row.comparison_evidence_reference),
      comparisonApprovedBy: stringOrNull(row.comparison_approved_by),
      comparisonApprovedAt: row.comparison_approved_at instanceof Date
        ? row.comparison_approved_at.toISOString()
        : stringOrNull(row.comparison_approved_at),
      colorName: stringOrNull(row.color_name),
      colorSwatch: stringOrNull(row.color_swatch),
      thumbnailUrl: stringOrNull(row.thumbnail_url),
      imageUrl: stringOrNull(row.image_url),
      active: row.active === true,
    });
    variantsByProduct.set(productId, variants);
  }
  const imagesByProduct = new Map<string, OperationalCatalogProduct["images"]>();
  for (const row of imageRows) {
    const productId = String(row.product_id);
    const images = imagesByProduct.get(productId) ?? [];
    images.push({
      id: safeInteger(row.id, "operational image ID"),
      url: String(row.url),
      position: safeInteger(row.position, "image position"),
    });
    imagesByProduct.set(productId, images);
  }
  return productRows.map((row): OperationalCatalogProduct => {
    const id = safeInteger(row.id, "operational product ID");
    return {
      id,
      cmsProductId: stringOrNull(row.cms_product_id),
      sourceType: row.source_type === "manual" ? "manual" : "rms",
      rmsManageNumber: stringOrNull(row.rms_manage_number),
      slug: String(row.slug),
      name: String(row.name),
      descriptionHtml: String(row.description_html ?? ""),
      category: String(row.category ?? "other"),
      shortStatement: stringOrNull(row.short_statement),
      seoTitle: stringOrNull(row.seo_title),
      seoDescription: stringOrNull(row.seo_description),
      featured: row.featured === true,
      merchandisingOrder: Number(row.merchandising_order ?? 0),
      lifecycle: row.lifecycle === "active" || row.lifecycle === "archived" ? row.lifecycle : "unpublished",
      published: row.published === true,
      publicationRevision: Number(row.publication_revision ?? 0),
      images: imagesByProduct.get(String(id)) ?? [],
      variants: variantsByProduct.get(String(id)) ?? [],
    };
  });
}

async function lexicalDescription(payload: PayloadLike, html: string): Promise<unknown> {
  if (!html.trim()) return undefined;
  const [{ convertHTMLToLexical }, { Window }] = await Promise.all([
    import("@payloadcms/richtext-lexical"),
    import("happy-dom"),
  ]);
  class DomAdapter {
    window: { document: Document };

    constructor(markup: string) {
      const window = new Window();
      window.document.write(markup);
      this.window = window as unknown as { document: Document };
    }
  }
  return convertHTMLToLexical({
    editorConfig: payload.config.editor as never,
    html,
    JSDOM: DomAdapter,
  });
}

async function uploadCatalogImage(payload: PayloadLike, url: string, alt: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Unable to fetch catalog image (${response.status}).`);
  const data = Buffer.from(await response.arrayBuffer());
  const contentHash = createHash("sha256").update(data).digest("hex");
  const existing = await payload.find({
    collection: "media",
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: { contentHash: { equals: contentHash } },
  });
  if (existing.docs[0]?.id != null) return String(existing.docs[0].id);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  const mimetype = contentType === "image/png" || contentType === "image/webp" ? contentType : "image/jpeg";
  const extension = mimetype === "image/png" ? "png" : mimetype === "image/webp" ? "webp" : "jpg";
  const created = await payload.create({
    collection: "media",
    data: { alt, purpose: "product" },
    file: { data, mimetype, name: `catalog-migration-${contentHash}.${extension}`, size: data.length },
    overrideAccess: true,
  });
  return String(created.id);
}

export async function createCmsProductBaseline(
  create: CatalogMigrationCreate,
  dependencies: {
    actor: Record<string, unknown>;
    contexts: {
      draftSave: Record<PropertyKey, unknown>;
      publication: Record<PropertyKey, unknown>;
      sourceIngestion: Record<PropertyKey, unknown>;
    };
    convertDescription: (html: string) => Promise<unknown>;
    now: () => Date;
    payload: PayloadLike;
    uploadImage: (url: string, alt: string) => Promise<string>;
  },
): Promise<CatalogMigrationLink> {
  const existing = await dependencies.payload.find({
    collection: "products",
    depth: 0,
    draft: true,
    limit: 2,
    overrideAccess: true,
    where: {
      or: [
        { operationalProductId: { equals: create.operationalProductId } },
        ...(create.rmsManageNumber ? [{ rmsManageNumber: { equals: create.rmsManageNumber } }] : []),
      ],
    },
  });
  if (existing.docs.length > 1) throw new Error(`Ambiguous CMS identity for ${create.operationalProductId}.`);
  if (existing.docs[0]?.id != null) {
    const document = existing.docs[0];
    if (create.status === "published" && document._status === "published") {
      const draft = await dependencies.payload.update({
        collection: "products",
        context: {
          expectedRevision: Number(document.editorialRevision ?? 0),
          ...dependencies.contexts.draftSave,
        },
        data: { _status: "draft" },
        draft: true,
        id: document.id,
        overrideAccess: true,
        user: dependencies.actor,
      });
      return migrationLinkFromCmsDocument(create, draft);
    }
    return migrationLinkFromCmsDocument(create, document);
  }

  const urls = [...new Set([
    ...create.images.map(({ url }) => url),
    ...create.variants.flatMap(({ thumbnailUrl, imageUrl }) => [thumbnailUrl, imageUrl].filter(Boolean) as string[]),
  ])];
  const mediaByUrl = new Map<string, string>();
  for (const url of urls) {
    mediaByUrl.set(url, await dependencies.uploadImage(url, create.name));
  }
  const orderedImages = [...create.images].sort((left, right) => left.position - right.position);
  const description = await dependencies.convertDescription(create.descriptionHtml);
  const timestamp = dependencies.now().toISOString();
  const sourceSnapshot = {
    operationalProductId: create.operationalProductId,
    rmsManageNumber: create.rmsManageNumber,
    descriptionHtml: create.descriptionHtml,
    images: create.images,
    variants: create.variants,
    publicationRevision: create.publicationRevision,
    publicationStatus: create.status,
  };
  const data = {
    sourceType: create.sourceType,
    rmsManageNumber: create.rmsManageNumber,
    operationalProductId: create.operationalProductId,
    sourceSnapshot,
    sourceUpdatedAt: timestamp,
    name: create.name,
    slug: create.slug,
    shortStatement: create.shortStatement,
    ...(description ? { description } : {}),
    category: create.category,
    lifecycle: create.lifecycle,
    featured: create.featured,
    merchandisingOrder: create.merchandisingOrder,
    primaryImageId: orderedImages[0] ? mediaByUrl.get(orderedImages[0].url) : undefined,
    galleryImageIds: orderedImages.slice(1).map(({ url }) => mediaByUrl.get(url)).filter(Boolean),
    variants: create.variants.map((variant) => ({
      operationalVariantId: variant.operationalVariantId,
      sku: variant.sku,
      rmsSkuNumber: variant.rmsSkuNumber,
      colorName: variant.colorName,
      colorSwatch: variant.colorSwatch,
      thumbnailId: variant.thumbnailUrl ? mediaByUrl.get(variant.thumbnailUrl) : undefined,
      imageId: variant.imageUrl ? mediaByUrl.get(variant.imageUrl) : undefined,
      salePriceJpy: variant.salePriceJpy,
      compareAtPriceJpy: variant.compareAtPriceJpy,
      comparisonEvidenceType: variant.comparisonEvidenceType,
      comparisonEvidenceReference: variant.comparisonEvidenceReference,
      comparisonApprovedBy: variant.comparisonApprovedBy,
      comparisonApprovedAt: variant.comparisonApprovedAt,
      inventoryMode: variant.inventoryMode,
      active: variant.active,
    })),
    seoTitle: create.seoTitle,
    seoDescription: create.seoDescription,
    _status: create.status,
    ...(create.status === "published" ? {
      lastPublishedAt: timestamp,
      lastPublishedRevision: 1,
      lastPublishedBy: dependencies.actor.id,
    } : {}),
  };
  const created = await dependencies.payload.create({
    collection: "products",
    context: { ...dependencies.contexts.publication, ...dependencies.contexts.sourceIngestion },
    data,
    draft: create.status !== "published",
    overrideAccess: true,
    user: dependencies.actor,
  });
  if (create.status === "published") {
    const publishedVariants = Array.isArray(created.variants) ? created.variants : data.variants;
    await dependencies.payload.update({
      collection: "products",
      context: {
        expectedRevision: 1,
        ...dependencies.contexts.draftSave,
        ...dependencies.contexts.sourceIngestion,
      },
      data: { ...data, variants: publishedVariants, _status: "draft" },
      draft: true,
      id: created.id,
      overrideAccess: true,
      user: dependencies.actor,
    });
  }
  return migrationLinkFromCmsDocument(create, created);
}

function migrationLinkFromCmsDocument(
  create: CatalogMigrationCreate,
  document: Record<string, unknown>,
): CatalogMigrationLink {
  if (document.id == null) throw new Error(`CMS product identity is missing for ${create.operationalProductId}.`);
  const sourceType = document.sourceType;
  const operationalProductId = stringOrNull(document.operationalProductId);
  const rmsManageNumber = stringOrNull(document.rmsManageNumber);
  if (
    (sourceType != null && sourceType !== create.sourceType)
    || (operationalProductId != null && operationalProductId !== create.operationalProductId)
    || (create.rmsManageNumber != null && rmsManageNumber != null && rmsManageNumber !== create.rmsManageNumber)
  ) {
    throw new Error(`CMS product identity conflicts with ${create.operationalProductId}.`);
  }

  const cmsVariants = Array.isArray(document.variants)
    ? document.variants as Record<string, unknown>[]
    : [];
  const variants = create.variants.map((variant) => {
    const matches = cmsVariants.filter((candidate) => (
      stringOrNull(candidate.operationalVariantId) === variant.operationalVariantId
      || (variant.rmsSkuNumber != null && stringOrNull(candidate.rmsSkuNumber) === variant.rmsSkuNumber)
    ));
    if (matches.length !== 1 || matches[0].id == null) {
      throw new Error(`CMS variant identity is incomplete for ${variant.operationalVariantId}.`);
    }
    const existingOperationalId = stringOrNull(matches[0].operationalVariantId);
    if (existingOperationalId != null && existingOperationalId !== variant.operationalVariantId) {
      throw new Error(`CMS variant identity conflicts with ${variant.operationalVariantId}.`);
    }
    return {
      operationalVariantId: variant.operationalVariantId,
      cmsVariantId: String(matches[0].id),
      setCmsOperationalVariantId: existingOperationalId == null,
    };
  });
  return {
    operationalProductId: create.operationalProductId,
    cmsProductId: String(document.id),
    setCmsOperationalProductId: operationalProductId == null,
    variants,
  };
}

async function createDefaultRuntime() {
  const [{ commerceSql }, { getPayload }, { default: config }, contexts] = await Promise.all([
    import("../lib/commerce/db"),
    import("payload"),
    import("../payload.config"),
    import("../cms/hooks/protectSourceFields"),
  ]);
  const database = commerceSql();
  const payload = await getPayload({ config }) as unknown as PayloadLike;
  let actorPromise: Promise<Record<string, unknown>> | undefined;
  const migrationActor = () => {
    actorPromise ??= payload.find({
      collection: "admins",
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: { email: { equals: "xiet@a-jazz.com" } },
    }).then(({ docs }) => {
      const actor = docs[0];
      if (!actor?.id) throw new Error("Migration administrator is not configured.");
      return actor;
    });
    return actorPromise;
  };

  return {
    async loadCatalogs() {
      const [operational, cms, published] = await Promise.all([
        loadOperationalProducts(database),
        loadAllCmsProducts(payload, true),
        loadAllCmsProducts(payload, false),
      ]);
      return { operational, cms, publishedCms: reconciliationCmsProducts(cms, published, operational) };
    },
    async createCmsProduct(create: CatalogMigrationCreate) {
      const actor = await migrationActor();
      return createCmsProductBaseline(create, {
        actor,
        contexts: {
          draftSave: contexts.productDraftSaveContext,
          publication: contexts.productPublicationContext,
          sourceIngestion: contexts.productRmsSourceIngestionContext,
        },
        convertDescription: (html) => lexicalDescription(payload, html),
        now: () => new Date(),
        payload,
        uploadImage: (url, alt) => uploadCatalogImage(payload, url, alt),
      });
    },
    async linkCatalogIdentities(link: CatalogMigrationLink) {
      if (link.setCmsOperationalProductId || link.variants.some(({ setCmsOperationalVariantId }) => setCmsOperationalVariantId)) {
        if (!payload.findByID) throw new Error("Payload product identity lookup is unavailable.");
        const actor = await migrationActor();
        const current = await payload.findByID({
          collection: "products",
          depth: 0,
          draft: true,
          id: link.cmsProductId,
          overrideAccess: true,
        });
        const currentVariants = Array.isArray(current.variants)
          ? current.variants as Record<string, unknown>[]
          : [];
        const variants = currentVariants.map((variant) => {
          const identity = link.variants.find(({ cmsVariantId }) => String(variant.id) === cmsVariantId);
          if (!identity?.setCmsOperationalVariantId) return variant;
          return { ...variant, operationalVariantId: identity.operationalVariantId };
        });
        for (const identity of link.variants.filter(({ setCmsOperationalVariantId }) => setCmsOperationalVariantId)) {
          if (!currentVariants.some((variant) => String(variant.id) === identity.cmsVariantId)) {
            throw new Error(`CMS variant ${identity.cmsVariantId} is missing during linkage.`);
          }
        }
        await payload.update({
          collection: "products",
          context: {
            expectedRevision: Number(current.editorialRevision ?? 0),
            ...contexts.productRmsSourceIngestionContext,
          },
          data: {
            ...(link.setCmsOperationalProductId ? { operationalProductId: link.operationalProductId } : {}),
            variants,
          },
          draft: true,
          id: link.cmsProductId,
          overrideAccess: true,
          user: actor,
        });
      }

      const client = database as unknown as MigrationSql;
      await client.begin(async (sql) => {
        const productRows = await sql<Array<{ id: number }>>`
          UPDATE public.products
          SET cms_product_id = ${link.cmsProductId}
          WHERE id = ${Number(link.operationalProductId)}
            AND (cms_product_id IS NULL OR cms_product_id = ${link.cmsProductId})
          RETURNING id
        `;
        if (!productRows[0]) throw new Error(`Operational linkage conflict for ${link.operationalProductId}.`);
        for (const variant of link.variants) {
          const variantRows = await sql<Array<{ id: number }>>`
            UPDATE public.product_variants
            SET cms_variant_id = ${variant.cmsVariantId}
            WHERE id = ${Number(variant.operationalVariantId)}
              AND product_id = ${Number(link.operationalProductId)}
              AND (cms_variant_id IS NULL OR cms_variant_id = ${variant.cmsVariantId})
            RETURNING id
          `;
          if (!variantRows[0]) {
            throw new Error(`Operational variant linkage conflict for ${variant.operationalVariantId}.`);
          }
        }
      });
    },
  };
}

async function readCheckpointFile(path: string): Promise<CatalogMigrationCheckpoint | null> {
  try {
    const checkpoint = assertCheckpoint(JSON.parse(await readFile(path, "utf8")));
    if (!checkpoint) throw new Error("The saved migration checkpoint is invalid.");
    return checkpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonFile(
  path: string,
  value: unknown,
  kind: "checkpoint" | "report",
): Promise<void> {
  try {
    const existing = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const next = value && typeof value === "object" ? value as Record<string, unknown> : {};
    const recognized = existing && typeof existing === "object" && (
      kind === "checkpoint"
        ? existing.version === 1
        : existing.artifact === "ajazz-catalog-migration/v1"
          && existing.mode === next.mode
          && existing.planFingerprint === next.planFingerprint
    );
    if (!recognized) throw new Error("Refusing to overwrite an unrelated JSON file.");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      if (error instanceof SyntaxError) throw new Error("Refusing to overwrite an invalid JSON file.");
      throw error;
    }
  }
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "w" });
  await rename(temporary, path);
}

export async function runCatalogMigrationCli(
  argv: readonly string[] = process.argv.slice(2),
  environment: Record<string, string | undefined> = process.env,
  logger: Pick<Console, "error" | "log"> = console,
): Promise<number> {
  try {
    const arguments_ = parseCatalogMigrationArguments(argv);
    if (arguments_.mode === "help") {
      logger.log(usage());
      return 0;
    }
    const runtime = await createDefaultRuntime();
    const result = await executeCatalogMigration({
      arguments: arguments_,
      environment,
      ...runtime,
      readCheckpoint: readCheckpointFile,
      writeCheckpoint: (checkpoint, path) => writeJsonFile(path, checkpoint, "checkpoint"),
      writeOutput: (path, output) => writeJsonFile(path, output, "report"),
    });
    logger.log(JSON.stringify(result, null, 2));
    return result.exitCode;
  } catch (error) {
    logger.error(error instanceof Error ? error.message : "Catalog migration failed.");
    return 2;
  }
}

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === executedPath) {
  void runCatalogMigrationCli().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
