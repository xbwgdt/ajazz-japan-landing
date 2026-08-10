# Task 6 Report: Company And Legal Content

## Scope

- Migrated `/about`, `/legal`, `/privacy`, and `/terms` to the shared `StoreShell`.
- Preserved the approved company, support, business, legal, privacy, and terms copy.
- Kept the responsible person in the legal disclosure only; the company profile has no representative row.
- Added a common dark legal-document hierarchy and restrained editorial entry motion with reduced-motion handling.

## Test Change Review

The `tests/storefront/logo-styling.test.ts` change is required. These four routes now obtain the dark transparent logo through the shared `StoreShell` and `StoreLogo` component instead of referencing the asset directly in each page. The test now verifies that shared ownership and confirms the migrated routes use `StoreShell` without the legacy light-background logo.

## Verification

- `pnpm exec vitest run tests/storefront`: 14 files, 62 tests passed.
- `pnpm build`: passed; Next.js generated 15 static pages and prepared standalone assets.
- `pnpm lint`: passed (`tsc --noEmit`).
- `git diff --check`: passed for the Task 6 files before commit.

## Browser QA

Checked `/about`, `/legal`, `/privacy`, and `/terms` at 1440x900 and 375x812.

- One shared shell and one footer rendered on every route.
- The 414px-wide transparent dark-surface logo loaded successfully.
- No horizontal overflow was found on any checked route.
- Company and legal headings remained within the viewport.
- Mobile menu control remained 44x44px.
- No browser console warnings or errors were recorded.
- Company and legal content remained readable with no overlap or clipped text.

## Guardrails

- No production deployment or remote push was performed.
- `.superpowers/sdd/product-admin-task-4-report.md` and `.superpowers/sdd/product-admin-task-5-report.md` remain unstaged user changes.
- `.superpowers/sdd/progress.md` was not modified.
- Task 7 was not started.
