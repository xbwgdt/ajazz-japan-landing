# Storefront Visual System Task 3 Report

## Status

DONE

## Implementation

- Extended storefront card data with the minimum positive variant price, the approved comparison price from that same variant, earned points, and aggregate availability.
- Kept comparison-price safety aligned with product detail by selecting `compare_at_price_jpy` only when `compare_at_price_approved` is true.
- Added a final storefront-adapter guard so the selected variant's approved comparison price is exposed only when it is finite and strictly greater than that same variant's sale price.
- Routed fallback catalogue products through the same storefront adapter as database products.
- Rebuilt product cards with dark product wells, complete product imagery, stable commerce and thumbnail rows, local image-variant selection, and a separate product-view link.
- Added explicit search, category, count, clear, grid, and empty-state classes.
- Converted homepage metrics, catalogue, and service commitments into dark full-width bands while leaving the approved hero unchanged.
- Added responsive 3/2/1 product grids and fixed empty grid cells so incomplete final rows remain dark.

## TDD Evidence

- Initial focused run: 4 failures because commerce metadata and card rendering did not exist.
- Empty-grid regression test: failed before card-owned separators were added.
- Review regression RED run: the new adapter test failed with `expected 12000 to be undefined`, proving an approved comparison price equal to the selected sale price was still exposed.
- Review regression GREEN run: adapter and product-card rendering tests passed 9/9 after the final comparison-price guard was added.
- Final focused run: 6 files, 20 tests passed.
- Final storefront run: 13 files, 42 tests passed.

## Verification

- `pnpm exec vitest run tests/commerce/storefront.test.ts tests/storefront/catalogue-commerce-meta.test.tsx tests/storefront/product-card.test.tsx tests/storefront/product-catalogue.test.tsx tests/storefront/japanese-copy.test.tsx tests/storefront/hero-visual.test.tsx`: PASS, 20/20.
- `pnpm exec vitest run tests/storefront`: PASS, 42/42.
- `pnpm run build`: PASS, 16 static pages generated and all production routes compiled.
- `pnpm run lint`: PASS (`tsc --noEmit`).
- `git diff --check`: PASS.

## Browser QA

- 1440x1000: three-column grid, complete `object-fit: contain` imagery, dark graphite service band, no horizontal page overflow.
- 375x812: one-column grid, 48px variant thumbnails, visible 48px product command, no horizontal page overflow.
- Verified the final incomplete desktop grid row remains black instead of exposing the separator background.

## Files Changed

- `app/page.tsx`
- `app/storefront.css`
- `components/store/ProductCard.tsx`
- `components/store/ProductCatalogue.tsx`
- `components/store/Storefront.tsx`
- `lib/commerce/storefront-db.ts`
- `lib/commerce/storefront.ts`
- `tests/commerce/storefront.test.ts`
- `tests/storefront/catalogue-commerce-meta.test.tsx`
- `tests/storefront/logo-styling.test.ts`
- `tests/storefront/product-card.test.tsx`
- `tests/storefront/product-catalogue.test.tsx`
- `tests/storefront/site-settings-rendering.test.tsx`

## Review Finding Resolution

- Finding: the homepage adapter exposed an approved comparison price even when it was equal to or below the selected sale price.
- Fix: `toStorefrontCards` now validates that the comparison price is a defined finite number strictly greater than the selected variant's sale price before exposing it.
- Regression coverage: the commerce adapter omits an invalid same-price comparison value, and the product card renders no comparison-price element when the adapter omits it.

## Concerns

- None for Task 3. No remote push or deployment was performed.
- The pre-existing uncommitted changes in `product-admin-task-4-report.md` and `product-admin-task-5-report.md` were not touched, staged, or committed.
