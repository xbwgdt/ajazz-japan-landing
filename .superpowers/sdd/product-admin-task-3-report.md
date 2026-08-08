# Task 3 Report: Editorial Product, Variant, Specification, and Audit Models

## Status

Complete and committed-ready on `feat/ajazz-japan-store`, based on
`8a8b49af6e244306b84cf1a56aad37492da6dfb8`.

No real database was accessed. Payload generation and builds used the deliberately
unreachable local URL `postgresql://codex:codex@127.0.0.1:1/codex`. No deployment,
push, history rewrite, R2 upload work, or Task 4 media lifecycle work was performed.

## Implemented Files

- `lib/cms/product-schema.ts`: normalized editorial product and variant types plus
  deterministic strict publication validation.
- `cms/fields/productVariants.ts`: structured SKU, color, media, price, comparison
  evidence, approval, inventory authority, and active-state fields.
- `cms/fields/productSpecifications.ts`: typed keyboard, mouse, headset, stream
  controller, connection, performance, application, and operating-system fields.
- `cms/collections/Products.ts`: authenticated fixed-tab product editor, permissive
  drafts and versions, custom revision-checked draft update endpoint, hooks, media
  relationships, SEO, revision, and publication metadata.
- `cms/collections/AuditEvents.ts`: authenticated create/read and immutable
  update/delete access with the complete audit action union.
- `cms/collections/Media.ts`: minimal authenticated metadata-only relationship
  target (`media`, `filename`, `alt`). Task 4 owns R2 uploads and lifecycle.
- `cms/hooks/protectSourceFields.ts`: RMS source/variant identity protection,
  explicit conversion context, RMS inventory coercion, optimistic revision check,
  and server-owned revision increments.
- `cms/hooks/writeAuditEvent.ts`: awaited request-scoped audit insertion using
  `overrideAccess: false` and the originating Payload request.
- `payload.config.ts`: registers admins, media, products, and audit events.
- `tests/cms/product-schema.test.ts`, `product-access.test.ts`, `audit.test.ts`:
  focused domain, access, hook, endpoint, transaction, and regression coverage.
- `cms/migrations/20260804_061212_product_editorial_model.{ts,json}` and
  `cms/migrations/index.ts`: generated Task 3 schema migration.
- `payload-types.ts` and `app/(payload)/admin/importMap.js`: regenerated Payload
  artifacts.
- `docs/superpowers/plans/2026-08-04-product-admin-cms.md`: Task 3 now creates the
  minimal Media dependency; Task 4 modifies and hardens it.

## RED Evidence

1. `pnpm vitest run tests/cms/product-schema.test.ts tests/cms/product-access.test.ts tests/cms/audit.test.ts`
   failed with three missing-module suites before production files existed.
2. `pnpm cms:migrate:create product-editorial-model` failed because Payload generated
   `enum__products_v_version_specifications_supported_operating_systems`, exceeding
   PostgreSQL's 63-character identifier limit.
3. The added bounded-name regression failed because `supportedOperatingSystems`
   lacked `dbName: "supported_os"`.
4. The RMS variant identity-set regression failed because an unknown incoming
   operational variant ID resolved instead of rejecting.
5. The slug publication regression failed because an absent uniqueness result was
   accepted.

## GREEN Evidence

- Focused: `pnpm vitest run tests/cms/product-schema.test.ts tests/cms/product-access.test.ts tests/cms/audit.test.ts`
  -> 3 files passed, 24 tests passed.
- Full bounded suite: `pnpm vitest run`
  -> 41 files passed, 142 tests passed.
- Migration: `pnpm cms:migrate:create product-editorial-model`
  -> created `cms/migrations/20260804_061212_product_editorial_model.ts`.
- Types: `pnpm cms:types`
  -> wrote `payload-types.ts` with `Media`, `Product`, and `AuditEvent`.
- Import map: `pnpm cms:importmap`
  -> wrote `app/(payload)/admin/importMap.js`.
- Build: `pnpm build`
  -> Next.js 16.2.10 compiled, TypeScript completed, and 16 static pages generated.
- Post-build lint: `pnpm lint`
  -> `tsc --noEmit`, exit 0.
- Diff check: `git diff --check`
  -> exit 0.

## Migration Isolation Inspection

The generated TypeScript migration was inspected without execution against a
database. A DDL-target scan found 193 create/alter/index/drop statements, 0
unqualified targets, 0 `public` schema references, and 244 explicit `"cms".`
references. Product, version, media, audit, relationship, enum, and Payload lock
changes all target `cms`. No commerce table or `public` schema object is touched.

The generated audit indexes include action, actor, subject type, subject ID, and
Payload's timestamp indexes including `audit_events_created_at_idx`.

## Self-Review

- Draft saves remain permissive through `versions.drafts.validate: false`; the
  strict validator is not installed as a draft hook.
- Publication validation requires one of seven canonical categories, required
  publication fields, primary media, active complete variants, integer yen prices,
  unique case-insensitive SKUs, matching inventory authority, RMS identity, complete
  comparison evidence/approval, and an explicit positive slug uniqueness result.
- RMS product identity, variant membership, operational IDs, RMS SKU IDs, and stable
  SKUs reject mutation unless `context.allowSourceConversion === true`.
- The custom update endpoint requires `expectedRevision`, prechecks it, and passes it
  into the before-change hook to close the check/update race. Local find/update calls
  use `overrideAccess: false` and the same request.
- Product audit writes are awaited in `afterChange`; audit failures reject the
  protected operation and share the Payload request/transaction. Audit writes also
  use `overrideAccess: false`.
- Generated migration/type/import-map artifacts match the registered collections.
- Credential scan found only documented placeholders and test-only dummy values.

## Concerns and Boundaries

- `Media` is intentionally metadata-only in Task 3. It does not upload, validate,
  retire, or delete R2 objects. Task 4 must modify this collection rather than create
  a second one.
- Publication code must perform the slug lookup and pass `slugIsUnique: true` before
  `validateProductDraft` can succeed. Task 3 does not implement publication.
- The generated down migration uses Payload's standard `CASCADE` drops, but every
  target is explicitly inside `cms`; no public commerce object is referenced.
- No live database integration test was run, per the instruction not to access a
  real database. Schema generation, static DDL inspection, unit tests, build, and
  type checks are complete.

## Task 3 Review-Fix Evidence (2026-08-08)

### RED

- `pnpm vitest run tests/cms/product-access.test.ts` initially failed 5 of 14 tests:
  direct Product deletion remained authorized; ordinary create and update calls could
  set `_status: "published"`; and array/non-plain `data` reached `findByID` instead
  of returning a 400 response.

### Fix

- `cms/hooks/protectSourceFields.ts` now rejects every `_status` transition unless a
  private symbol-based `productPublicationContext` is supplied by server code reserved
  for Task 5. Draft saves that do not transition status retain existing behavior.
- `cms/collections/Products.ts` now denies `delete` access for every actor and accepts
  only plain-object `data` in `updateProductWithRevision`.
- `tests/cms/product-access.test.ts` covers blocked native publish attempts, the sole
  trusted publication-context transition, direct deletion denial, and invalid update
  request data.

### GREEN

- `pnpm vitest run tests/cms/product-access.test.ts` -> 1 file passed, 14 tests passed.
- `pnpm vitest run tests/cms/product-schema.test.ts tests/cms/product-access.test.ts tests/cms/audit.test.ts`
  -> 3 files passed, 30 tests passed.
- `pnpm vitest run` -> 41 files passed, 148 tests passed.
- `pnpm build` -> Next.js compiled, TypeScript completed, and 16 static pages generated.
- `pnpm lint` -> `tsc --noEmit`, exit 0.
