import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/storefront.css", import.meta.url), "utf8");
const globalCss = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

describe("storefront visual system", () => {
  it("defines the approved dark tokens", () => {
    expect(css).toContain("--store-bg:#07080c");
    expect(css).toContain("--store-surface:#111318");
    expect(css).toContain("--store-surface-raised:#181b21");
    expect(css).toContain("--store-line:#2b2f37");
    expect(css).toContain("--store-text:#f7f7f8");
    expect(css).toContain("--store-text-muted:#a7abb3");
    expect(css).toContain("--store-accent:#e93b43");
    expect(css).toContain("--store-success:#65c987");
    expect(css).toContain("--store-danger:#ff626b");
  });

  it("keeps controls accessible and motion optional", () => {
    expect(css).toMatch(/\.store-cart\s*\{[^}]*min-width:44px[^}]*min-height:44px/);
    expect(css).toMatch(/\.store-cart-quantity button\s*\{[^}]*min-width:44px[^}]*min-height:44px/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (max-width:1024px)");
    expect(css).toContain("@media (max-width:760px)");
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
  });

  it("keeps storefront visuals scoped and preserves the light administration styles", () => {
    expect(css).not.toMatch(/^body\s*\{/m);
    expect(css).not.toContain(".store-admin");
    expect(globalCss).toContain("body { background:#f7f5f0; color:#181818; }");
    expect(css).toContain("--store-bg:#07080c");
    expect(globalCss).toMatch(/\.store-admin\s*\{[^}]*background:#f7f5f0[^}]*color:#171719/);
    expect(globalCss).toMatch(/\.store-shipment-form input\s*\{[^}]*border:1px solid #bcb6ae[^}]*background:white/);
    expect(globalCss).toMatch(/\.store-refund button\s*\{[^}]*border:1px solid #a12c33/);
    expect(globalCss).toMatch(/\.store-restock button\s*\{[^}]*border:1px solid #238349/);
  });

  it("uses graphite and white for catalogue form and command contrast", () => {
    expect(css).toMatch(/\.store-catalogue-search input\s*\{[^}]*background:\s*var\(--store-surface-raised\)[^}]*color:\s*var\(--store-text\)/);
    expect(css).toMatch(/\.store-catalogue-controls > button,[\s\S]*?\{[^}]*background:\s*var\(--store-surface-raised\)[^}]*color:\s*var\(--store-text\)/);
  });
});
