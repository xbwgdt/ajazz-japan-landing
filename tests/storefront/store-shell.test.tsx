// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../components/store/CartProvider";
import { Storefront } from "../../components/store/Storefront";
import { StoreHeader } from "../../components/store/StoreHeader";
import { StoreShell } from "../../components/store/StoreShell";
import {
  DEFAULT_SITE_SETTINGS,
  DRIVER_DESTINATION,
} from "../../lib/cms/site-settings";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("shared public storefront shell", () => {
  it("renders the shared navigation and CMS-controlled footer", () => {
    const html = renderToStaticMarkup(
      <CartProvider>
        <StoreShell settings={DEFAULT_SITE_SETTINGS}>
          <div>content</div>
        </StoreShell>
      </CartProvider>,
    );

    expect(html).toContain("/brand/ajazz-japan-logo-dark.png");
    expect(html).toContain("製品");
    expect(html).toContain("カテゴリー");
    expect(html).toContain("会社情報");
    expect(html).toContain(DRIVER_DESTINATION);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("アカウントは現在ご利用いただけません");
    expect(html).toContain(DEFAULT_SITE_SETTINGS.footer.companyName);
    expect(html).toContain('/legal');
  });

  it("gives the homepage exactly one header and one footer landmark", () => {
    const html = renderToStaticMarkup(
      <CartProvider>
        <Storefront />
      </CartProvider>,
    );

    expect(html.match(/<header\b/g)).toHaveLength(1);
    expect(html.match(/<footer\b/g)).toHaveLength(1);
  });

  it("operates the mobile menu by button, Escape, and link activation", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CartProvider><StoreHeader /></CartProvider>);
    });

    const menuButton = container.querySelector<HTMLButtonElement>('[aria-controls="store-mobile-navigation"]');
    const menu = container.querySelector<HTMLElement>("#store-mobile-navigation");
    expect(menuButton?.getAttribute("aria-expanded")).toBe("false");
    expect(menu?.classList.contains("is-open")).toBe(false);

    menuButton?.focus();
    await act(async () => menuButton?.click());
    expect(menuButton?.getAttribute("aria-expanded")).toBe("true");
    expect(menu?.classList.contains("is-open")).toBe(true);
    expect(document.activeElement).toBe(menu?.querySelector("a"));

    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(menuButton?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => menuButton?.click());
    const productLink = Array.from(menu?.querySelectorAll("a") ?? [])
      .find((link) => link.textContent === "製品");
    await act(async () => productLink?.click());
    expect(menuButton?.getAttribute("aria-expanded")).toBe("false");

    await act(async () => root.unmount());
    container.remove();
  });

  it("keeps icon controls at least 44px wide at the narrowest breakpoint", () => {
    const css = readFileSync(resolve(process.cwd(), "app/storefront.css"), "utf8");
    const narrowBreakpoint = css.match(/@media \(max-width:420px\)\s*\{([\s\S]*?)\}\s*\}/)?.[1];

    expect(narrowBreakpoint).toMatch(/\.store-icon-button\s*\{[^}]*width:44px/);
    expect(narrowBreakpoint).toMatch(/\.store-icon-button\s*\{[^}]*height:44px/);
    expect(narrowBreakpoint).toMatch(/\.store-icon-button\s*\{[^}]*flex-basis:44px/);
  });

  it("focuses the existing homepage product search without inventing a search route", async () => {
    const container = document.createElement("div");
    const search = document.createElement("input");
    search.id = "store-product-search";
    document.body.append(search);
    const root = createRoot(container);

    await act(async () => {
      root.render(<CartProvider><StoreHeader /></CartProvider>);
    });

    const searchControl = container.querySelector<HTMLAnchorElement>('a[href="/#store-product-search"][aria-label="製品を検索"]');
    expect(searchControl?.getAttribute("aria-label")).toBe("製品を検索");
    await act(async () => searchControl?.click());
    expect(document.activeElement).toBe(search);

    await act(async () => root.unmount());
    search.remove();
  });
});
