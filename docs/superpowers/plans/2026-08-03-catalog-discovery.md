# AJAZZ JAPAN Catalog Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add canonical RMS product categories plus immediate Japanese keyword search and category filtering to the AJAZZ JAPAN homepage.

**Architecture:** A shared taxonomy module owns stable category keys, labels, normalization, and deterministic RMS classification. PostgreSQL stores the category key, storefront queries preserve it, and a focused client component filters already-loaded product cards without navigation or additional network requests.

**Tech Stack:** Next.js 16, React 19, TypeScript, PostgreSQL through `postgres`, Vitest, existing CSS design system.

## Global Constraints

- Use exactly seven public categories: ラピッドトリガーキーボード、メカニカルキーボード、メンブレンキーボード、マウス、ストリームコントローラー、ヘッドセット、その他.
- Unknown or unsafe classifications must resolve to `other`.
- Preserve product-card color thumbnails, availability, prices, and internal product links.
- Search and filtering must work together without page navigation.
- Controls must use the existing white, black, and AJAZZ red rectangular visual language.
- Do not add structured specification filters, CMS editing, member accounts, or points in this phase.
- Follow test-driven development: every production behavior begins with a failing test.

---

### Task 0: Preserve the validated storefront checkpoint

**Files:**
- Commit: existing validated storefront, product merchandising, company-page, specification, and regression-test changes shown by `git status --short`

**Interfaces:**
- Consumes: the currently verified worktree with 62 passing tests and a passing TypeScript check
- Produces: a clean baseline commit before category-search files are edited

- [ ] **Step 1: Re-run the current baseline verification**

Run:

```powershell
pnpm exec vitest run --maxWorkers=4
pnpm run lint
git diff --check
```

Expected: 28 test files and 62 tests pass; TypeScript exits 0; `git diff --check` reports no errors.

- [ ] **Step 2: Review and commit only the validated baseline**

Run:

```powershell
git status --short
git diff --stat
git add app components lib tests docs/superpowers/specs/2026-07-24-ajazz-japan-commerce-design.md
git commit -m "feat: complete storefront product merchandising"
```

Expected: the accumulated validated storefront work is committed; the catalog-discovery design and this plan remain in their own documentation commits.

---

### Task 1: Define the canonical category taxonomy and classifier

**Files:**
- Create: `lib/commerce/product-categories.ts`
- Modify: `lib/commerce/catalog.ts`
- Modify: `tests/commerce/catalog.test.ts`

**Interfaces:**
- Produces: `ProductCategoryKey`, `PRODUCT_CATEGORIES`, `normalizeProductCategory(value)`, `productCategoryLabel(key)`, and `classifyProductCategory(input)`
- `classifyProductCategory(input)` consumes `{ rmsManageNumber: string; name: string; descriptionHtml: string }` and returns `ProductCategoryKey`
- `RmsCatalogImportProduct.category` uses `ProductCategoryKey`

- [ ] **Step 1: Write failing classifier tests**

Add representative assertions to `tests/commerce/catalog.test.ts`:

```ts
expect(classifyProductCategory({
  rmsManageNumber: "ak820-max-he",
  name: "AK820 MAX HE",
  descriptionHtml: "ラピッドトリガー対応磁気スイッチキーボード",
})).toBe("rapid-trigger-keyboard");

expect(classifyProductCategory({ rmsManageNumber: "aj159-apex", name: "AJ159 APEX", descriptionHtml: "8Kゲーミングマウス" })).toBe("mouse");
expect(classifyProductCategory({ rmsManageNumber: "akp05", name: "AKP05", descriptionHtml: "ストリームコントローラー" })).toBe("stream-controller");
expect(classifyProductCategory({ rmsManageNumber: "ah3", name: "AJAZZ AH3", descriptionHtml: "ゲーミングヘッドセット" })).toBe("headset");
expect(classifyProductCategory({ rmsManageNumber: "ak-membrane", name: "AJAZZ Keyboard", descriptionHtml: "メンブレンキーボード" })).toBe("membrane-keyboard");
expect(classifyProductCategory({ rmsManageNumber: "ak820-pro", name: "AK820 PRO", descriptionHtml: "75% keyboard" })).toBe("mechanical-keyboard");
expect(classifyProductCategory({ rmsManageNumber: "ac-01", name: "USB Hub", descriptionHtml: "" })).toBe("other");
```

Also update expected RMS import products to include the derived `category` field.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
pnpm exec vitest run tests/commerce/catalog.test.ts --maxWorkers=4
```

Expected: FAIL because the taxonomy module and category field do not exist.

- [ ] **Step 3: Implement the taxonomy and classification priority**

Create `lib/commerce/product-categories.ts` with a readonly category definition array and these rules:

```ts
export type ProductCategoryKey =
  | "rapid-trigger-keyboard"
  | "mechanical-keyboard"
  | "membrane-keyboard"
  | "mouse"
  | "stream-controller"
  | "headset"
  | "other";

export function classifyProductCategory(input: {
  rmsManageNumber: string;
  name: string;
  descriptionHtml: string;
}): ProductCategoryKey {
  const text = `${input.rmsManageNumber} ${input.name} ${input.descriptionHtml}`
    .normalize("NFKC")
    .replace(/<[^>]*>/g, " ")
    .toLowerCase();
  const keyboard = /キーボード|keyboard|\bak(?!p)[a-z0-9-]*/.test(text);
  if (keyboard && /ラピッドトリガー|rapid\s*trigger|磁気(?:式|スイッチ)?|magnetic\s*switch|hall\s*effect/.test(text)) return "rapid-trigger-keyboard";
  if (/ゲーミングマウス|\bmouse\b|マウス|\baj\d/.test(text)) return "mouse";
  if (/ストリームコントローラー|stream\s*(?:controller|deck)|\bakp\d/.test(text)) return "stream-controller";
  if (/ヘッドセット|ヘッドホン|headset|headphone/.test(text)) return "headset";
  if (keyboard && /メンブレン|membrane/.test(text)) return "membrane-keyboard";
  if (keyboard) return "mechanical-keyboard";
  return "other";
}
```

Add category labels, safe normalization, the `category` import field, and category assignment after the parent product name and description are known.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
pnpm exec vitest run tests/commerce/catalog.test.ts --maxWorkers=4
```

Expected: PASS.

- [ ] **Step 5: Commit the taxonomy**

```powershell
git add lib/commerce/product-categories.ts lib/commerce/catalog.ts tests/commerce/catalog.test.ts
git commit -m "feat: classify RMS products by category"
```

---

### Task 2: Persist category keys through PostgreSQL and RMS upserts

**Files:**
- Modify: `lib/commerce/db.ts`
- Modify: `lib/commerce/catalog.ts`
- Modify: `tests/commerce/db.test.ts`
- Modify: `tests/commerce/catalog.test.ts`

**Interfaces:**
- Consumes: `RmsCatalogImportProduct.category: ProductCategoryKey`
- Produces: `products.category TEXT NOT NULL DEFAULT 'other'` and category-aware `RmsCatalogWriter.upsertProduct`

- [ ] **Step 1: Write failing persistence tests**

Add assertions:

```ts
expect(commerceSchemaSql).toContain("category TEXT NOT NULL DEFAULT 'other'");
expect(commerceSchemaSql).toContain("ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'");
```

Update the writer test to record `product.category` and expect `product:ak820-max:mechanical-keyboard`.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
pnpm exec vitest run tests/commerce/db.test.ts tests/commerce/catalog.test.ts --maxWorkers=4
```

Expected: FAIL because schema and writer SQL do not persist category.

- [ ] **Step 3: Implement the idempotent schema and upsert**

Add the column to `CREATE TABLE products`, add the `ALTER TABLE` migration, and update the product upsert:

```sql
INSERT INTO products (rms_manage_number, slug, name, description_html, category, published)
VALUES (
  ${product.rmsManageNumber},
  ${product.slug},
  ${product.name},
  ${product.descriptionHtml},
  ${product.category},
  TRUE
)
ON CONFLICT (rms_manage_number) DO UPDATE
SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description_html = EXCLUDED.description_html,
  category = EXCLUDED.category,
  published = TRUE,
  updated_at = NOW()
RETURNING id
```

- [ ] **Step 4: Run focused tests and verify GREEN**

```powershell
pnpm exec vitest run tests/commerce/db.test.ts tests/commerce/catalog.test.ts --maxWorkers=4
```

Expected: PASS.

- [ ] **Step 5: Commit persistence changes**

```powershell
git add lib/commerce/db.ts lib/commerce/catalog.ts tests/commerce/db.test.ts tests/commerce/catalog.test.ts
git commit -m "feat: persist storefront product categories"
```

---

### Task 3: Preserve categories in storefront queries and product cards

**Files:**
- Modify: `lib/commerce/storefront.ts`
- Modify: `lib/commerce/storefront-db.ts`
- Modify: `components/store/catalogue.ts`
- Modify: `components/store/ProductCard.tsx`
- Modify: `tests/commerce/storefront.test.ts`

**Interfaces:**
- `StorefrontCardSource.category?: string` accepts database and fallback values
- `StorefrontCard.category: ProductCategoryKey` always returns a normalized key
- `ProductCard.category` consumes a `ProductCategoryKey` and renders `productCategoryLabel(category)`

- [ ] **Step 1: Write failing card-mapping tests**

Change the existing `toStorefrontCards` input to include `category: "mouse"` and expect the mapped card category to remain `mouse`. Add a second product with an invalid category and expect `other`.

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
pnpm exec vitest run tests/commerce/storefront.test.ts --maxWorkers=4
```

Expected: FAIL because mapping still emits the generic `AJAZZ HARDWARE` label.

- [ ] **Step 3: Implement category propagation**

- Select `p.category` in `listStorefrontDatabaseCards`.
- Pass category into `toStorefrontCards`.
- Normalize unknown values with `normalizeProductCategory`.
- Give every fallback catalog product a canonical key.
- Render the Japanese label inside `ProductCard` while keeping the key in filtering data.

- [ ] **Step 4: Run focused tests and verify GREEN**

```powershell
pnpm exec vitest run tests/commerce/storefront.test.ts tests/storefront/japanese-copy.test.tsx --maxWorkers=4
```

Expected: PASS and Japanese storefront copy remains readable.

- [ ] **Step 5: Commit storefront propagation**

```powershell
git add lib/commerce/storefront.ts lib/commerce/storefront-db.ts components/store/catalogue.ts components/store/ProductCard.tsx tests/commerce/storefront.test.ts
git commit -m "feat: expose product categories in storefront cards"
```

---

### Task 4: Add immediate keyword search and category filtering

**Files:**
- Create: `lib/commerce/catalog-discovery.ts`
- Create: `components/store/ProductCatalogue.tsx`
- Create: `tests/commerce/catalog-discovery.test.ts`
- Modify: `components/store/Storefront.tsx`
- Modify: `tests/storefront/japanese-copy.test.tsx`

**Interfaces:**
- `filterCatalogueProducts(products, { query, category })` returns matching cards without mutating input
- `ProductCatalogue({ products })` owns query and selected-category state and renders `ProductCard`

- [ ] **Step 1: Write failing pure filtering tests**

Create `tests/commerce/catalog-discovery.test.ts` covering:

```ts
expect(filterCatalogueProducts(products, { query: "AJ159", category: "all" }).map(p => p.slug)).toEqual(["aj159"]);
expect(filterCatalogueProducts(products, { query: "", category: "mouse" }).map(p => p.slug)).toEqual(["aj159"]);
expect(filterCatalogueProducts(products, { query: "8k", category: "mouse" }).map(p => p.slug)).toEqual(["aj159"]);
expect(filterCatalogueProducts(products, { query: "headset", category: "mouse" })).toEqual([]);
expect(filterCatalogueProducts(products, { query: "　", category: "all" })).toEqual(products);
```

- [ ] **Step 2: Run the pure test and verify RED**

```powershell
pnpm exec vitest run tests/commerce/catalog-discovery.test.ts --maxWorkers=4
```

Expected: FAIL because the filter module does not exist.

- [ ] **Step 3: Implement normalized filtering**

Normalize with `NFKC`, trim, and lowercase. Match the normalized query against product name, tagline, category key, and Japanese category label. Apply category and query constraints together.

- [ ] **Step 4: Run the pure test and verify GREEN**

```powershell
pnpm exec vitest run tests/commerce/catalog-discovery.test.ts --maxWorkers=4
```

Expected: PASS.

- [ ] **Step 5: Write failing rendered-copy expectations**

Add expectations to the storefront copy test for `製品を検索`, all seven category labels, `件の製品`, and the default pressed state on `すべて`.

- [ ] **Step 6: Run the rendered test and verify RED**

```powershell
pnpm exec vitest run tests/storefront/japanese-copy.test.tsx --maxWorkers=4
```

Expected: FAIL because discovery controls are not rendered.

- [ ] **Step 7: Implement `ProductCatalogue` and integrate it**

The client component must render:

```tsx
<label htmlFor="store-product-search">製品を検索</label>
<input
  id="store-product-search"
  type="search"
  value={query}
  onChange={(event) => setQuery(event.target.value)}
/>
<div aria-label="製品カテゴリ">
  <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>すべて</button>
  {PRODUCT_CATEGORIES.map((item) => (
    <button
      key={item.key}
      type="button"
      aria-pressed={category === item.key}
      onClick={() => setCategory(item.key)}
    >
      {item.label}
    </button>
  ))}
</div>
<p aria-live="polite">{filtered.length}件の製品</p>
```

Render `条件をクリア` only when query or category is active. When no products match, show `条件に一致する製品がありません。` and a reset button. Replace the direct product map in `Storefront` with `<ProductCatalogue products={products} />`.

- [ ] **Step 8: Run component and filtering tests**

```powershell
pnpm exec vitest run tests/commerce/catalog-discovery.test.ts tests/storefront/japanese-copy.test.tsx tests/commerce/storefront.test.ts --maxWorkers=4
```

Expected: PASS.

- [ ] **Step 9: Commit discovery behavior**

```powershell
git add lib/commerce/catalog-discovery.ts components/store/ProductCatalogue.tsx components/store/Storefront.tsx tests/commerce/catalog-discovery.test.ts tests/storefront/japanese-copy.test.tsx
git commit -m "feat: add storefront category search"
```

---

### Task 5: Style, interactively verify, and complete regression checks

**Files:**
- Modify: `app/globals.css`
- Modify: `tests/storefront/logo-styling.test.ts` only if its focused CSS expectations need to accommodate the new adjacent styles

**Interfaces:**
- Consumes: `.store-catalogue-*` classes emitted by `ProductCatalogue`
- Produces: responsive discovery controls with no page-level horizontal overflow

- [ ] **Step 1: Add responsive styles**

Add a full-width discovery toolbar above `.store-product-grid`:

- Desktop: search and result count on the first row, category buttons below.
- Mobile: full-width search, result count below, and a horizontally scrollable category strip contained within the viewport.
- Active category: AJAZZ red background and white text.
- Inactive category: transparent background and black border.
- Focus: visible red outline with offset.
- Empty state: unframed full-width section, not a nested card.

- [ ] **Step 2: Verify desktop behavior in the browser**

At `1440 × 900`:

- Search `AJ159` and confirm only matching cards remain.
- Select `マウス` and confirm combined filtering and count.
- Search an impossible value and confirm the empty state and reset action.
- Reset and confirm all products return.
- Confirm color-thumbnail buttons still update product-card images.

- [ ] **Step 3: Verify mobile behavior in the browser**

At `390 × 844`:

- Confirm no page-level horizontal overflow.
- Confirm the category strip scrolls independently.
- Confirm labels and counts fit without overlap.
- Confirm search, category selection, empty state, and reset work with touch-sized controls.

- [ ] **Step 4: Run complete verification**

```powershell
pnpm exec vitest run --maxWorkers=4
pnpm run lint
pnpm run build
git diff --check
```

Expected: all tests, TypeScript, and Next.js production build pass; no whitespace errors.

- [ ] **Step 5: Commit verified responsive styles**

```powershell
git add app/globals.css
git commit -m "style: finish responsive catalog discovery"
```

- [ ] **Step 6: Review final branch state**

```powershell
git status --short
git log --oneline -6
```

Expected: no uncommitted catalog-discovery changes and a reviewable sequence of focused commits.
