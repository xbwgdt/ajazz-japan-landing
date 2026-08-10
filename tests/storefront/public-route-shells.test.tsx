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
