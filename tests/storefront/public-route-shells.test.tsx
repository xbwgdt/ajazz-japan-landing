import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("transactional public route shells", () => {
  it("loads published settings in the cart server route and owns the shared shell", () => {
    const route = source("app/cart/page.tsx");
    const cart = source("components/store/CartPage.tsx");

    expect(route).toContain('export const dynamic = "force-dynamic"');
    expect(route).toContain("getPublishedSiteSettings");
    expect(route).toContain('<StoreShell settings={settings} className="store-cart-route">');
    expect(cart).not.toContain("<main");
    expect(cart).not.toContain("<header");
  });

  it("loads settings and confirmation concurrently while preserving database fallback handling", () => {
    const route = source("app/order/success/page.tsx");

    expect(route).toContain("getPublishedSiteSettings");
    expect(route).toContain("Promise.all");
    expect(route).toContain("CommerceDatabaseNotConfiguredError");
    expect(route).toContain('<StoreShell settings={settings} className="store-order-success-route">');
    expect(route).toContain('className="store-order-reference"');
    expect(route).toContain('className="store-order-amount"');
    expect(route).toContain('className="store-order-contact"');
    expect(route).toContain('className="store-order-shipment"');
    expect(route).not.toMatch(/confetti|autoplay/i);
  });
});

describe("company and legal public route shells", () => {
  const publicRoutes = [
    "app/about/page.tsx",
    "app/legal/page.tsx",
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
  ];

  it.each(publicRoutes)("uses the shared storefront shell once in %s", (path) => {
    const route = source(path);

    expect(route.match(/<StoreShell\b/g)).toHaveLength(1);
    expect(route).not.toContain('<header className="store-nav"');
    expect(route).not.toContain('<footer className="store-footer"');
  });

  it("keeps the approved company section order and a single business mail command", () => {
    const route = source("app/about/page.tsx");
    const order = [
      'className="store-about-brand',
      'className="store-about-support',
      'className="store-business-capability',
      'className="store-about-company',
    ].map((marker) => route.indexOf(marker));

    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(route.match(/mailto:/g)).toHaveLength(2);
    expect(route).not.toContain('href="/oem"');
    expect(route).not.toContain("store-business-checklist");
  });

  it.each(publicRoutes.slice(1))("uses the shared legal document hierarchy in %s", (path) => {
    const route = source(path);

    expect(route).toContain('className="store-legal-document"');
    expect(route).toContain('className="store-legal-header"');
    expect(route).toMatch(/className="store-legal-body(?:\s|\")/);
    expect(route).not.toContain("store-editorial-reveal");
  });

  it("limits company editorial motion and disables it for reduced motion", () => {
    const css = source("app/storefront.css");

    expect(css).toContain(".store-editorial-reveal { animation:store-editorial-enter .36s ease-out both; }");
    expect(css).toMatch(/@keyframes store-editorial-enter \{ from \{ opacity:0; transform:translateY\(12px\); \} to \{ opacity:1; transform:translateY\(0\); \} \}/);
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
    expect(css).not.toMatch(/store-legal-(?:document|header|body)[^}]*animation/);
  });
});
