# Storefront Visual Task 1 Report

## Status

COMPLETE

The Task 1 implementation was independently reviewed, corrected where needed, verified with the required scoped commands, and committed locally. The repository-wide `pnpm test` result remains intentionally incomplete: the earlier run timed out and the user explicitly instructed that it must not be rerun.

## Implementation

- Added the approved storefront tokens in `app/storefront.css`:
  - `--store-bg:#07080c`
  - `--store-surface:#111318`
  - `--store-surface-raised:#181b21`
  - `--store-line:#2b2f37`
  - `--store-text:#f7f7f8`
  - `--store-text-muted:#a7abb3`
  - `--store-accent:#e93b43`
  - `--store-success:#65c987`
  - `--store-danger:#ff626b`
- Added the 760px and 1024px responsive breakpoints, 44px control sizing, shared `:focus-visible` treatment, and reduced-motion handling.
- Moved public storefront CSS to `app/storefront.css` while retaining the existing global light baseline and administrative `.store-admin*` rules in `app/globals.css`.
- Replaced the migrated cream-era storefront palette with the approved dark tokens while retaining the existing selector contracts.
- Configured `Barlow_Condensed` and `Noto_Sans_JP` through `next/font/google`, with `display: "swap"`, CSS variables `--font-store-display` and `--font-store-body`, and both variables applied to `<body>`.
- Derived `public/brand/ajazz-japan-logo-dark.png` from the existing JPEG with Sharp. The source JPEG remains tracked and unmodified. The PNG is 414x161 RGBA with a transparent canvas, retained red symbol, and white lettering.
- Updated all storefront headers and footers to use the dark-surface PNG. The review found that the generated asset was otherwise unused, leaving the migrated dark UI to render the old light JPEG. `logo-styling.test.ts` now prevents that regression.
- Updated `tests/storefront/logo-styling.test.ts` to read `app/storefront.css`.
- Added the required visual-token and logo-asset tests.

## Historical Original TDD Evidence

### Initial environment invocation

Command:

```powershell
pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts
```

Result: exit 1 before Vitest started because Node was not on this PowerShell session's `PATH`:

```text
'node' is not recognized as an internal or external command,
operable program or batch file.
```

This was not counted as RED evidence.

### RED

Command:

```powershell
$env:Path='C:\Users\bwgd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path; pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts
```

Result: exit 1; 2 test files failed as expected. `visual-tokens.test.ts` failed with `ENOENT` for `app/storefront.css`, and `logo-asset.test.ts` failed with `ENOENT` for `public/brand/ajazz-japan-logo-dark.png`. This is the real RED result caused by the missing required implementation files.

### GREEN

Final command after implementation and cleanup:

```powershell
$env:Path='C:\Users\bwgd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path; pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts tests/storefront/logo-styling.test.ts
```

Result: exit 0; 3 test files passed, 5 tests passed, duration 1.03s.

## Historical Additional Verification

- `pnpm exec vitest run tests/storefront`: exit 0; 11 test files passed, 28 tests passed, duration 8.41s. This included `product-card.test.tsx`.
- `pnpm run build`: exit 0; Next.js 16.2.10 production build compiled successfully, TypeScript completed, and 16/16 static pages generated. `scripts/prepare-standalone-assets.mjs` also completed.
- `pnpm run lint`: exit 0; `tsc --noEmit` completed with no errors.
- `git diff --check`: exit 0.
- Dark-logo pixel verification: 57,238 transparent pixels, 4,430 qualifying red pixels, and 3,327 qualifying near-white pixels. All exceed the required threshold of 1,000.
- Visual inspection confirmed transparent background, red symbol, white `AJAZZ JAPAN` lettering, and preserved source geometry.
- Repository-wide `pnpm test`, attempt 1: exit 124 after 123.3s because the command exceeded its 120-second limit; no Vitest result was returned.
- Repository-wide `pnpm test`, attempt 2: interrupted by the user before completion; no result is claimed. The process was stopped and a process check returned `Remaining matching processes: 0`.

## Final Verification And Commit

- Focused required test command: exit 0; 3 test files passed, 6 tests passed, duration 1.03s.
- Complete storefront suite: exit 0; 11 test files passed, 29 tests passed, duration 7.19s.
- `pnpm run build`: exit 0; compiled successfully, TypeScript completed, and 16/16 static pages generated.
- `pnpm run lint`: exit 0; `tsc --noEmit` completed with no errors.
- `git diff --check`: exit 0.
- Local commit: `feat: add storefront visual foundation`.

## Review Fixes: Public-Style Isolation And Accessibility

### Fixes Applied

- Removed the global `body` background, color, and font declarations from `app/storefront.css`; storefront styling remains on public storefront wrappers.
- Restored `.store-admin`, `.store-admin__*`, `.store-shipment-form`, `.store-refund`, and `.store-restock` to `app/globals.css` with their exact pre-Task-1 light values.
- Replaced negative logo offsets and absolute positioning with contained sizing for the cropped transparent PNG, and removed the white dark-nav logo backing.
- Changed catalogue search, clear, and empty-state command controls to `--store-surface-raised` backgrounds with `--store-text` foregrounds.
- Increased `.store-cart` and `.store-cart-quantity button` to explicit 44px minimum width and height.
- Expanded the token and style tests to cover all nine required tokens, stylesheet isolation, restored admin styles, contrast, logo containment, and the two exact touch-target selectors.
- Did not implement the reviewer’s shared header/footer finding because it is explicitly assigned to Task 2.

### TDD Evidence

#### RED

Command:

```powershell
$env:Path='C:\Users\bwgd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path; pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts tests/storefront/logo-styling.test.ts
```

Result: exit 1. Two test files failed with four intended regression failures: legacy absolute logo positioning, missing exact cart touch targets, global `body` styling, and white catalogue-input background.

#### GREEN

Command:

```powershell
$env:Path='C:\Users\bwgd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path; pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts tests/storefront/logo-styling.test.ts
```

Result: exit 0; 3 test files passed, 8 tests passed, duration 2.41s.

### Final Review Verification

- `pnpm exec vitest run tests/storefront`: exit 0; 11 test files passed, 31 tests passed, duration 21.16s.
- `pnpm run build`: exit 0; compiled successfully, TypeScript completed, and 16/16 static pages generated in 43.0s.
- `pnpm run lint`: exit 0; `tsc --noEmit` completed with no errors.
- `git diff --check`: exit 0.
- An initial combined build/lint command exceeded its 120-second wrapper limit and ended with `EPIPE`; the standalone rerun above completed successfully.
- Local fix commit: `fix: isolate storefront visual foundation`.

## Final Baseline Preservation Fix

### Fix Applied

- Restored the exact pre-Task-1 global baseline declaration, `body { background:#f7f5f0; color:#181818; }`, in `app/globals.css` outside `app/storefront.css`.
- Strengthened `visual-tokens.test.ts` to prove that `globals.css` owns the light application baseline while `storefront.css` owns `--store-bg:#07080c` and contains no `body` selector.
- Removed stale pre-commit status and blocking sections from this report; historical original verification is now explicitly labeled.

### TDD Evidence

#### RED

Command:

```powershell
$env:Path='C:\Users\bwgd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path; pnpm exec vitest run tests/storefront/visual-tokens.test.ts --maxWorkers=1 --minWorkers=1 --no-file-parallelism
```

Result: exit 1; `keeps storefront visuals scoped and preserves the light administration styles` failed because `globals.css` did not contain `body { background:#f7f5f0; color:#181818; }`.

#### GREEN

Command:

```powershell
$env:Path='C:\Users\bwgd\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;'+$env:Path; pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts tests/storefront/logo-styling.test.ts --maxWorkers=1 --minWorkers=1 --no-file-parallelism
```

Result: exit 0; 3 test files passed, 8 tests passed, duration 0.99s.

### Final Verification

- `pnpm exec vitest run tests/storefront --maxWorkers=1 --minWorkers=1 --no-file-parallelism`: exit 0; 11 test files passed, 31 tests passed, duration 7.19s.
- `pnpm run build`: exit 0; compiled successfully, TypeScript completed, and 16/16 static pages generated in 40.8s.
- `pnpm run lint`: exit 0; `tsc --noEmit` completed with no errors.
- `git diff --check`: exit 0.
- Local fix commit: `fix: preserve global application baseline`.
