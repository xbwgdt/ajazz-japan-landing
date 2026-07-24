# AJAZZ JAPAN Official Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AJAZZ JAPAN Japanese direct-to-consumer store on the existing Next.js site, with RMS inventory synchronization, Stripe checkout, and manual fulfillment.

**Architecture:** Replace the current single-page promotional component with server-rendered catalog routes and focused client components for cart and checkout interactions. PostgreSQL owns the storefront catalog, orders, reservations, and synchronization log; a scheduled RMS adapter updates availability, while fulfillment remains a replaceable manual provider for the first release.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, PostgreSQL via `postgres`, Stripe, RMS InventoryAPI 2.1, Vitest, Vercel Cron.

## Global Constraints

- Seller copy must identify アジャズジャパン株式会社, the confirmed address, telephone number, representative director, and `xiet@a-jazz.com`.
- Japanese domestic shipping is free nationwide and dispatch target is within three business days.
- Returns/exchanges are accepted within seven days with customer-paid shipping; AJAZZ pays shipping for verified initial defects.
- RMS is the first-release availability source; RSL BOSS integration is out of scope.
- Stripe handles payment data; no payment-card data is stored by the application.
- Image URLs are `https://image.rakuten.co.jp/ajazz/cabinet` plus each RMS `商品画像パス`.
- Visual system follows the approved AJAZZ Performance Edit: white/neutral surfaces, AJAZZ Red, geometric linework, measured performance data, no neon-esports theme.

---

## File Structure

- `lib/commerce/types.ts`: product, variant, order, inventory, and fulfillment contracts.
- `lib/commerce/db.ts`: PostgreSQL client and schema migration helpers.
- `lib/commerce/catalog.ts`: catalog reads, variant availability, and RMS-import upserts.
- `lib/commerce/orders.ts`: reservations, order state transitions, and fulfillment records.
- `lib/rms/client.ts`: authenticated RMS InventoryAPI adapter with bounded retries.
- `lib/rms/sync.ts`: inventory synchronization orchestration and sync log writes.
- `app/(store)/*`: public catalog, cart, legal, driver-download, and order-lookup routes.
- `app/api/commerce/*`: cart checkout, Stripe webhook, RMS cron, and order lookup handlers.
- `app/admin/orders/*`: protected operational order console.
- `components/store/*`: AJAZZ Performance Edit navigation, catalog, product, cart, and checkout UI.
- `scripts/import-rms-catalog.ts`: one-time idempotent import of the supplied RMS workbook.
- `tests/*`: unit, route, and RMS/Stripe contract tests.

### Task 1: Establish Commerce Contracts and Test Harness

**Files:**
- Create: `lib/commerce/types.ts`, `tests/commerce/types.test.ts`, `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces `Product`, `ProductVariant`, `CartLine`, `OrderStatus`, and `FulfillmentProvider` types used by all later tasks.

- [ ] **Step 1: Add failing contract test**

```ts
import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "@/lib/commerce/types";

it("allows paid orders to move to awaiting fulfillment only", () => {
  expect(canTransitionOrder("paid", "awaiting_fulfillment")).toBe(true);
  expect(canTransitionOrder("shipped", "paid")).toBe(false);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `pnpm test -- tests/commerce/types.test.ts`
Expected: FAIL because the test command and module do not exist.

- [ ] **Step 3: Add Vitest and minimal domain contract**

```ts
export type OrderStatus = "paid" | "awaiting_fulfillment" | "shipped" | "cancelled" | "refund_pending" | "refunded";
export const canTransitionOrder = (from: OrderStatus, to: OrderStatus) =>
  (from === "paid" && to === "awaiting_fulfillment") ||
  (from === "awaiting_fulfillment" && ["shipped", "cancelled", "refund_pending"].includes(to)) ||
  (from === "refund_pending" && to === "refunded");
```

- [ ] **Step 4: Run `pnpm test` and `pnpm lint`; both pass.**
- [ ] **Step 5: Commit** `test: establish commerce contracts`.

### Task 2: Build Catalog Schema and RMS Workbook Import

**Files:**
- Create: `lib/commerce/db.ts`, `lib/commerce/catalog.ts`, `scripts/import-rms-catalog.ts`, `tests/commerce/catalog.test.ts`
- Modify: `package.json`, `.env.example`

**Interfaces:**
- Consumes `ProductVariant`.
- Produces `upsertRmsCatalog(rows)`, `getPublishedProducts()`, and `getProductBySlug(slug)`.

- [ ] **Step 1: Write failing import test** asserting `/124.../1.jpg` becomes `https://image.rakuten.co.jp/ajazz/cabinet/124.../1.jpg`, duplicate `商品管理番号 + SKU管理番号` rows upsert once, and empty SKU rows create parent products only.
- [ ] **Step 2: Run** `pnpm test -- tests/commerce/catalog.test.ts`; expected FAIL.
- [ ] **Step 3: Create tables** `products`, `product_variants`, `product_images`, and `inventory_sync_logs`; use unique keys `(rms_manage_number)` and `(product_id, rms_sku_number)` and store price/inventory as integer JPY/count values.
- [ ] **Step 4: Implement importer** using `exceljs`; parse the supplied 83-column RMS workbook, preserve Japanese copy, normalize up to 20 image paths, and upsert in a database transaction.
- [ ] **Step 5: Run importer against a disposable database**, then test and lint; expected PASS.
- [ ] **Step 6: Commit** `feat: import RMS catalog and images`.

### Task 3: Add RMS Inventory Synchronization

**Files:**
- Create: `lib/rms/client.ts`, `lib/rms/sync.ts`, `app/api/cron/rms-inventory/route.ts`, `tests/rms/sync.test.ts`
- Modify: `vercel.json`, `.env.example`

**Interfaces:**
- Consumes RMS application credentials, `getActiveVariantKeys()`, and `setVariantInventory()`.
- Produces `syncRmsInventory(): Promise<{ updated: number; failed: number }>`.

- [ ] **Step 1: Write failing tests** for 1,000-record batch requests, last-known-good stock after a failed batch, and a sync-log row with failure reason.
- [ ] **Step 2: Run** `pnpm test -- tests/rms/sync.test.ts`; expected FAIL.
- [ ] **Step 3: Implement adapter** for `inventories.bulk.get`, enforce the documented request limits, validate response SKU keys, and mask credentials in errors.
- [ ] **Step 4: Implement cron route** requiring `Authorization: Bearer ${CRON_SECRET}` and configure a five-minute schedule only after confirming the deployed Vercel plan supports it.
- [ ] **Step 5: Run unit tests with mocked RMS responses and lint; expected PASS.**
- [ ] **Step 6: Commit** `feat: synchronize RMS inventory`.

### Task 4: Build AJAZZ Performance Storefront and Driver Downloads

**Files:**
- Create: `app/(store)/layout.tsx`, `app/(store)/page.tsx`, `app/(store)/products/[slug]/page.tsx`, `app/(store)/drivers/page.tsx`, `components/store/*`, `tests/storefront/product-page.test.tsx`
- Modify: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `app/sitemap.ts`

**Interfaces:**
- Consumes `getPublishedProducts()`, `getProductBySlug()`, and `ProductVariant`.
- Produces server-rendered catalog and product pages with `AddToCartButton`.

- [ ] **Step 1: Write failing product page test** asserting a published variant shows JPY price, available/unavailable state, normalized image URL, free-shipping copy, and the seven-day returns copy.
- [ ] **Step 2: Run** `pnpm test -- tests/storefront/product-page.test.tsx`; expected FAIL.
- [ ] **Step 3: Implement routes and components** using approved white/red geometric design, responsive navigation, category listing, performance hero, variant selector, and a model-filtered driver download list.
- [ ] **Step 4: Replace old external Rakuten/Amazon purchase buttons** with internal product links; preserve `/survey` and its administration routes unchanged.
- [ ] **Step 5: Run test, `pnpm lint`, and `pnpm build`; inspect desktop and mobile screenshots.**
- [ ] **Step 6: Commit** `feat: build AJAZZ storefront and drivers`.

### Task 5: Implement Cart, Stripe Checkout, and Stock Reservation

**Files:**
- Create: `lib/commerce/cart.ts`, `lib/commerce/reservations.ts`, `app/cart/page.tsx`, `app/api/commerce/checkout/route.ts`, `tests/commerce/checkout.test.ts`
- Modify: `package.json`, `.env.example`, `components/store/AddToCartButton.tsx`

**Interfaces:**
- Consumes `CartLine[]` and `reserveVariants(lines, reservationId)`.
- Produces a Stripe Checkout session `{ checkoutUrl: string }`.

- [ ] **Step 1: Write failing tests** for unavailable variants, price lookup from DB rather than the browser, one reservation per checkout idempotency key, and JPY free shipping.
- [ ] **Step 2: Run** `pnpm test -- tests/commerce/checkout.test.ts`; expected FAIL.
- [ ] **Step 3: Implement DB-backed cart validation and atomic reservation**, expiring unpaid reservations after 15 minutes.
- [ ] **Step 4: Create Stripe Checkout sessions** with Japanese line-item names, Japanese address collection, JPY, and `shipping_options` set to zero.
- [ ] **Step 5: Run mocked Stripe tests, lint, and build; expected PASS.**
- [ ] **Step 6: Commit** `feat: add Stripe checkout and reservations`.

### Task 6: Persist Stripe Events, Orders, and Customer Emails

**Files:**
- Create: `lib/commerce/orders.ts`, `lib/commerce/email.ts`, `app/api/stripe/webhook/route.ts`, `tests/commerce/webhook.test.ts`
- Modify: `lib/commerce/db.ts`, `.env.example`

**Interfaces:**
- Consumes signed Stripe webhook payloads.
- Produces idempotent `createPaidOrderFromSession(session)` and Japanese confirmation/refund/shipment email functions.

- [ ] **Step 1: Write failing webhook tests** for a valid `checkout.session.completed`, duplicate delivery, invalid signature, and expired reservation.
- [ ] **Step 2: Run** `pnpm test -- tests/commerce/webhook.test.ts`; expected FAIL.
- [ ] **Step 3: Add `orders`, `order_items`, `payments`, `refunds`, and `fulfillments` tables** with Stripe IDs unique and explicit order-state transitions.
- [ ] **Step 4: Verify Stripe signature from raw request body**, persist paid orders atomically, consume reservations, and send the Japanese confirmation email once.
- [ ] **Step 5: Run tests, lint, build; expected PASS.**
- [ ] **Step 6: Commit** `feat: persist paid orders from Stripe webhooks`.

### Task 7: Deliver Protected Manual-Fulfillment Admin

**Files:**
- Create: `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx`, `app/api/admin/orders/[id]/route.ts`, `tests/admin/orders.test.ts`
- Modify: `proxy.ts`, `lib/commerce/orders.ts`

**Interfaces:**
- Consumes existing admin session protection and `updateOrderStatus(input)`.
- Produces order filtering, tracking-number recording, refund initiation, and CSV export.

- [ ] **Step 1: Write failing authorization and transition tests** for unauthenticated access, `awaiting_fulfillment -> shipped`, duplicate tracking update, and invalid state changes.
- [ ] **Step 2: Run** `pnpm test -- tests/admin/orders.test.ts`; expected FAIL.
- [ ] **Step 3: Extend the existing admin auth boundary** to cover `/admin/orders` without weakening survey-admin access; render Japanese order list/detail views.
- [ ] **Step 4: Add Stripe refund action and tracking-number form**, transition orders only after Stripe confirmation, and send the appropriate Japanese email.
- [ ] **Step 5: Run tests, lint, build, and manual browser workflow.**
- [ ] **Step 6: Commit** `feat: add manual order fulfillment admin`.

### Task 8: Add Legal Pages, Domain Configuration, and Launch Verification

**Files:**
- Create: `app/(store)/legal/[page]/page.tsx`, `app/(store)/orders/page.tsx`, `docs/operations/ajazz-japan-launch.md`
- Modify: `app/robots.ts`, `app/sitemap.ts`, `app/layout.tsx`, `README.md`

**Interfaces:**
- Consumes confirmed seller, shipping, returns, support, and order-lookup rules.
- Produces Japanese legal routes and a launch runbook.

- [ ] **Step 1: Write failing route tests** for all legal slugs and assertions for seller identity, telephone, free nationwide shipping, three-business-day dispatch target, and seven-day return policy.
- [ ] **Step 2: Run** the focused tests; expected FAIL.
- [ ] **Step 3: Implement legal and order-lookup pages**, metadata, canonical `https://ajazz.jp` URLs, and Japanese transactional-copy templates.
- [ ] **Step 4: Document production environment variables** (`STRIPE_*`, RMS credentials, `CRON_SECRET`, database URL, email provider, admin secret) without placing secrets in the repository.
- [ ] **Step 5: Execute launch checklist:** import catalog, test RMS sync, Stripe test payment/refund/webhook, unavailable SKU, mobile checkout, email delivery, tracking notification, and Vercel production build.
- [ ] **Step 6: Commit** `docs: prepare AJAZZ Japan store launch`.

## Plan Self-Review

- Spec coverage: Tasks 2-3 cover RMS catalog/images/inventory; Tasks 4-5 cover the approved storefront, driver downloads, cart, and Stripe; Tasks 6-7 cover orders, refunds, email, and manual fulfillment; Task 8 covers legal pages, `ajazz.jp`, operations, and launch validation.
- Placeholder scan: no unresolved placeholders or unspecified interfaces remain.
- Type consistency: `ProductVariant`, `OrderStatus`, `reserveVariants`, `syncRmsInventory`, and `createPaidOrderFromSession` are introduced before their consumers.
