import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const darkLogo = "/brand/ajazz-japan-logo-dark.png";
const storefrontLogoFiles = [
  "../../components/store/StoreLogo.tsx",
  "../../components/store/CartPage.tsx",
  "../../app/about/page.tsx",
  "../../app/legal/page.tsx",
  "../../app/order/success/page.tsx",
  "../../app/privacy/page.tsx",
  "../../app/terms/page.tsx",
];

describe("AJAZZ JAPAN header logo", () => {
  it("uses the dark-surface logo throughout the storefront", () => {
    for (const file of storefrontLogoFiles) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).toContain(darkLogo);
      expect(source).not.toContain("/brand/ajazz-japan-logo.jpg");
    }

    for (const file of ["../../components/store/StoreHeader.tsx", "../../components/store/StoreFooter.tsx"]) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(source).toContain('import { StoreLogo } from "./StoreLogo"');
    }
  });

  it("shows the complete logo artwork instead of enlarging and clipping it", () => {
    const css = readFileSync(new URL("../../app/storefront.css", import.meta.url), "utf8");

    expect(css).not.toContain("transform:scale(1.6)");
    expect(css).not.toMatch(/\.store-brand img\s*\{[^}]*position:absolute/);
    expect(css).not.toMatch(/\.store-brand img\s*\{[^}]*\b(?:top|left):-/);
    expect(css).not.toContain(".store-nav-dark .store-brand");
    expect(css).toMatch(/\.store-brand img\s*\{[^}]*width:100%[^}]*height:100%[^}]*object-fit:contain/);
  });
});

describe("AJAZZ JAPAN catalogue discovery controls", () => {
  it("keeps the responsive control strip contained and exposes selected and focus states", () => {
    const css = readFileSync(new URL("../../app/storefront.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.store-catalogue-controls\s*\{[^}]*grid-template-areas:\s*"search count clear"\s*"categories categories categories"/);
    expect(css).toMatch(/\.store-catalogue-search\s*\{[^}]*grid-area:\s*search/);
    expect(css).toMatch(/\.store-catalogue-controls\s*\[role="group"\]\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.store-catalogue-controls\s*\[role="group"\]\s*button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--aj-red\)/);
    expect(css).toMatch(/\.store-catalogue-controls\s*button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--aj-red\)/);
    expect(css).toMatch(/@media \(max-width:760px\)\s*\{[\s\S]*?\.store-catalogue-controls\s*\{[^}]*grid-template-areas:/);
  });
});
