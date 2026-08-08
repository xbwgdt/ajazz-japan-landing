# Task 5 Report: Atomic Product Publication

## Scope

- Base commit: `6d245c8`
- Implemented CMS draft publication and unpublication into the existing commerce tables.
- Preserved numeric `products.id`, `product_variants.id`, and all order/reservation foreign keys.
- No live database, R2, RMS, Stripe, Railway, Cloudflare, deployment, push, or production migration was used.

## Implementation

- Added a framework-independent publication orchestrator with strict validation before commerce writes, stale-revision rejection, approved comparison-price enforcement, resolved-media requirements, atomic image/variant replacement, missing-variant disabling, and authoritative commerce audit insertion.
- The publication service now opens one Payload transaction, takes a product-scoped PostgreSQL advisory lock on that transaction, reads the locked draft, writes commerce state through the same transaction connection, then updates CMS metadata and writes the CMS audit before commit. Single-product edit hooks take the same lock.
- Existing operational product and variant rows are locked and updated in place. `operationalVariantId` is the highest-priority product-scoped match, so numeric IDs survive SKU changes.
- Added same-origin administrator-only publish and unpublish routes requiring `{ expectedRevision: number }`. Missing origins, malformed JSON, invalid revisions, unauthenticated requests, validation failures, and stale revisions receive explicit status codes.
- Payload publication metadata and both CMS/commerce audit records commit atomically with the live snapshot and share the same correlation ID. Cache paths are revalidated only after commit.
- Same-revision publication replay is allowed, while only a newer live revision is rejected. This makes a retry after a committed response-loss/crash safe; CMS-side failures roll the complete transaction back.
- Unpublication accepts a current CMS revision newer than the last publication, advances the public publication revision, and rejects only newer public state.
- Missing-variant retirement is based on the numeric IDs returned by upsert, so legacy rows with `NULL cms_variant_id` are also disabled.
- Product rich text uses the official Lexical-to-HTML converter and preserves headings, lists, and links.
- Added nullable CMS links, manual-product source fields, merchandising/SEO/publication fields, partial non-null RMS uniqueness, append-only publication/inventory audit tables, and active variant fields.
- Updated RMS catalog conflict targets to infer the new partial indexes. Both product and variant RMS upserts remain idempotent.
- Updated storefront and checkout queries so inactive variants cannot render, price, or reserve stock after unpublication.
- Added Payload metadata fields and a reviewable additive CMS migration plus synchronized migration snapshot.

## TDD Evidence

Initial RED run failed as expected because `publication.ts` and `publication-store.ts` did not exist, operational publication columns were absent, the RMS conflict target did not infer a partial index, and storefront queries did not filter inactive variants.

Additional RED runs proved:

- inactive CMS variants were initially written instead of disabled;
- checkout reservation locking initially accepted inactive variants;
- append-only audit triggers were initially absent;
- publication routes initially accepted missing `Origin` and mapped malformed JSON to 500.

The initial Task 5 run passed 10 files and 62 tests. After review remediation, the final focused run passed 14 files and 89 tests, including concurrency, replay recovery, rich-text structure, route errors, Task 1-4 revision and bulk-update safeguards, storefront, and checkout behavior:

```text
tests/cms/publication.test.ts
tests/cms/publication-store.test.ts
tests/cms/publication-routes.test.ts
tests/cms/publication-transaction.test.ts
tests/cms/publication-draft.test.ts
tests/cms/product-schema.test.ts
tests/cms/product-concurrency.test.ts
tests/cms/product-access.test.ts
tests/cms/product-bulk-update.test.ts
tests/commerce/db.test.ts
tests/commerce/catalog.test.ts
tests/commerce/storefront.test.ts
tests/commerce/checkout.test.ts
tests/commerce/checkout-handler.test.ts

Test Files  14 passed (14)
Tests       89 passed (89)
```

## Build and Static Verification

- Final direct Node Next build: passed with Next.js 16.2.10 in 257.5 seconds; 17/17 static pages generated and publish/unpublish routes were included in the production route table.
- Direct Node `tsc --noEmit`: passed after the build.
- `git diff --check`: passed; only Git line-ending notices were emitted.
- Task 5 migration snapshot JSON parses successfully.

## Migration Boundary

- `lib/commerce/db.ts` contains additive, explicitly qualified Task 5 DDL and compatibility changes for existing RMS uniqueness constraints.
- `cms/migrations/20260809_022600_task5_publication_metadata.ts` adds only the Payload publication metadata columns and has a matching down migration.
- Payload's migration generator was not forced with a real secret or database connection. It stopped locally because no `PAYLOAD_SECRET` was supplied; the migration and snapshot were therefore added manually and remain subject to disposable-database rehearsal in Task 11.
- No schema command was executed against any live or local external database.

## Remaining Concerns

- PostgreSQL behavior is covered with transaction-boundary mocks and SQL assertions, not a real disposable PostgreSQL instance. Constraint names, partial-index inference, triggers, and rollback must be rehearsed against a restored disposable database before production.
- A process failure after the database commit but before the HTTP response can cause a same-revision replay and an additional append-only audit event. The live snapshot remains idempotent and the correlation IDs make both attempts observable.
- Media resolution was tested without live R2. Production R2 and Payload media delivery remain gated on the later acceptance run.
- No production delivery is allowed until the separate credential-rotation and Git-history gate is completed.
