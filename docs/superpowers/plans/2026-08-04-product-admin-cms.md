# AJAZZ JAPAN Product Administration CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a protected Japanese product administration system that manages Payload drafts and R2 media, publishes validated products atomically into the existing commerce tables, and preserves RMS inventory, checkout, and order operations.

**Architecture:** Payload runs inside the existing Next.js application and stores its tables in the PostgreSQL `cms` schema, isolated from the existing commerce tables in `public`. Payload owns administrator accounts, product drafts, versions, site settings, media metadata, and editorial audit data; a dedicated publication service validates a draft and writes a complete live snapshot to the operational commerce tables in one PostgreSQL transaction. Public storefront and checkout code continue to read only operational tables, so drafts and failed publications cannot affect customers.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, Payload CMS 3, `@payloadcms/db-postgres`, PostgreSQL, `@payloadcms/storage-s3`, Cloudflare R2, Sharp, Vitest, Happy DOM, Railway, Cloudflare Cron Worker.

## Global Constraints

- The first administrator email is exactly `xiet@a-jazz.com`; no password, bootstrap token, database URL, Stripe key, RMS key, R2 key, or Payload secret is committed.
- Payload uses PostgreSQL schema `cms`; existing commerce tables remain in schema `public` and remain authoritative for storefront price, sellable stock, reservations, checkout, and orders.
- RMS-linked product identity and inventory are read-only in the CMS. RMS synchronization updates operational inventory only and never overwrites editorial content.
- Website-only products use manual SKU and inventory controls, and every inventory adjustment records actor, old value, new value, reason, and time.
- All edits begin as drafts. Preview requires an authenticated short-lived token. Publication validates and updates live commerce data atomically; cache invalidation occurs only after commit.
- Comparison prices remain hidden unless evidence, approval actor, and approval time are complete.
- Products or variants referenced by orders are archived, never hard-deleted. Only unreferenced drafts can be permanently deleted after explicit confirmation.
- Product and site media are images only, stored in Cloudflare R2 under server-generated keys. Uploads are authenticated and verified by signature, byte size, and pixel dimensions.
- Page editing is limited to approved structured slots. The CMS cannot modify layout, CSS, fonts, arbitrary HTML, or required legal field presence.
- Driver actions open `https://www.a-jazz.com/en/h-col-160.html` in a new tab with `rel="noopener noreferrer"`; `/drivers` redirects to that URL.
- Customer membership and points are outside this phase.
- Do not push, deploy, run a production migration, or rewrite Git history until the owner rotates the previously exposed credentials and separately approves history cleanup.
- Follow TDD for every behavior change. After changing routes or generated Payload types, run `pnpm build` before the final `pnpm lint` because `.next/types` are build-generated.

---

## File Map

- `payload.config.ts`: Payload root configuration, isolated PostgreSQL schema, collections, globals, R2 plugin, Japanese admin locale, and routes.
- `cms/collections/Admins.ts`: administrator authentication and roles.
- `cms/collections/Products.ts`: editorial products, variant arrays, source identity, drafts, versions, and archive rules.
- `cms/collections/Media.ts`: R2-backed media metadata and safe retirement controls.
- `cms/collections/AuditEvents.ts`: immutable CMS action records.
- `cms/globals/SiteSettings.ts`: constrained homepage, company, contact, footer, social, and legal content.
- `cms/access/admin.ts`: reusable authenticated-admin access functions.
- `cms/hooks/*`: source immutability, optimistic revision, comparison-price, audit, archive, and media-reference hooks.
- `cms/admin/*`: Payload dashboard widgets, orders view, inventory action, publish action, and archive/delete controls.
- `lib/cms/auth.ts`: server-side Payload session helper for existing order APIs.
- `lib/cms/product-schema.ts`: framework-independent validation and normalized editorial types.
- `lib/cms/publication.ts`: publication orchestration and transactional live snapshot compilation.
- `lib/cms/publication-store.ts`: PostgreSQL implementation of publication, archive, stock adjustment, and audit operations.
- `lib/cms/preview.ts`: signed preview token creation and verification.
- `lib/cms/media-validation.ts`: file signature, dimensions, size, and object-key checks.
- `lib/cms/site-settings.ts`: safe published site-setting reader with code defaults.
- `scripts/bootstrap-admin.ts`: one-time administrator creation from environment variables.
- `scripts/migrate-catalog-to-cms.ts`: idempotent catalog migration, dry run, and reconciliation.
- `app/(payload)/*`: Payload Admin and REST route adapters.
- `app/api/cms/*`: preview, publish, inventory, archive, and media-retirement endpoints.
- `app/admin/orders/*`: removed after the order screen becomes a Payload custom view.
- `tests/cms/*`: focused CMS unit, integration, migration, and route tests.

---

### Task 1: Payload Foundation and Isolated Database Schema

**Files:**
- Modify: `package.json`
- Modify: `next.config.mjs`
- Modify: `tsconfig.json`
- Modify: `.env.example`
- Create: `payload.config.ts`
- Create: `cms/collections/Admins.ts`
- Create: `cms/access/admin.ts`
- Create: `app/(payload)/cms/[[...segments]]/page.tsx`
- Create: `app/(payload)/cms/[[...segments]]/not-found.tsx`
- Create: `app/(payload)/cms/importMap.js`
- Create: `app/(payload)/api/cms/[[...slug]]/route.ts`
- Create: `app/(payload)/layout.tsx`
- Create: `tests/cms/config.test.ts`

**Interfaces:**
- Produces: Payload config alias `@payload-config`, temporary admin route `/cms`, REST route `/api/cms`, and auth collection slug `admins`.
- Produces: `isAdmin({ req }): boolean` and `adminOnly` access helpers used by all later collections.

- [ ] **Step 1: Add a failing configuration test**

```ts
// tests/cms/config.test.ts
import { describe, expect, it } from "vitest";
import configPromise from "../../payload.config";

describe("Payload configuration", () => {
  it("isolates CMS tables and exposes only temporary CMS routes", async () => {
    const config = await configPromise;
    expect(config.routes.admin).toBe("/cms");
    expect(config.routes.api).toBe("/api/cms");
    expect(config.collections?.map((item) => item.slug)).toContain("admins");
  });
});
```

- [ ] **Step 2: Run the test and confirm the missing config failure**

Run: `pnpm vitest run tests/cms/config.test.ts`

Expected: FAIL because `payload.config.ts` does not exist.

- [ ] **Step 3: Install exact Payload integration packages and scripts**

Run:

```powershell
pnpm add payload @payloadcms/next @payloadcms/db-postgres @payloadcms/richtext-lexical @payloadcms/storage-s3 sharp
```

Add these scripts to `package.json`:

```json
{
  "payload": "payload",
  "cms:types": "payload generate:types",
  "cms:importmap": "payload generate:importmap",
  "cms:migrate": "payload migrate",
  "cms:migrate:create": "payload migrate:create"
}
```

- [ ] **Step 4: Add the minimal isolated Payload configuration**

```ts
// payload.config.ts
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { Admins } from "./cms/collections/Admins";

export default buildConfig({
  admin: { user: "admins" },
  collections: [Admins],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? process.env.POSTGRES_URL },
    schemaName: "cms",
    push: false,
    migrationDir: "cms/migrations",
  }),
  editor: lexicalEditor(),
  routes: { admin: "/cms", api: "/api/cms" },
  secret: process.env.PAYLOAD_SECRET ?? "",
  sharp,
  typescript: { outputFile: "payload-types.ts" },
});
```

Configure `Admins` with `auth: { tokenExpiration: 28800, maxLoginAttempts: 5, lockTime: 900000 }`, a required role defaulting to `administrator`, and access rules that require `req.user`. Add `@payload-config` to `tsconfig.json`, wrap `next.config.mjs` with `withPayload`, and copy the current official Payload Admin/REST route adapters into the listed route files.

- [ ] **Step 5: Document only non-secret environment variable names**

Append to `.env.example`:

```env
PAYLOAD_SECRET=replace-with-at-least-32-random-characters
BOOTSTRAP_ADMIN_EMAIL=xiet@a-jazz.com
BOOTSTRAP_ADMIN_PASSWORD=replace-only-in-railway-or-local-untracked-env
R2_BUCKET=ajazz-japan-media
R2_ACCESS_KEY_ID=replace-only-in-railway
R2_SECRET_ACCESS_KEY=replace-only-in-railway
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.ajazz.jp
```

- [ ] **Step 6: Generate migrations, types, and import map**

Run:

```powershell
pnpm cms:migrate:create initial-cms
pnpm cms:types
pnpm cms:importmap
```

Expected: migration files are created under `cms/migrations`; generated types include `Admin`; no `public.products` or other commerce table is altered by the generated SQL.

- [ ] **Step 7: Run foundation verification**

Run: `pnpm vitest run tests/cms/config.test.ts && pnpm build`

Expected: test PASS and production build PASS with `/cms` and `/api/cms/[...slug]` routes.

- [ ] **Step 8: Commit the foundation**

```powershell
git add package.json pnpm-lock.yaml next.config.mjs tsconfig.json .env.example payload.config.ts payload-types.ts cms app/(payload) tests/cms/config.test.ts
git commit -m "feat: add isolated Payload CMS foundation"
```

---

### Task 2: Unified Administrator Authentication and Order View

**Files:**
- Create: `lib/cms/auth.ts`
- Create: `cms/admin/OrdersView.tsx`
- Create: `cms/admin/Dashboard.tsx`
- Create: `scripts/bootstrap-admin.ts`
- Modify: `package.json`
- Modify: `payload.config.ts`
- Move: `app/(payload)/cms/[[...segments]]/*` to `app/(payload)/admin/[[...segments]]/*`
- Modify: `app/api/admin/orders/[id]/route.ts`
- Modify: `app/api/admin/orders/[id]/refund/route.ts`
- Modify: `app/api/admin/orders/[id]/restock/route.ts`
- Modify: `app/api/admin/orders/export.csv/route.ts`
- Delete: `app/admin/login/page.tsx`
- Delete: `app/admin/orders/page.tsx`
- Delete: `app/api/admin/login/route.ts`
- Delete: `app/api/admin/logout/route.ts`
- Delete: `lib/admin-security.ts`
- Delete: `lib/admin-login-throttle.ts`
- Modify: `tests/admin/admin-security.test.ts`
- Modify: `tests/admin/admin-login-throttle.test.ts`
- Create: `tests/cms/auth.test.ts`
- Create: `tests/cms/bootstrap-admin.test.ts`

**Interfaces:**
- Produces: `authenticateAdmin(headers: Headers): Promise<Admin | null>` and `requireAdmin(headers: Headers): Promise<Admin>`.
- Produces: `bootstrapAdmin(payload, { email, password }): Promise<"created" | "exists">`.
- Consumes: existing `listAdminOrders`, order update, refund, restock, and CSV functions without changing their business logic.

- [ ] **Step 1: Write failing authentication tests**

```ts
// tests/cms/auth.test.ts
import { describe, expect, it, vi } from "vitest";
import { requireAuthenticatedAdmin } from "../../lib/cms/auth";

describe("requireAuthenticatedAdmin", () => {
  it("rejects requests without a Payload administrator", async () => {
    await expect(requireAuthenticatedAdmin(new Headers(), {
      auth: vi.fn().mockResolvedValue({ user: null }),
    } as never)).rejects.toMatchObject({ status: 401 });
  });

  it("returns the authenticated administrator", async () => {
    const admin = { id: 1, email: "xiet@a-jazz.com", role: "administrator" };
    await expect(requireAuthenticatedAdmin(new Headers(), {
      auth: vi.fn().mockResolvedValue({ user: admin }),
    } as never)).resolves.toEqual(admin);
  });
});
```

Add bootstrap tests that assert a missing environment password fails closed, the fixed email is normalized, and an existing account is not overwritten.

- [ ] **Step 2: Run tests and confirm missing helper failures**

Run: `pnpm vitest run tests/cms/auth.test.ts tests/cms/bootstrap-admin.test.ts`

Expected: FAIL because the auth and bootstrap modules do not exist.

- [ ] **Step 3: Implement Payload session helpers and bootstrap script**

```ts
// lib/cms/auth.ts
import configPromise from "@payload-config";
import { APIError, getPayload, type Payload } from "payload";

export async function authenticateAdmin(headers: Headers, payload?: Payload) {
  const client = payload ?? await getPayload({ config: configPromise });
  const { user } = await client.auth({ headers });
  return user?.collection === "admins" ? user : null;
}

export async function requireAuthenticatedAdmin(headers: Headers, payload?: Payload) {
  const user = await authenticateAdmin(headers, payload);
  if (!user) throw new APIError("Unauthorized", 401);
  return user;
}
```

`scripts/bootstrap-admin.ts` must require `BOOTSTRAP_ADMIN_EMAIL === "xiet@a-jazz.com"`, require a password of at least 16 characters, query by email, create only when absent, and never log the password.

When `scripts/bootstrap-admin.ts` is created in this task, add the
`cms:bootstrap-admin` package script as `tsx scripts/bootstrap-admin.ts`.

- [ ] **Step 4: Move the Payload admin to `/admin` and register order navigation**

Set `routes.admin` to `/admin`. Register a custom root admin view at path `/orders` and a dashboard link to it. `cms/admin/OrdersView.tsx` renders the same order table and action components currently used by `app/admin/orders/page.tsx`, but receives the authenticated Payload request from the custom view props.

- [ ] **Step 5: Protect every existing order endpoint with Payload**

At the start of each order API handler use:

```ts
if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
await requireAuthenticatedAdmin(request.headers);
```

Move `isSameOrigin` to `lib/http-security.ts`. Keep order status transition, Stripe refund, restock idempotency, and CSV escaping code unchanged.

- [ ] **Step 6: Remove shared-password authentication**

Delete the four old login/logout/page files and the two shared-secret modules. Update deployment tests and `.env.example` so `ADMIN_PASSWORD` and `ADMIN_SECRET` are no longer required. Keep the historical `admin_login_attempts` table untouched until a later non-destructive cleanup migration.

- [ ] **Step 7: Verify authentication and order regressions**

Run:

```powershell
pnpm vitest run tests/cms/auth.test.ts tests/cms/bootstrap-admin.test.ts tests/admin tests/deployment/admin-config.test.ts
pnpm build
```

Expected: Payload auth tests PASS; order actions remain protected; `/admin` is the Payload admin route; `/admin/orders` is the custom Payload order view; old shared-password routes are absent.

- [ ] **Step 8: Commit unified administration**

```powershell
git add payload.config.ts app cms lib scripts tests .env.example README.md
git commit -m "feat: unify CMS and order administration"
```

---

### Task 3: Editorial Product, Variant, Specification, and Audit Models

**Files:**
- Create: `lib/cms/product-schema.ts`
- Create: `cms/fields/productVariants.ts`
- Create: `cms/fields/productSpecifications.ts`
- Create: `cms/collections/Products.ts`
- Create: `cms/collections/AuditEvents.ts`
- Create: `cms/hooks/protectSourceFields.ts`
- Create: `cms/hooks/writeAuditEvent.ts`
- Modify: `payload.config.ts`
- Create: `tests/cms/product-schema.test.ts`
- Create: `tests/cms/product-access.test.ts`
- Create: `tests/cms/audit.test.ts`

**Interfaces:**
- Produces: `EditorialProductInput`, `EditorialVariantInput`, `ProductSourceType`, `InventoryMode`, and `validateProductDraft(input): ValidationIssue[]`.
- Produces: collection slugs `products` and `audit-events`.
- Produces: immutable audit action union `login_security | create | edit | publish | unpublish | archive | restore | delete_draft | approve_price | adjust_inventory | retire_media`.

- [ ] **Step 1: Write failing domain tests**

```ts
// tests/cms/product-schema.test.ts
import { describe, expect, it } from "vitest";
import { validateProductDraft } from "../../lib/cms/product-schema";

describe("validateProductDraft", () => {
  it("requires RMS identity for an RMS-linked product", () => {
    const issues = validateProductDraft({ sourceType: "rms", variants: [] } as never);
    expect(issues).toContainEqual(expect.objectContaining({ path: "rmsManageNumber" }));
  });

  it("rejects manual inventory mode on an RMS variant", () => {
    const issues = validateProductDraft({
      sourceType: "rms",
      rmsManageNumber: "ak820",
      variants: [{ sku: "AK820-B", inventoryMode: "manual" }],
    } as never);
    expect(issues).toContainEqual(expect.objectContaining({ path: "variants.0.inventoryMode" }));
  });

  it("requires evidence and approval for a comparison price", () => {
    const issues = validateProductDraft({
      sourceType: "manual",
      variants: [{ sku: "WEB-1", inventoryMode: "manual", salePriceJpy: 1000, compareAtPriceJpy: 1500 }],
    } as never);
    expect(issues.map((issue) => issue.code)).toContain("comparison_price_unapproved");
  });
});
```

- [ ] **Step 2: Run the domain tests and confirm failure**

Run: `pnpm vitest run tests/cms/product-schema.test.ts`

Expected: FAIL because `validateProductDraft` is missing.

- [ ] **Step 3: Implement normalized types and deterministic validation**

```ts
export type ProductSourceType = "rms" | "manual";
export type InventoryMode = "rms" | "manual";
export type ProductLifecycle = "active" | "unpublished" | "archived";
export type ValidationIssue = { path: string; code: string; message: string };

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
  comparisonEvidenceType?: "manufacturer_price" | "recent_price" | "market_price";
  comparisonEvidenceReference?: string;
  comparisonApprovedBy?: string;
  comparisonApprovedAt?: string;
  inventoryMode: InventoryMode;
  active: boolean;
}
```

Validate the seven canonical category keys, non-empty active SKU, positive integer yen prices, unique SKUs, RMS/manual inventory authority, primary image, unique slug, and complete comparison-price approval fields. Draft saves may be incomplete; publication calls the strict validator.

- [ ] **Step 4: Configure the Product collection**

Create fixed tabs for basic information, media/colors, price/inventory, specifications, SEO, and versions. Use `versions: { drafts: { autosave: { interval: 1500, showSaveDraftButton: true }, validate: false }, maxPerDoc: 50 }`. Store `sourceType`, immutable RMS identity, operational IDs, lifecycle, featured/order fields, Lexical description, media relationships, structured variant array, typed specifications, SEO fields, `editorialRevision`, and last publication metadata.

- [ ] **Step 5: Enforce source immutability and optimistic revisions**

`protectSourceFields` compares `originalDoc` and incoming data, rejects changed RMS management/SKU identities unless `context.allowSourceConversion === true`, forces RMS variants to `inventoryMode: "rms"`, and increments `editorialRevision`. A custom update endpoint must require `expectedRevision`; mismatch returns HTTP 409 with code `stale_editorial_revision`.

- [ ] **Step 6: Add immutable audit records**

Configure `AuditEvents` with administrator-only read/create, no update/delete, indexed `action`, `actor`, `subjectType`, `subjectId`, `createdAt`, and JSON `details`. Await audit creation with the same Payload request in every protected hook so failed audit writes roll back the Payload change.

- [ ] **Step 7: Verify model and access behavior**

Run: `pnpm vitest run tests/cms/product-schema.test.ts tests/cms/product-access.test.ts tests/cms/audit.test.ts`

Expected: all tests PASS, including RMS immutability, manual source validity, stale revision rejection, and immutable audit access.

- [ ] **Step 8: Generate schema artifacts and commit**

Run:

```powershell
pnpm cms:migrate:create product-editorial-model
pnpm cms:types
pnpm cms:importmap
git add cms lib/cms payload.config.ts payload-types.ts tests/cms
git commit -m "feat: model CMS products and audit events"
```

---

### Task 4: Secure Cloudflare R2 Media Lifecycle

**Files:**
- Create: `lib/cms/media-validation.ts`
- Create: `cms/collections/Media.ts`
- Create: `cms/hooks/protectMediaReferences.ts`
- Create: `app/api/cms/media/[id]/retire/route.ts`
- Create: `app/api/cron/media-cleanup/route.ts`
- Modify: `payload.config.ts`
- Modify: `cloudflare/ajazz-operations-cron/src/index.ts`
- Modify: `cloudflare/ajazz-operations-cron/wrangler.jsonc`
- Create: `tests/cms/media-validation.test.ts`
- Create: `tests/cms/media-retirement.test.ts`
- Modify: `tests/cloudflare/operations-cron.test.ts`

**Interfaces:**
- Produces: `validateUploadedImage(file): Promise<ValidatedImage>` and `createMediaObjectKey(originalName): string`.
- Produces: media collection slug `media`, retirement endpoint, and protected cleanup endpoint.

- [ ] **Step 1: Write failing media validation tests**

```ts
// tests/cms/media-validation.test.ts
import { describe, expect, it } from "vitest";
import { createMediaObjectKey, detectImageType } from "../../lib/cms/media-validation";

describe("media validation", () => {
  it("ignores the browser filename and creates an opaque key", () => {
    expect(createMediaObjectKey("../../商品<script>.jpg")).toMatch(/^products\/[0-9a-f-]+\.jpg$/);
  });

  it("rejects MIME spoofing", () => {
    expect(() => detectImageType(Buffer.from("not an image"), "image/jpeg")).toThrow("Unsupported image signature");
  });
});
```

- [ ] **Step 2: Run media tests and confirm failure**

Run: `pnpm vitest run tests/cms/media-validation.test.ts tests/cms/media-retirement.test.ts`

Expected: FAIL because the validator and retirement policy do not exist.

- [ ] **Step 3: Implement server-side media validation**

Allow JPEG, PNG, and WebP signatures only. Reject files over 12 MiB, widths or heights below 320 px, widths or heights above 8000 px, total pixels above 40,000,000, animated images, and signature/MIME mismatches. Use Sharp metadata after signature validation. Replace every upload name with `products/<uuid>.<verified-extension>`.

- [ ] **Step 4: Configure R2 storage and public delivery**

```ts
s3Storage({
  enabled: Boolean(process.env.R2_BUCKET),
  bucket: process.env.R2_BUCKET ?? "",
  collections: {
    media: {
      disablePayloadAccessControl: true,
      generateFileURL: ({ filename }) => `${process.env.R2_PUBLIC_URL}/${filename}`,
    },
  },
  config: {
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    region: "auto",
  },
})
```

Configure `Media` as an upload collection with authenticated create/update, public read for non-retired records, direct delete disabled, metadata for alt text, width, height, content hash, purpose, `retiredAt`, and `deleteAfter`.

- [ ] **Step 5: Implement reference-safe retirement and delayed deletion**

The retirement endpoint checks product drafts, versions, variants, and site settings. Referenced media returns 409 with reference summaries. Unreferenced media is marked `retiredAt=now` and `deleteAfter=now+24h`; cleanup rechecks references before deleting the Payload record and R2 object. Every retire/delete action writes an audit event.

- [ ] **Step 6: Schedule media cleanup**

Add a daily Cloudflare Worker trigger that calls `/api/cron/media-cleanup` with `Authorization: Bearer <CRON_SECRET>`. Reuse the existing constant-time bearer validation pattern and retain current inventory/reservation schedules.

- [ ] **Step 7: Verify failure handling and commit**

Run:

```powershell
pnpm vitest run tests/cms/media-validation.test.ts tests/cms/media-retirement.test.ts tests/cloudflare/operations-cron.test.ts
pnpm build
git add cms lib/cms app/api/cms app/api/cron cloudflare payload.config.ts tests
git commit -m "feat: add secure R2 media management"
```

Expected: spoofed or oversized uploads fail; referenced media cannot retire; failed R2 deletion stays retryable; build PASS.

---

### Task 5: Atomic Product Publication into Commerce Tables

**Files:**
- Modify: `lib/commerce/db.ts`
- Create: `lib/cms/publication.ts`
- Create: `lib/cms/publication-store.ts`
- Create: `app/api/cms/products/[id]/publish/route.ts`
- Create: `app/api/cms/products/[id]/unpublish/route.ts`
- Create: `tests/cms/publication.test.ts`
- Create: `tests/cms/publication-store.test.ts`
- Modify: `tests/commerce/db.test.ts`
- Modify: `tests/commerce/storefront.test.ts`

**Interfaces:**
- Consumes: `validateProductDraft`, authenticated Payload product draft, and existing `commerceSql()`.
- Produces: `publishProduct(input, store): Promise<PublicationResult>`, `unpublishProduct(input, store): Promise<void>`, and `PublicationStore.transaction(callback)`.
- Produces: stable links `products.cms_product_id` and `product_variants.cms_variant_id`.

- [ ] **Step 1: Write failing atomicity and price tests**

```ts
// tests/cms/publication.test.ts
it("does not alter live data when one variant fails", async () => {
  const store = fakePublicationStore({ failAtVariant: 2, existingName: "Live name" });
  await expect(publishProduct(validDraft(), store)).rejects.toThrow("variant write failed");
  expect(store.liveProduct.name).toBe("Live name");
  expect(store.auditEvents).toHaveLength(0);
});

it("suppresses an unapproved comparison price", async () => {
  const draft = validDraft({ compareAtPriceJpy: 15000, comparisonApprovedAt: undefined });
  await expect(publishProduct(draft, fakePublicationStore())).rejects.toMatchObject({
    issues: expect.arrayContaining([expect.objectContaining({ code: "comparison_price_unapproved" })]),
  });
});
```

- [ ] **Step 2: Run publication tests and confirm failure**

Run: `pnpm vitest run tests/cms/publication.test.ts tests/cms/publication-store.test.ts`

Expected: FAIL because publication interfaces do not exist.

- [ ] **Step 3: Extend the operational schema without breaking orders**

Add nullable `cms_product_id`, `source_type`, short copy, SEO, featured/order, lifecycle timestamps, and publication revision fields to `products`. Make `rms_manage_number` nullable for manual products and replace its current uniqueness with a partial unique index where non-null. Add nullable `cms_variant_id`, `inventory_mode`, swatch, thumbnail, active flag, and comparison evidence/approver fields to `product_variants`. Do not change existing numeric primary keys or order-item foreign keys.

Add `publication_audit_events` and `manual_inventory_adjustments` to `public`; both append-only tables store the Payload actor ID/email and correlation ID. The publication audit row is written inside the same transaction as the live product snapshot and is the transactionally authoritative record; the Payload audit hook stores the matching correlation ID for administrator browsing.

- [ ] **Step 4: Implement the framework-independent publication orchestrator**

```ts
export interface PublicationStore {
  transaction<T>(work: (tx: PublicationTransaction) => Promise<T>): Promise<T>;
}

export interface PublicationTransaction {
  assertSlugAvailable(slug: string, cmsProductId: string): Promise<void>;
  upsertProduct(snapshot: PublishedProductSnapshot): Promise<{ operationalProductId: string }>;
  replaceImages(productId: string, images: PublishedImage[]): Promise<void>;
  upsertVariants(productId: string, variants: PublishedVariant[]): Promise<void>;
  disableMissingVariants(productId: string, cmsVariantIds: string[]): Promise<void>;
  appendPublicationAudit(event: PublicationAuditInput): Promise<void>;
}
```

`publishProduct` performs strict validation before opening the transaction, resolves every non-retired media URL, checks `expectedRevision`, writes the complete snapshot and audit event, then returns cache tags. It does not mutate the CMS draft on failure.

- [ ] **Step 5: Implement PostgreSQL transaction and endpoints**

Use one `commerceSql().begin(async (sql) => ...)` block for every operational write and publication audit insertion. Lock the target product row with `FOR UPDATE`; use the current CMS revision in a conditional update to reject stale publication. After commit, update Payload `lastPublishedRevision`, `lastPublishedAt`, `lastPublishedBy`, and lifecycle status with the same correlation ID, then call `revalidatePath("/")` and `revalidatePath(`/products/${slug}`)`.

The publish/unpublish endpoints require an authenticated administrator, same origin, and JSON `{ expectedRevision: number }`. Validation errors return 422, version conflicts 409, unauthorized requests 401, and operational failures 500 without changing live content.

- [ ] **Step 6: Verify commerce regression and commit**

Run:

```powershell
pnpm vitest run tests/cms/publication.test.ts tests/cms/publication-store.test.ts tests/commerce/db.test.ts tests/commerce/storefront.test.ts tests/commerce/checkout.test.ts tests/commerce/checkout-handler.test.ts
git add lib/commerce/db.ts lib/cms app/api/cms tests
git commit -m "feat: publish CMS products atomically"
```

Expected: rollback, stale revision, comparison-price, unpublish, and existing checkout tests PASS.

---

### Task 6: Authenticated Draft Preview and Version Restore

**Files:**
- Create: `lib/cms/preview.ts`
- Create: `app/api/cms/preview/route.ts`
- Create: `app/api/cms/preview/exit/route.ts`
- Create: `app/products/[slug]/preview-adapter.ts`
- Modify: `app/products/[slug]/page.tsx`
- Modify: `cms/collections/Products.ts`
- Create: `tests/cms/preview.test.ts`
- Create: `tests/cms/version-conflict.test.ts`

**Interfaces:**
- Produces: `createPreviewToken({ productId, revision, expiresAt }): string` and `verifyPreviewToken(token): PreviewClaims | null`.
- Produces: preview URL `/api/cms/preview?token=...&slug=...` and a draft-aware product adapter that feeds the existing `ProductDetail` component.

- [ ] **Step 1: Write failing preview security tests**

```ts
it("rejects expired and modified preview tokens", () => {
  const expired = createPreviewToken({ productId: "10", revision: 4, expiresAt: 1 });
  expect(verifyPreviewToken(expired, { now: 2 })).toBeNull();
  expect(verifyPreviewToken(`${expired}x`, { now: 1 })).toBeNull();
});
```

Add route tests proving that a valid token without an authenticated Payload cookie is rejected and live requests never call Payload with `draft: true`.

- [ ] **Step 2: Run preview tests and confirm failure**

Run: `pnpm vitest run tests/cms/preview.test.ts tests/cms/version-conflict.test.ts`

Expected: FAIL because preview helpers are absent.

- [ ] **Step 3: Implement short-lived preview authorization**

Sign claims with HMAC-SHA256 using `PAYLOAD_SECRET`, use constant-time signature comparison, limit validity to 10 minutes, bind the token to product ID and editorial revision, require the Payload administrator session, and enable Next.js draft mode only after all checks pass.

- [ ] **Step 4: Render drafts through the live product component**

Create an adapter from `Product` draft data to the exact props consumed by `ProductDetail`. In draft mode, query Payload by slug with `draft: true`, `overrideAccess: false`, and the authenticated request; otherwise continue using `getStorefrontDatabaseProduct`. Do not duplicate product-page markup.

- [ ] **Step 5: Configure Payload preview and restore behavior**

Set `admin.preview` for Products to the signed preview endpoint. Retain Payload's built-in versions/diff/restore UI. The restore hook increments `editorialRevision`, writes a `restore` audit event, and leaves the restored version as a draft until the administrator republishes it.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm vitest run tests/cms/preview.test.ts tests/cms/version-conflict.test.ts tests/storefront/product-page.test.tsx
pnpm build
git add lib/cms app/api/cms app/products cms/collections tests
git commit -m "feat: add secure product draft preview"
```

Expected: preview is administrator-only, expired tokens fail closed, restored versions remain drafts, public rendering is unchanged.

---

### Task 7: RMS Import Boundary and Manual Inventory Actions

**Files:**
- Create: `lib/cms/rms-drafts.ts`
- Create: `lib/cms/manual-inventory.ts`
- Create: `app/api/cms/products/[id]/inventory/route.ts`
- Modify: `lib/commerce/catalog.ts`
- Modify: `lib/rms/database-store.ts`
- Modify: `scripts/import-rms-catalog.ts`
- Modify: `scripts/import-rms-catalog-cli.ts`
- Create: `tests/cms/rms-drafts.test.ts`
- Create: `tests/cms/manual-inventory.test.ts`
- Modify: `tests/commerce/catalog.test.ts`
- Modify: `tests/rms/sync.test.ts`

**Interfaces:**
- Produces: `upsertRmsEditorialDraft(source, payload): Promise<RmsDraftResult>`.
- Produces: `adjustManualInventory({ productId, variantId, quantity, reason, actor }, store): Promise<InventoryAdjustment>`.
- Preserves: `syncRmsInventory` and `databaseRmsInventorySyncStore` update `public.product_variants.available_quantity` only.

- [ ] **Step 1: Write failing source-boundary tests**

```ts
it("updates source snapshot without overwriting edited content", async () => {
  const existing = cmsProduct({ name: "手動編集名", sourceSnapshot: { name: "Old RMS" } });
  const result = await mergeRmsSource(existing, rmsSource({ name: "New RMS" }));
  expect(result.name).toBe("手動編集名");
  expect(result.sourceSnapshot.name).toBe("New RMS");
});

it("records every manual stock adjustment", async () => {
  const result = await adjustManualInventory(validAdjustment(), fakeInventoryStore({ quantity: 5 }));
  expect(result).toMatchObject({ oldQuantity: 5, newQuantity: 8, reason: "倉庫入庫" });
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run tests/cms/rms-drafts.test.ts tests/cms/manual-inventory.test.ts`

Expected: FAIL because merge and adjustment functions do not exist.

- [ ] **Step 3: Split RMS source ingestion from editorial publication**

Change workbook import so it still initializes or updates operational RMS identities, prices, and inventory, then creates a CMS draft only when no linked editorial product exists. For an existing CMS product, update only `sourceSnapshot`, `sourceUpdatedAt`, and newly discovered source identifiers. Never write name, description, category, media, featured order, or SEO after the initial draft is created.

- [ ] **Step 4: Keep scheduled RMS inventory operational-only**

Limit active RMS keys to `source_type = 'rms'`, non-null RMS identifiers, and active variants. Missing RMS records retain last-known stock and increment sync failure counts. No Payload API call occurs in the 15-minute inventory job.

- [ ] **Step 5: Implement manual stock adjustment**

Require `inventoryMode === "manual"`, a non-negative integer quantity, a Japanese reason between 2 and 200 characters, same-origin administrator authentication, and a row lock. Update available quantity and append the adjustment/audit record in one transaction. RMS variants return 409 `rms_inventory_read_only`.

- [ ] **Step 6: Verify RMS and checkout regressions**

Run:

```powershell
pnpm vitest run tests/cms/rms-drafts.test.ts tests/cms/manual-inventory.test.ts tests/commerce/catalog.test.ts tests/commerce/rms-workbook.test.ts tests/rms/sync.test.ts tests/rms/cron.test.ts tests/commerce/checkout.test.ts
git add lib scripts app/api/cms tests
git commit -m "feat: separate RMS and manual inventory management"
```

Expected: editorial fields survive reimport, RMS sync remains operational, and manual adjustments are audited.

---

### Task 8: Idempotent Existing Catalog Migration and Reconciliation

**Files:**
- Create: `lib/cms/catalog-migration.ts`
- Create: `scripts/migrate-catalog-to-cms.ts`
- Create: `tests/cms/catalog-migration.test.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces: `planCatalogMigration(operational, cms): MigrationPlan` and `reconcileCatalog(operational, cms): ReconciliationReport`.
- CLI modes: default dry run, `--apply`, `--reconcile`, and `--json <absolute-output-path>`.

- [ ] **Step 1: Write failing idempotency and reconciliation tests**

```ts
it("produces no creates on the second migration", () => {
  const first = planCatalogMigration(operationalFixture, []);
  const second = planCatalogMigration(operationalFixture, applyPlanInMemory(first));
  expect(second.creates).toHaveLength(0);
  expect(second.links).toHaveLength(0);
});

it("reports SKU and price mismatches", () => {
  expect(reconcileCatalog(operationalFixture, mismatchedCmsFixture)).toMatchObject({
    ok: false,
    skuMismatches: expect.any(Array),
    priceMismatches: expect.any(Array),
  });
});
```

- [ ] **Step 2: Run migration tests and confirm failure**

Run: `pnpm vitest run tests/cms/catalog-migration.test.ts`

Expected: FAIL because migration planner is absent.

- [ ] **Step 3: Implement deterministic migration planning**

Match products by stable operational product ID first and RMS management number second; match variants by operational variant ID and RMS SKU. Create Payload records with the current operational content as their initial published baseline plus an editable draft. Preserve operational IDs and image URLs. Do not modify storefront tables during migration.

- [ ] **Step 4: Implement safe CLI execution**

The CLI defaults to a read-only summary. `--apply` requires `CMS_MIGRATION_CONFIRM=AJAZZ_CATALOG_2026`, processes products in deterministic batches of 25, stores a migration run ID, and can resume. `--reconcile` compares product count, variant count, RMS links, SKU links, sale prices, image counts, and published/unpublished state; it exits non-zero when any mismatch exists.

When `scripts/migrate-catalog-to-cms.ts` is created in this task, add the
`cms:migrate-catalog` package script as `tsx scripts/migrate-catalog-to-cms.ts`.

- [ ] **Step 5: Document rehearsal and rollback**

Document disposable-database rehearsal, dry-run JSON retention, apply, reconciliation, and rollback. Rollback means deploy the prior application release while leaving both schemas intact; it never drops CMS or commerce data.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm vitest run tests/cms/catalog-migration.test.ts
pnpm cms:migrate-catalog -- --help
git add lib/cms/catalog-migration.ts scripts/migrate-catalog-to-cms.ts tests/cms/catalog-migration.test.ts README.md
git commit -m "feat: migrate existing catalog into CMS"
```

Expected: migration is idempotent, mismatch reports are explicit, and the default command performs no writes.

---

### Task 9: Constrained Site Content and External Driver Destination

**Files:**
- Create: `cms/globals/SiteSettings.ts`
- Create: `lib/cms/site-settings.ts`
- Modify: `payload.config.ts`
- Modify: `app/page.tsx`
- Modify: `app/about/page.tsx`
- Modify: `app/legal/page.tsx`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/drivers/page.tsx`
- Modify: `components/store/Storefront.tsx`
- Modify: `components/store/ProductDetail.tsx`
- Create: `tests/cms/site-settings.test.ts`
- Create: `tests/storefront/driver-links.test.tsx`
- Modify: `tests/storefront/japanese-copy.test.tsx`

**Interfaces:**
- Produces: global slug `site-settings` and `getPublishedSiteSettings(): Promise<SiteSettingsViewModel>`.
- Produces: `DRIVER_DESTINATION = "https://www.a-jazz.com/en/h-col-160.html"` shared by header, footer, and product pages.

- [ ] **Step 1: Write failing structured-content and driver tests**

```ts
it("keeps required legal labels when CMS values are edited", () => {
  const settings = normalizeSiteSettings({ legal: { sellerName: "" } } as never);
  expect(settings.legal.sellerName).toBe("アジャズジャパン株式会社");
});

it("uses the external driver destination safely", () => {
  render(<DriverLink />);
  expect(screen.getByRole("link", { name: /ドライバー/ })).toHaveAttribute("target", "_blank");
  expect(screen.getByRole("link", { name: /ドライバー/ })).toHaveAttribute("rel", "noopener noreferrer");
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm vitest run tests/cms/site-settings.test.ts tests/storefront/driver-links.test.tsx`

Expected: FAIL because the global, normalizer, and shared external link are absent.

- [ ] **Step 3: Configure fixed site-editing groups**

Create groups for homepage hero media/title/copy/commands, featured categories/order, featured products/order, the three approved company-profile sections, contact, footer navigation, social links, and legal commerce values. Legal field labels and row presence stay in application code; administrators edit values only. URL fields accept `https:` and `mailto:` schemes only. The contact email defaults to `xiet@a-jazz.com`.

- [ ] **Step 4: Add a safe published-settings reader**

Read only the published global. Merge missing values with the existing code constants so a CMS outage or incomplete draft does not blank the site. Reject arbitrary HTML, class names, font names, style values, or unrecognized navigation routes at normalization time.

- [ ] **Step 5: Wire settings into existing approved templates**

Pass normalized settings into current Storefront/About/Legal/Footer components without changing layout classes. Keep the company page free of the representative row; keep the responsible-person value in the legal disclosure.

- [ ] **Step 6: Replace driver page with compatibility redirect**

```ts
// app/drivers/page.tsx
import { redirect } from "next/navigation";
import { DRIVER_DESTINATION } from "../../lib/cms/site-settings";

export default function DriversPage() {
  redirect(DRIVER_DESTINATION);
}
```

All visible driver actions use ordinary external anchors so they open a new tab; `/drivers` remains a server redirect for old bookmarks.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
pnpm vitest run tests/cms/site-settings.test.ts tests/storefront/driver-links.test.tsx tests/storefront/japanese-copy.test.tsx
pnpm build
git add cms/globals lib/cms payload.config.ts app components tests
git commit -m "feat: manage constrained site content"
```

Expected: approved templates remain intact, required legal fields render, external driver links are safe, and `/drivers` redirects.

---

### Task 10: Dashboard, Product Actions, Archive, and Protected Deletion

**Files:**
- Modify: `cms/admin/Dashboard.tsx`
- Create: `cms/admin/ProductActions.tsx`
- Create: `cms/admin/ManualInventoryAction.tsx`
- Create: `lib/cms/admin-dashboard.ts`
- Create: `lib/cms/product-lifecycle.ts`
- Create: `app/api/cms/products/[id]/archive/route.ts`
- Create: `app/api/cms/products/[id]/restore/route.ts`
- Create: `app/api/cms/products/[id]/delete-draft/route.ts`
- Create: `tests/cms/admin-dashboard.test.ts`
- Create: `tests/cms/product-lifecycle.test.ts`

**Interfaces:**
- Produces: `getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot>`.
- Produces: `archiveProduct`, `restoreProductAsDraft`, and `deleteUnreferencedDraft` lifecycle services.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it("archives an ordered product instead of deleting it", async () => {
  const store = fakeLifecycleStore({ referencedByOrder: true });
  await expect(deleteUnreferencedDraft("product-1", admin, store)).rejects.toMatchObject({
    code: "product_has_order_history",
  });
  expect(store.deleted).toBe(false);
});

it("restores an archived product as a draft", async () => {
  const store = fakeLifecycleStore({ lifecycle: "archived" });
  await restoreProductAsDraft("product-1", admin, store);
  expect(store.lifecycle).toBe("unpublished");
  expect(store.status).toBe("draft");
});
```

- [ ] **Step 2: Run lifecycle and dashboard tests and confirm failure**

Run: `pnpm vitest run tests/cms/product-lifecycle.test.ts tests/cms/admin-dashboard.test.ts`

Expected: FAIL because lifecycle services and dashboard queries do not exist.

- [ ] **Step 3: Implement archive, restore, and deletion rules**

Archive first unpublishes the operational product in one transaction, then marks the CMS record archived and records both audit events. Restore creates a new draft and never republishes automatically. Permanent deletion requires lifecycle `unpublished`, no publication history, no operational order references for any linked variant, no media owned only by the product, and request body `{ confirmation: "DELETE <slug>" }`.

- [ ] **Step 4: Build the operational dashboard snapshot**

Return total, draft, published, out-of-stock, and archived counts; latest successful RMS sync; current RMS failure summary; pending publication products; recent edits; and recent publication, price, archive, inventory, and media audit events. Query counts on the server and do not expose secrets or customer order addresses in dashboard widgets.

- [ ] **Step 5: Add focused administrator controls**

Register publish, unpublish, archive, restore, and manual inventory components in the product edit view. Require explicit confirmation for archive and permanent draft deletion. Show RMS SKU/inventory as disabled read-only fields with source labels; show manual inventory adjustment only for manual variants. Product list filters cover keyword, canonical category, source, publication state, and stock state.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
pnpm vitest run tests/cms/product-lifecycle.test.ts tests/cms/admin-dashboard.test.ts tests/admin
pnpm cms:types
pnpm cms:importmap
pnpm build
git add cms lib/cms app/api/cms payload-types.ts tests
git commit -m "feat: complete product administration workflows"
```

Expected: order-linked products cannot be deleted, archive removes them from live sale, restore returns a draft, and dashboard/filter behavior passes.

---

### Task 11: Full Verification, Deployment Runbook, and Production Gate

**Files:**
- Modify: `README.md`
- Create: `docs/operations/product-admin-cms.md`
- Create: `tests/deployment/cms-readiness.test.ts`
- Modify: `railway.json`

**Interfaces:**
- Produces: a repeatable deployment sequence with migrations before application start, bootstrap once, catalog reconciliation, R2 verification, and rollback.
- Produces: final acceptance evidence without performing a production push or migration.

- [ ] **Step 1: Add a failing deployment-readiness test**

```ts
it("requires CMS and R2 production variables without legacy admin secrets", () => {
  const names = readDocumentedProductionVariableNames();
  expect(names).toEqual(expect.arrayContaining([
    "PAYLOAD_SECRET", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_ENDPOINT", "R2_PUBLIC_URL",
  ]));
  expect(names).not.toContain("ADMIN_PASSWORD");
  expect(names).not.toContain("ADMIN_SECRET");
});
```

- [ ] **Step 2: Run readiness test and confirm documentation failure**

Run: `pnpm vitest run tests/deployment/cms-readiness.test.ts`

Expected: FAIL until production variables and migration commands are documented.

- [ ] **Step 3: Write the production runbook**

Document this exact release order:

1. Rotate every previously exposed Stripe, RMS, database, cron, and administrator secret.
2. Obtain explicit approval before Git history cleanup; verify the rewritten fork contains no exposed value.
3. Create `media.ajazz.jp`, private R2 write credentials, and public read-only delivery.
4. Add Payload and R2 variables to Railway; set bootstrap variables only for the bootstrap command.
5. Back up Railway PostgreSQL and rehearse Payload migrations on a disposable restored database.
6. Run `pnpm cms:migrate`, `pnpm cms:bootstrap-admin`, catalog dry run, catalog apply, and reconciliation.
7. Remove `BOOTSTRAP_ADMIN_PASSWORD` immediately after account creation.
8. Deploy the application, then the updated Cloudflare Cron Worker.
9. Verify administrator login, RMS sync, media upload, preview, publication, storefront, checkout in Stripe test mode, order export, shipment, refund, archive, and restore.
10. Switch traffic only after all acceptance checks pass; rollback by restoring the previous Railway deployment without dropping either database schema.

- [ ] **Step 4: Run the complete automated suite**

Run:

```powershell
pnpm test
pnpm build
pnpm lint
git diff --check
```

Expected: all tests PASS, production build PASS, TypeScript PASS, and no whitespace errors.

- [ ] **Step 5: Run local browser acceptance on desktop and mobile**

Start `pnpm dev`, then verify at 1440x900 and 390x844:

- `/admin` login and dashboard render without overlap;
- product list search and all five filters work;
- RMS fields are read-only and manual inventory control is conditional;
- image upload, thumbnail/color selection, draft save, preview, publish, unpublish, archive, restore, and version restore work;
- published listing and detail pages use the same selected color images and prices as the admin preview;
- checkout uses the published server-side price and current operational inventory;
- `/admin/orders` export, shipment, refund, and restock controls remain usable;
- driver links open the external AJAZZ site safely and `/drivers` redirects;
- browser console has no application errors and all primary images load from `media.ajazz.jp`.

Save screenshots to `artifacts/cms-acceptance/desktop/` and `artifacts/cms-acceptance/mobile/`; inspect each image before declaring acceptance.

- [ ] **Step 6: Inspect the final diff and credential boundary**

Run:

```powershell
git status --short
git diff --stat e225fcf...HEAD
git log --oneline --decorate -12
```

Expected: only CMS/storefront/operations files are changed; no `.env` or secret value is tracked; no push or production migration has occurred.

- [ ] **Step 7: Commit verified documentation and readiness checks**

```powershell
git add README.md docs/operations/product-admin-cms.md tests/deployment/cms-readiness.test.ts railway.json artifacts/cms-acceptance
git commit -m "docs: add CMS deployment and acceptance runbook"
```

---

## Final Acceptance Gate

- [ ] An administrator created as `xiet@a-jazz.com` can authenticate through Payload and open products and orders from one `/admin` surface.
- [ ] An RMS-linked product can be edited without changing locked RMS identity or inventory.
- [ ] A website-only product can be created, stocked manually with an audit reason, previewed, published, unpublished, archived, and restored.
- [ ] Multiple color variants show thumbnail, swatch, image, sale price, approved comparison price, and stock behavior correctly.
- [ ] Failed validation, media resolution, audit insertion, or database writes leave the previous live product unchanged.
- [ ] Product/version/media deletion rules preserve every order reference and live media object.
- [ ] The existing checkout, Stripe webhook, refund, restock, order export, RMS sync, reservation cleanup, legal, privacy, and terms tests all pass.
- [ ] The homepage and company/legal content can be edited only within approved slots.
- [ ] Desktop and mobile screenshots show no clipped text, overlap, missing images, or broken controls.
- [ ] Production remains blocked until credential rotation and approved Git-history cleanup are complete.
