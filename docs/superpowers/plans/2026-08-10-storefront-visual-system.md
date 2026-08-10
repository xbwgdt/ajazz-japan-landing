# AJAZZ JAPAN Storefront Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved premium dark gaming visual system to every public AJAZZ JAPAN storefront route while preserving commerce, CMS, legal, and deployment behavior.

**Architecture:** Introduce a code-controlled storefront style sheet and shared public shell, then migrate each route group to those primitives. Keep Payload-owned copy and product data flowing through existing view models, extend catalogue card data only where the approved UI needs price and stock presentation, and leave `/admin` untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Next.js fonts, Sharp, Vitest, happy-dom, Railway staging.

## Global Constraints

- Public storefront only; do not alter the Payload administration theme or behavior.
- Preserve the approved full-bleed gaming desk hero and its CMS override.
- Use `#07080c` page background, graphite surfaces, white text, and `#e93b43` AJAZZ red as the only UI action color.
- Do not add purple UI gradients, glowing decorative cards, HUD ornament, glitch text, or continuous animation.
- Keep the existing AJAZZ logo geometry; derive a transparent red-and-white asset without redrawing it.
- Use one shared header and footer on all public storefront routes.
- Do not create a false member login flow. Reserve the account control as visibly unavailable until membership authentication is implemented.
- Preserve product, price, stock, variant, cart, checkout, legal, CMS, Stripe, RMS, and R2 behavior.
- Keep the two user-owned files `.superpowers/sdd/product-admin-task-4-report.md` and `.superpowers/sdd/product-admin-task-5-report.md` unstaged and unchanged.
- Push only to `fork/feat/ajazz-japan-store` in `xbwgdt/ajazz-japan-landing`.
- Deploy and verify Railway staging only; do not update production or `ajazz.jp` without explicit approval.

---

## File Structure

### New Files

- `app/storefront.css`: all public storefront tokens, layout, responsive rules, focus states, and reduced-motion rules.
- `components/store/StoreLogo.tsx`: single accessible logo primitive using the transparent asset.
- `components/store/StoreHeader.tsx`: responsive public navigation, search anchor, unavailable account control, and cart.
- `components/store/StoreFooter.tsx`: company, contact, driver, legal, and social destinations from site settings.
- `components/store/StoreShell.tsx`: shared page canvas wrapping header, content, and optional footer.
- `public/brand/ajazz-japan-logo-dark.png`: transparent red-symbol and white-lettering logo derived from the approved source.
- `tests/storefront/store-shell.test.tsx`: shared shell, navigation, footer, and unavailable account behavior.
- `tests/storefront/visual-tokens.test.ts`: dark token, responsive, focus, and reduced-motion contract.
- `tests/storefront/logo-asset.test.ts`: transparent logo asset and source-preservation checks.
- `tests/storefront/catalogue-commerce-meta.test.tsx`: card pricing, points, stock, and variant-image behavior.
- `tests/storefront/public-route-shells.test.tsx`: route-level shell coverage for cart, company, legal, privacy, terms, and order confirmation.

### Modified Files

- `app/layout.tsx`: apply Barlow Condensed and Noto Sans JP variables and import `storefront.css`.
- `app/globals.css`: remove the old `.store*` block after equivalent rules move to `storefront.css`.
- `components/store/Storefront.tsx`: use the shared shell and dark homepage sections.
- `components/store/ProductCatalogue.tsx`: dark discovery controls and explicit empty-state classes.
- `components/store/ProductCard.tsx`: price, comparison price, points, stock, and stable product-view affordance.
- `components/store/ProductDetail.tsx`: approved gallery/purchase layout and dark lower sections.
- `components/store/VariantPurchasePanel.tsx`: dark quantity, price, stock, variant, and add-to-cart states.
- `components/store/CartPage.tsx`: content-only cart layout suitable for the shared shell.
- `lib/commerce/storefront.ts`: expose card pricing metadata derived from variants.
- `lib/commerce/storefront-db.ts`: select approved comparison prices for catalogue cards.
- `app/products/[slug]/page.tsx`: load settings and wrap the detail route in the shared shell.
- `app/cart/page.tsx`: load settings and wrap cart content in the shared shell.
- `app/order/success/page.tsx`: use the shared shell and transactional dark layout.
- `app/about/page.tsx`: use the shared shell and dark editorial company sections.
- `app/legal/page.tsx`, `app/privacy/page.tsx`, `app/terms/page.tsx`: use the shared shell and common legal content primitive classes.
- Existing storefront tests: update selectors and style-file locations without weakening behavioral assertions.

---

### Task 1: Establish Visual Tokens, Fonts, And Dark Logo

**Files:**
- Create: `app/storefront.css`
- Create: `public/brand/ajazz-japan-logo-dark.png`
- Create: `tests/storefront/visual-tokens.test.ts`
- Create: `tests/storefront/logo-asset.test.ts`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `tests/storefront/logo-styling.test.ts`

**Interfaces:**
- Produces CSS custom properties `--store-bg`, `--store-surface`, `--store-surface-raised`, `--store-line`, `--store-text`, `--store-text-muted`, `--store-accent`, `--store-success`, and `--store-danger`.
- Produces font variables `--font-store-display` and `--font-store-body` on `<body>`.
- Produces `/brand/ajazz-japan-logo-dark.png` for `StoreLogo`.

- [ ] **Step 1: Write failing visual-token tests**

Create `tests/storefront/visual-tokens.test.ts` that reads `app/storefront.css` and asserts the exact tokens, a 44px touch-target rule, `:focus-visible`, breakpoints at 760px and 1024px, and a `prefers-reduced-motion: reduce` block:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/storefront.css", import.meta.url), "utf8");

describe("storefront visual system", () => {
  it("defines the approved dark tokens", () => {
    expect(css).toContain("--store-bg:#07080c");
    expect(css).toContain("--store-surface:#111318");
    expect(css).toContain("--store-accent:#e93b43");
    expect(css).toContain("--store-text:#f7f7f8");
  });

  it("keeps controls accessible and motion optional", () => {
    expect(css).toMatch(/min-(?:height|width):44px/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (max-width:1024px)");
    expect(css).toContain("@media (max-width:760px)");
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
  });
});
```

- [ ] **Step 2: Write the failing logo-asset test**

Use Sharp metadata and raw pixels to assert PNG alpha, nonzero transparent pixels, red symbol pixels, and near-white lettering pixels. Also assert that the existing light asset still exists:

```ts
import { access, readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("AJAZZ dark-surface logo", () => {
  it("preserves the source asset and provides transparent red and white artwork", async () => {
    await access(new URL("../../public/brand/ajazz-japan-logo.jpg", import.meta.url));
    const file = await readFile(new URL("../../public/brand/ajazz-japan-logo-dark.png", import.meta.url));
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0, red = 0, white = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      const [r, g, b, a] = data.subarray(offset, offset + 4);
      if (a < 16) transparent += 1;
      if (a > 200 && r > 170 && g < 120 && b < 130) red += 1;
      if (a > 200 && r > 220 && g > 220 && b > 220) white += 1;
    }
    expect(transparent).toBeGreaterThan(1_000);
    expect(red).toBeGreaterThan(1_000);
    expect(white).toBeGreaterThan(1_000);
  });
});
```

- [ ] **Step 3: Run the focused tests and confirm failure**

Run:

```powershell
pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts
```

Expected: FAIL because `storefront.css` and the dark logo asset do not exist.

- [ ] **Step 4: Derive the dark logo without redrawing it**

Use the installed Sharp dependency in a one-time Node command. Convert near-white source pixels to alpha, retain red pixels, convert neutral grey artwork pixels to white, crop to the nontransparent bounds with a small transparent margin, and save `public/brand/ajazz-japan-logo-dark.png`. Visually compare it with `public/brand/ajazz-japan-logo.jpg` to confirm identical geometry.

- [ ] **Step 5: Add fonts and the initial storefront style sheet**

In `app/layout.tsx`, configure `Barlow_Condensed` and `Noto_Sans_JP` through `next/font/google` with CSS variables and `display: "swap"`, import `./storefront.css`, and apply both variables to `<body>`. In `app/storefront.css`, define the exact token block and base public-storefront rules. Keep `app/globals.css` unchanged outside the existing `.store*` region.

- [ ] **Step 6: Move old storefront rules out of globals**

Move the complete `.store*` CSS region from `app/globals.css` to `app/storefront.css`, then replace old cream values with the approved tokens. Update `tests/storefront/logo-styling.test.ts` and `tests/storefront/product-card.test.tsx` to read `storefront.css` instead of `globals.css`. Do not move survey, legacy landing, Payload, or unrelated global rules.

- [ ] **Step 7: Run the focused tests**

Run:

```powershell
pnpm exec vitest run tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts tests/storefront/logo-styling.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

```powershell
git add app/layout.tsx app/globals.css app/storefront.css public/brand/ajazz-japan-logo-dark.png tests/storefront/visual-tokens.test.ts tests/storefront/logo-asset.test.ts tests/storefront/logo-styling.test.ts tests/storefront/product-card.test.tsx
git commit -m "feat: add storefront visual foundation"
```

---

### Task 2: Build The Shared Public Storefront Shell

**Files:**
- Create: `components/store/StoreLogo.tsx`
- Create: `components/store/StoreHeader.tsx`
- Create: `components/store/StoreFooter.tsx`
- Create: `components/store/StoreShell.tsx`
- Create: `tests/storefront/store-shell.test.tsx`
- Modify: `components/store/Storefront.tsx`
- Modify: `app/storefront.css`
- Modify: `tests/storefront/driver-links.test.tsx`
- Modify: `tests/storefront/site-settings-rendering.test.tsx`

**Interfaces:**
- `StoreLogo({ className?: string }): React.ReactElement` renders the exact dark-surface logo asset.
- `StoreHeader(): React.ReactElement` renders responsive navigation, search anchor, unavailable account control, and `CartLink`.
- `StoreFooter({ settings }: { settings: SiteSettingsViewModel }): React.ReactElement` renders CMS-controlled company and link data.
- `StoreShell({ settings, children, className?, footer? }): React.ReactElement` wraps all public route content.

- [ ] **Step 1: Write the failing shell test**

Create `tests/storefront/store-shell.test.tsx` with static-render assertions for:

```tsx
const html = renderToStaticMarkup(
  <CartProvider><StoreShell settings={DEFAULT_SITE_SETTINGS}><div>content</div></StoreShell></CartProvider>,
);
expect(html).toContain("/brand/ajazz-japan-logo-dark.png");
expect(html).toContain("製品");
expect(html).toContain("カテゴリ");
expect(html).toContain("会社情報");
expect(html).toContain(DRIVER_DESTINATION);
expect(html).toContain('aria-disabled="true"');
expect(html).toContain(DEFAULT_SITE_SETTINGS.footer.companyName);
expect(html).toContain("/legal");
```

Also assert one `<header>` and one `<footer>` when `Storefront` renders.

- [ ] **Step 2: Run the shell tests and confirm failure**

```powershell
pnpm exec vitest run tests/storefront/store-shell.test.tsx tests/storefront/driver-links.test.tsx tests/storefront/site-settings-rendering.test.tsx
```

Expected: FAIL because the shared shell modules do not exist.

- [ ] **Step 3: Implement the logo and shell components**

Build the four components with semantic landmarks and existing `DRIVER_LINK_PROPS`. Use `CartLink` for the live cart count. Render the account icon as a button with `aria-disabled="true"`, `disabled`, and a Japanese unavailable label; do not add an `/account` link. Use a real menu button and collapsible mobile navigation inside `StoreHeader`, with `aria-expanded`, `aria-controls`, Escape handling, and navigation-close behavior.

- [ ] **Step 4: Replace homepage header and footer duplication**

Make `Storefront` return:

```tsx
<StoreShell settings={settings} className="store-home">
  <section className="store-hero">...</section>
  ...
</StoreShell>
```

Remove direct `.store-nav` and `.store-footer` markup from `Storefront.tsx`.

- [ ] **Step 5: Style desktop and mobile shell states**

Add stable header dimensions, transparent logo sizing, desktop navigation, icon controls, mobile menu layout, footer columns, 44px targets, focus states, and scroll-safe responsive rules. Do not place the header or footer in decorative cards.

- [ ] **Step 6: Run focused tests**

```powershell
pnpm exec vitest run tests/storefront/store-shell.test.tsx tests/storefront/driver-links.test.tsx tests/storefront/site-settings-rendering.test.tsx tests/storefront/hero-visual.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```powershell
git add components/store/StoreLogo.tsx components/store/StoreHeader.tsx components/store/StoreFooter.tsx components/store/StoreShell.tsx components/store/Storefront.tsx app/storefront.css tests/storefront/store-shell.test.tsx tests/storefront/driver-links.test.tsx tests/storefront/site-settings-rendering.test.tsx tests/storefront/hero-visual.test.tsx
git commit -m "feat: add shared storefront shell"
```

---

### Task 3: Redesign Homepage Discovery And Product Cards

**Files:**
- Create: `tests/storefront/catalogue-commerce-meta.test.tsx`
- Modify: `components/store/Storefront.tsx`
- Modify: `components/store/ProductCatalogue.tsx`
- Modify: `components/store/ProductCard.tsx`
- Modify: `lib/commerce/storefront.ts`
- Modify: `lib/commerce/storefront-db.ts`
- Modify: `app/storefront.css`
- Modify: `tests/commerce/storefront.test.ts`
- Modify: `tests/storefront/product-card.test.tsx`
- Modify: `tests/storefront/product-catalogue.test.tsx`
- Modify: `tests/storefront/japanese-copy.test.tsx`

**Interfaces:**
- Extend each card variant with `compareAtPriceJpy?: number`.
- `StorefrontCard` exposes `priceJpy?: number`, `compareAtPriceJpy?: number`, `points: number`, and `available: boolean` derived from the displayed or minimum-price variant.
- `ProductCardProps` consumes those fields and keeps thumbnail selection local.

- [ ] **Step 1: Write failing data and rendering tests**

Extend `tests/commerce/storefront.test.ts` to verify that `toStorefrontCards` chooses the minimum positive price, preserves an approved comparison price, computes `Math.floor(priceJpy / 100)`, and reports aggregate availability. Create `catalogue-commerce-meta.test.tsx` to assert formatted sale price, struck comparison price, points, stock text, and variant thumbnail selection.

- [ ] **Step 2: Run the focused tests and confirm failure**

```powershell
pnpm exec vitest run tests/commerce/storefront.test.ts tests/storefront/catalogue-commerce-meta.test.tsx tests/storefront/product-card.test.tsx tests/storefront/product-catalogue.test.tsx
```

Expected: FAIL because card price metadata is not exposed.

- [ ] **Step 3: Extend the storefront card adapter and database query**

In `lib/commerce/storefront.ts`, select the minimum-price variant and derive:

```ts
priceJpy: selected?.priceJpy,
compareAtPriceJpy: selected?.compareAtPriceJpy,
points: selected ? Math.floor(selected.priceJpy / 100) : 0,
available: product.variants.some((variant) => variant.availableQuantity > 0),
```

In `lib/commerce/storefront-db.ts`, select `compare_at_price_jpy` only when `compare_at_price_approved` is true, matching product detail safety. Map it into card variants. Do not expose unapproved comparison prices.

- [ ] **Step 4: Implement dark product discovery and card metadata**

Use explicit classes for the search field, category tabs, result count, clear action, grid, and empty state. Render price and stock below product identity, followed by image-based variant selectors. Keep card height stable with reserved metadata and thumbnail rows. Make the product-view command a normal link, not an overlay that blocks thumbnail buttons.

- [ ] **Step 5: Restyle post-hero homepage sections**

Convert metrics, product discovery, and service commitments to full-width dark bands. Replace the solid red service block with graphite sections and red markers. Keep the approved hero untouched except for integration with shared tokens.

- [ ] **Step 6: Run focused tests**

```powershell
pnpm exec vitest run tests/commerce/storefront.test.ts tests/storefront/catalogue-commerce-meta.test.tsx tests/storefront/product-card.test.tsx tests/storefront/product-catalogue.test.tsx tests/storefront/japanese-copy.test.tsx tests/storefront/hero-visual.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

```powershell
git add components/store/Storefront.tsx components/store/ProductCatalogue.tsx components/store/ProductCard.tsx lib/commerce/storefront.ts lib/commerce/storefront-db.ts app/storefront.css tests/commerce/storefront.test.ts tests/storefront/catalogue-commerce-meta.test.tsx tests/storefront/product-card.test.tsx tests/storefront/product-catalogue.test.tsx tests/storefront/japanese-copy.test.tsx tests/storefront/hero-visual.test.tsx
git commit -m "feat: redesign storefront product discovery"
```

---

### Task 4: Redesign Product Detail And Variant Purchase Controls

**Files:**
- Modify: `app/products/[slug]/page.tsx`
- Modify: `components/store/ProductDetail.tsx`
- Modify: `components/store/VariantPurchasePanel.tsx`
- Modify: `app/storefront.css`
- Modify: `tests/storefront/product-page.test.tsx`
- Modify: `tests/storefront/store-shell.test.tsx`

**Interfaces:**
- `ProductDetail` remains responsible for active variant and gallery state.
- `VariantPurchasePanel` retains its existing `name`, `variants`, `selectedIndex`, and `onSelect` contract.
- The route loads `SiteSettingsViewModel` and supplies it to `StoreShell`.

- [ ] **Step 1: Write failing product-route and layout assertions**

Extend `product-page.test.tsx` to require gallery, purchase-summary, price, points, variant thumbnail, quantity/add button, feature, specification, driver, and delivery/return classes. Add a route-source assertion or extracted route renderer test proving the product route uses `StoreShell` with published settings.

- [ ] **Step 2: Run focused tests and confirm failure**

```powershell
pnpm exec vitest run tests/storefront/product-page.test.tsx tests/storefront/store-shell.test.tsx
```

Expected: FAIL on new structure and shell requirements.

- [ ] **Step 3: Wrap the product route in the shared shell**

Load product data and `getPublishedSiteSettings()` concurrently where possible. Render:

```tsx
<StoreShell settings={settings} className="store-product-route">
  <ProductDetail product={product} />
</StoreShell>
```

Keep preview mode, headers, and `notFound()` behavior unchanged.

- [ ] **Step 4: Implement the approved dark product layout**

Preserve existing variant/image behavior while organizing markup into gallery, purchase summary, variant choices, quantity/cart action, terms, and lower content bands. Ensure selected color updates gallery index to zero, unavailable variants remain disabled, and the active image uses `object-fit: contain` with a stable aspect ratio.

- [ ] **Step 5: Style desktop, tablet, and mobile purchase flows**

Desktop uses a two-column gallery/purchase grid. Tablet reduces gaps without collapsing controls. Mobile places the gallery before price and purchase controls, keeps buttons at least 44px, and prevents sticky media from obscuring content. Use crossfade-compatible opacity classes without delaying interaction.

- [ ] **Step 6: Run focused tests**

```powershell
pnpm exec vitest run tests/storefront/product-page.test.tsx tests/storefront/store-shell.test.tsx tests/commerce/browser-cart.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```powershell
git add app/products/[slug]/page.tsx components/store/ProductDetail.tsx components/store/VariantPurchasePanel.tsx app/storefront.css tests/storefront/product-page.test.tsx tests/storefront/store-shell.test.tsx
git commit -m "feat: redesign product purchase experience"
```

---

### Task 5: Redesign Cart And Order Confirmation

**Files:**
- Modify: `app/cart/page.tsx`
- Modify: `components/store/CartPage.tsx`
- Modify: `app/order/success/page.tsx`
- Modify: `app/storefront.css`
- Modify: `tests/storefront/cart-page.test.tsx`
- Create: `tests/storefront/public-route-shells.test.tsx`

**Interfaces:**
- `CartPage` becomes cart content only and remains a client component using `useCart()`.
- Server route `app/cart/page.tsx` loads settings and owns `StoreShell`.
- `OrderSuccessPage` loads settings in parallel with confirmation lookup and uses the same shell.

- [ ] **Step 1: Write failing route-shell and cart-layout tests**

Add assertions for a cart item list, quantity controls, removal action, checkout summary, legal notice, empty state, error state, and shared shell. In `public-route-shells.test.tsx`, render extracted page content functions or inspect route source to require `StoreShell` on cart and order success without mocking live database access.

- [ ] **Step 2: Run focused tests and confirm failure**

```powershell
pnpm exec vitest run tests/storefront/cart-page.test.tsx tests/storefront/public-route-shells.test.tsx
```

Expected: FAIL on shared shell and approved layout classes.

- [ ] **Step 3: Move the cart shell to the server route**

Change `app/cart/page.tsx` to `force-dynamic`, fetch published settings, and render `StoreShell` around `CartPage`. Remove duplicated header markup and `<main>` from the client component while retaining checkout idempotency and error handling unchanged.

- [ ] **Step 4: Restyle cart line items and summary**

Use a desktop content/summary grid, compact line rows with reserved product identity and price columns, accessible quantity steppers, explicit destructive styling for removal, and a mobile single-column fallback. Keep the checkout legal links visible before the action.

- [ ] **Step 5: Migrate the order confirmation route**

Load site settings and confirmation data without changing `CommerceDatabaseNotConfiguredError` handling. Use the shared shell and explicit status/reference/amount/contact/shipment classes. Do not add confetti, autoplay, or animated background effects.

- [ ] **Step 6: Run focused tests**

```powershell
pnpm exec vitest run tests/storefront/cart-page.test.tsx tests/storefront/public-route-shells.test.tsx tests/commerce/checkout-handler.test.ts tests/commerce/browser-cart.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```powershell
git add app/cart/page.tsx components/store/CartPage.tsx app/order/success/page.tsx app/storefront.css tests/storefront/cart-page.test.tsx tests/storefront/public-route-shells.test.tsx
git commit -m "feat: redesign cart and order status"
```

---

### Task 6: Redesign Company And Legal Content

**Files:**
- Modify: `app/about/page.tsx`
- Modify: `app/legal/page.tsx`
- Modify: `app/privacy/page.tsx`
- Modify: `app/terms/page.tsx`
- Modify: `app/storefront.css`
- Modify: `tests/storefront/japanese-copy.test.tsx`
- Modify: `tests/storefront/public-route-shells.test.tsx`
- Modify: `tests/storefront/site-settings-rendering.test.tsx`

**Interfaces:**
- Existing exported `AboutContent`, `LegalContent`, `PrivacyContent`, and `TermsContent` remain available to tests and accept optional `SiteSettingsViewModel`.
- Each content function uses `StoreShell` once and preserves existing CMS and legal copy.

- [ ] **Step 1: Write failing company and legal structure tests**

Require one shared shell, brand/support/business/company sections on `/about`, the business mail command, and common `store-legal-document` structure on all legal routes. Preserve assertions that the responsible person appears in legal disclosure but not company profile.

- [ ] **Step 2: Run focused tests and confirm failure**

```powershell
pnpm exec vitest run tests/storefront/japanese-copy.test.tsx tests/storefront/public-route-shells.test.tsx tests/storefront/site-settings-rendering.test.tsx
```

Expected: FAIL on new shell and content structure.

- [ ] **Step 3: Migrate the company page**

Replace duplicated header/footer with `StoreShell`. Keep the approved copy order: brand, Japanese support, OEM/wholesale capability, and company information. Use dark editorial full-width sections and one mail command. Do not add an OEM route, service checklist, or representative row.

- [ ] **Step 4: Migrate legal, privacy, and terms pages**

Replace route-specific headers with `StoreShell`. Reuse one legal-document class hierarchy for title, revision date, definition rows, and article sections. Preserve all legal text and CMS-controlled identity exactly.

- [ ] **Step 5: Add restrained motion and reduced-motion behavior**

Use CSS entry classes for hero copy and company editorial sections. Restrict animation to transform and opacity, 180-400ms. Disable nonessential motion under `prefers-reduced-motion: reduce`. Apply no entrance animation to legal copy.

- [ ] **Step 6: Run focused tests**

```powershell
pnpm exec vitest run tests/storefront/japanese-copy.test.tsx tests/storefront/public-route-shells.test.tsx tests/storefront/site-settings-rendering.test.tsx tests/storefront/driver-links.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```powershell
git add app/about/page.tsx app/legal/page.tsx app/privacy/page.tsx app/terms/page.tsx app/storefront.css tests/storefront/japanese-copy.test.tsx tests/storefront/public-route-shells.test.tsx tests/storefront/site-settings-rendering.test.tsx
git commit -m "feat: redesign company and legal pages"
```

---

### Task 7: Full Verification, Browser QA, And Railway Staging Delivery

**Files:**
- Modify only if verification finds a scoped storefront defect.
- Create local evidence under `artifacts/storefront-visual-system/` only when screenshots are intentionally retained; do not commit transient screenshots unless required for review.

**Interfaces:**
- Consumes the complete public storefront from Tasks 1-6.
- Produces a tested commit on `fork/feat/ajazz-japan-store` and a verified Railway staging deployment.

- [ ] **Step 1: Run all focused storefront tests**

```powershell
pnpm exec vitest run tests/storefront tests/commerce/storefront.test.ts tests/commerce/browser-cart.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run the full repository verification**

```powershell
pnpm test
pnpm build
pnpm lint
git diff --check
```

Expected: all tests pass, Next production build succeeds, TypeScript reports no errors, and diff check reports no whitespace errors. Run `pnpm build` before `pnpm lint` so `.next/types` is current.

- [ ] **Step 3: Start the local server and verify HTTP routes**

Start `pnpm run dev` on port 3007. Verify `200` responses for `/`, a representative `/products/[slug]`, `/cart`, `/about`, `/legal`, `/privacy`, `/terms`, and `/api/health`. Verify `/brand/ajazz-japan-logo-dark.png` and `/images/ajazz-gaming-desk-hero.webp` return the expected image content types and nonzero lengths.

- [ ] **Step 4: Perform browser QA at required widths**

Inspect 1440px, 1024px, 768px, and 375px layouts. At minimum verify:

- shared header and footer on every public route;
- complete transparent logo with no white rectangle or crop;
- hero product placement and next-section hint;
- three/two/one-column catalogue behavior;
- product card price, points, stock, and color thumbnails;
- product gallery and purchase controls;
- cart quantity, removal, summary, and legal links;
- company section sequence and business mail link;
- legal text readability;
- no overlap, clipped text, blank image, layout shift, or horizontal page scroll;
- keyboard focus and reduced-motion behavior.

- [ ] **Step 5: Request code review and fix only confirmed defects**

Use the requesting-code-review skill against the complete Task 1-6 diff. Apply fixes with focused regression tests. Do not expand into membership authentication, new CMS models, or administration theme work.

- [ ] **Step 6: Commit any verification fixes**

If fixes were required:

```powershell
git add app/storefront.css components/store app/about/page.tsx app/cart/page.tsx app/legal/page.tsx app/order/success/page.tsx app/privacy/page.tsx app/products/[slug]/page.tsx app/terms/page.tsx lib/commerce/storefront.ts lib/commerce/storefront-db.ts tests/storefront tests/commerce/storefront.test.ts
git commit -m "fix: polish storefront visual system"
```

If no fixes were required, do not create an empty commit.

- [ ] **Step 7: Push to the fork branch**

```powershell
git push fork feat/ajazz-japan-store
```

Confirm the pushed SHA matches local `HEAD`.

- [ ] **Step 8: Verify Railway staging deployment**

Wait for the `ajazz-store-staging` status attached to the exact commit to report success. Then verify:

- `https://ajazz-store-staging-staging.up.railway.app/` returns `200` and references the dark logo and approved hero;
- representative public routes return expected statuses and content;
- static logo and hero assets return `200` with correct content types;
- desktop and mobile staging screenshots match local QA;
- `/api/health` returns `200`;
- no production service, production database, production R2 bucket, Stripe live mode, RMS sync setting, or `ajazz.jp` binding changed.

- [ ] **Step 9: Present staging for user approval**

Keep the Railway staging homepage open as the deliverable and report the exact commit, verification results, and any intentionally deferred capability such as member authentication. Do not deploy production until the user explicitly approves the staging result.
