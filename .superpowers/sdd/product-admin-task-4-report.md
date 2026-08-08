# Task 4 Report: Secure Cloudflare R2 Media Lifecycle

## Status

Implementation complete for review on `feat/ajazz-japan-store`, based on
`6ab5e9d09e889c6fbb41b2c0bdc0e85263ff71c4`.

No real database, R2 bucket, Railway service, or Cloudflare account was accessed.
No deployment, push, production migration, or history rewrite was performed.

## Implemented

- Server-side JPEG, PNG, and WebP signature, MIME, byte-size, dimension, pixel-count,
  animation, and SHA-256 validation with opaque UUID object keys.
- Payload Media upload collection with authenticated writes, public non-retired reads,
  direct deletion disabled, immutable lifecycle metadata, and conditional R2 storage.
- Reference discovery across current product drafts, product versions, variants, and
  the site-settings global when that global exists.
- Authenticated same-origin retirement endpoint with 409 reference summaries and a
  24-hour delayed-deletion window.
- Constant-time bearer-protected cleanup endpoint that rechecks references and deletes
  the R2 object before the Payload record.
- Daily Cloudflare Worker dispatch while retaining inventory and reservation schedules.
- Generated Payload migration, types, and import map.

## Test Evidence

- Focused Task 4 suite:
  `pnpm exec vitest run tests/cms/media-validation.test.ts tests/cms/media-retirement.test.ts tests/cms/media-config.test.ts tests/cms/media-route-auth.test.ts tests/cloudflare/operations-cron.test.ts`
  -> 5 files passed, 31 tests passed.
- Direct Next.js production build -> exit 0; compile, TypeScript, and 17 static pages
  completed.
- Direct `tsc --noEmit` -> exit 0.
- `git diff --check` -> exit 0 (line-ending notices only).

The original worker was interrupted before it wrote RED evidence, so exact failing
test output from before implementation is not claimed here. The controller recovered
the worktree and reran all focused verification above.

## Migration Isolation

- Generated migration: `20260808_145911_secure_r2_media_lifecycle`.
- Static scan: 45 explicit `cms` schema references, zero `public` references, and zero
  unqualified table/type DDL targets.
- The migration backfills existing metadata-only Media rows before applying required
  purpose and content-hash constraints.

## Review Boundaries

- R2 configuration is disabled when `R2_BUCKET` is absent, so local tests and builds do
  not require credentials.
- No live R2 deletion test was run; deletion behavior is covered through injected
  object-deletion fakes.
- Site-settings references are checked conditionally because Task 9 has not created the
  global yet.
- Full repository tests are deferred until review findings are resolved.

## Review Fix: Hardened R2 Media Lifecycle

The findings against `d66f186` were fixed without accessing a live database or R2
bucket and without changing the existing cron schedules.

### Finding Disposition

- Removed `disablePayloadAccessControl` and direct `R2_PUBLIC_URL` generation. R2
  objects remain private and Payload's S3 static handler now enforces the Media read
  rule, which excludes retired media for authenticated and unauthenticated readers.
- Added `alwaysInsertFields: true` and collection prefix `products`. Upload validation
  stores only `<uuid>.<verified-extension>` in `filename`; the server-owned required
  `prefix` field stores `products`, and deletion reconstructs and validates the full key.
- R2 remains disabled when all four runtime variables are absent. Supplying only some
  of bucket, endpoint, access key, and secret throws a value-free configuration error.
- Media updates reject every replacement file with 400 while metadata-only updates
  remain allowed. Temp-file validation calls `stat` before `readFile`.
- Retirement metadata, the post-update reference recheck, and the retirement audit use
  one Payload local-request transaction. Reference or audit failure rolls back the state.
- Cleanup conditionally persists `deletionStartedAt` and its start audit in one
  transaction before R2 deletion. The conditional update prevents duplicate start
  audits when cleanup workers race.
- After idempotent R2 deletion, Payload record deletion and the completion audit use a
  second transaction. Finalization failure rolls back the record so a later run repeats
  `DeleteObject` safely. Tests model the S3 plugin's duplicate after-delete call using
  the same `products/<uuid>.<extension>` key before completion audit.
- Product writes now reject retired IDs across primary, gallery, scene, SEO, variant
  thumbnail, and variant image fields, including retained values on partial updates.
  The reusable service documents the Task 9 site-settings hook integration point.
- Retirement routes return 400 for invalid IDs and 404 for Payload not-found errors.
  Cleanup returns 503 with its summary JSON whenever `failed > 0`.
- Regenerated the Task 4 migration, Payload types, and import map from the Task 3 base.
  `filename` remains required in both directions; `prefix` is required with the
  `products` default; legacy metadata rows are backfilled before required constraints.

### TDD Evidence

- Initial RED: 9 focused files ran; 14 behavior tests failed, 41 existing tests passed,
  and the three new service modules were absent. The temp-file test was corrected before
  implementation after Vitest reported an ESM export-spy limitation.
- Prefix RED: the required server-owned prefix assertion failed before the field was
  added. The migration-path assertion also failed while regeneration was in progress.
- Race/clear RED: 3 tests failed and 10 passed before explicit relationship clearing and
  conditional deletion-start persistence were implemented.
- Final GREEN, direct Node Vitest entry point: 9 files passed, 66 tests passed. This
  includes all focused Task 4 tests, Task 3 `product-access`, and existing cron tests.

### Final Verification

- Direct Node Next.js 16.2.10 production build: exit 0; compile, TypeScript, and all 17
  static pages completed.
- Direct Node `tsc --noEmit`: exit 0.
- Migration/type/import-map generation used
  `postgresql://codex:codex@127.0.0.1:1/ajazz_task4_no_db` with R2 variables removed;
  no migration command was run. Import-map generation reported no new imports.
- Migration static scan: 49 explicit `cms` references, zero `public` references, zero
  unqualified DDL targets, required filename preserved, and required prefix present.
- Runtime scan found no direct-public R2 delivery configuration and the changed files
  contained no credential-like values.
- `git diff --check`: exit 0; only existing line-ending conversion notices were emitted.

### Remaining Boundaries

- No live database migration or R2 operation was run. Object deletion and transaction
  ordering are covered with injected fakes, including failure and retry paths.
- The controller will run the full repository suite after re-review as requested.
