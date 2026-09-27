# Amazon Color Galleries Implementation Plan

> Execute using the executing-plans skill. Design approved by the user on 2026-09-27.

**Goal:** Maintain ordered per-color images in CMS and switch the entire product gallery with the selected variant.

**Architecture:** An opt-in `galleryMode` preserves legacy shared galleries. Variant media relationships flow through draft preview and the transactional publication store into an additive operational image table. Media guards cover all new relationships.

**Stack:** Next.js, React, Payload, PostgreSQL, R2, Vitest.

**Constraints:** Staging only. AF84 draft sample only; no publication or price, stock, identity, specification changes. Preserve old media. Verify exact Amazon model/color before import.

## Tasks

- [x] 1. Add failing interaction tests in `tests/storefront/product-page.test.tsx` for color-only galleries, deduplication, shorter/empty galleries, index reset and legacy compatibility. Implement `ProductDetail.tsx` and variant interface.
- [x] 2. Add preview and media-reference regression tests. Extend CMS product/variant fields, generated types, draft adapter and lifecycle guards. Run focused tests and typecheck.
- [x] 3. Add publication/read tests. Extend publication draft, snapshot, SQL transaction and storefront reader. Confirm invalid media rejects publication and writes remain transactional.
- [x] 4. Generate additive CMS/version migrations and operational table migration. Validate on an isolated database, run full tests/build, then deploy staging only.
- [x] 5. Audit AF84 six colors against available Amazon variants and ordered images. Save a source mapping and before snapshot; upload verified images and update only the AF84 draft with revision protection.
- [ ] 6. Verify six colors on desktop and 390px mobile, media loading, no purchase in preview, and unchanged non-image catalog fields. Report exact incomplete mappings rather than substituting another color.

## Verification

Run tests through `node node_modules/vitest/vitest.mjs run`, typecheck through `node node_modules/typescript/bin/tsc --noEmit`. A passing code suite does not establish that external data is imported or staging is deployed; verify each separately.

Local verification: 490 tests in 90 files passed; TypeScript and Next.js build passed. `scripts/verify-color-gallery-migration.ts` passed the full eight-migration chain in an isolated PGlite database, including ordered publication images and simulated write-failure rollback. No staging data has been changed by these tests.

Staging deployment `653418ce-7141-4e87-a8fd-bcfd03cfe828` is SUCCESS. AF84 read-back includes the new `galleryMode`, variant gallery, ASIN and source URL fields. Source audit found four Amazon color groups (36 images); yellow and pale pink are not present in this Amazon variation family. Amazon's pink label is the existing rose-red SKU, not the pale pink SKU. All four contact sheets were visually checked before upload.
