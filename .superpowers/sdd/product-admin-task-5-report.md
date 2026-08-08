# Task 5 Report: Atomic Product Publication

## Scope

- Base commit: `6d245c8`
- Implemented CMS draft publication and unpublication into the existing commerce tables.
- Preserved numeric `products.id`, `product_variants.id`, and all order/reservation foreign keys.
- No live database, R2, RMS, Stripe, Railway, Cloudflare, deployment, push, or production migration was used.

## Implementation

- Added a framework-independent publication orchestrator with strict pre-transaction validation, stale-revision rejection, approved comparison-price enforcement, resolved-media requirements, atomic image/variant replacement, missing-variant disabling, and authoritative commerce audit insertion.
- Added a PostgreSQL publication store using one `commerceSql().begin(...)` block. Existing operational product and variant rows are locked and updated in place so their numeric IDs remain stable.
- Added same-origin administrator-only publish and unpublish routes requiring `{ expectedRevision: number }`. Missing origins, malformed JSON, invalid revisions, unauthenticated requests, validation failures, and stale revisions receive explicit status codes.
- Payload publication metadata is updated only after the commerce transaction commits. The CMS and commerce audit records share the same correlation ID, and home/product paths are revalidated afterward.
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

The final focused run passed 10 files and 62 tests, including Task 1-4 revision and bulk-update safeguards:

```text
tests/cms/publication.test.ts
tests/cms/publication-store.test.ts
tests/cms/publication-routes.test.ts
tests/cms/product-access.test.ts
tests/cms/product-bulk-update.test.ts
tests/commerce/db.test.ts
tests/commerce/catalog.test.ts
tests/commerce/storefront.test.ts
tests/commerce/checkout.test.ts
tests/commerce/checkout-handler.test.ts

Test Files  10 passed (10)
Tests       62 passed (62)
```

## Build and Static Verification

- Direct Node Next build: passed with Next.js 16.2.10; publish and unpublish routes were included in the production route table.
- Direct Node `tsc --noEmit`: passed.
- `git diff --check`: passed; only Git line-ending notices were emitted.
- Task 5 migration snapshot JSON parses successfully.

## Migration Boundary

- `lib/commerce/db.ts` contains additive, explicitly qualified Task 5 DDL and compatibility changes for existing RMS uniqueness constraints.
- `cms/migrations/20260809_022600_task5_publication_metadata.ts` adds only the Payload publication metadata columns and has a matching down migration.
- Payload's migration generator was not forced with a real secret or database connection. It stopped locally because no `PAYLOAD_SECRET` was supplied; the migration and snapshot were therefore added manually and remain subject to disposable-database rehearsal in Task 11.
- No schema command was executed against any live or local external database.

## Remaining Concerns

- PostgreSQL behavior is covered with transaction-boundary mocks and SQL assertions, not a real disposable PostgreSQL instance. Constraint names, partial-index inference, triggers, and rollback must be rehearsed against a restored disposable database before production.
- Commerce commit is authoritative. A later Payload metadata or cache-revalidation failure cannot roll back the already committed live snapshot; the shared correlation ID exists so operations can detect and reconcile that state.
- Media resolution was tested without live R2. Production R2 and Payload media delivery remain gated on the later acceptance run.
- No production delivery is allowed until the separate credential-rotation and Git-history gate is completed.
