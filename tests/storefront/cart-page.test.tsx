// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartPage, checkoutAttempt, startCheckout } from "../../components/store/CartPage";
import { CartProvider } from "../../components/store/CartProvider";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("cart checkout notice", () => {
  it("links to the terms and return policy before checkout", () => {
    const html = renderToStaticMarkup(<CartProvider><CartPage /></CartProvider>);

    expect(html).toContain("利用規約");
    expect(html).toContain("特定商取引法に基づく表記");
  });

  it("renders line item controls, order summary, and removal in the cart content", async () => {
    window.localStorage.setItem("ajazz-japan-cart", JSON.stringify([{
      variantId: "variant-blue",
      name: "AJ159 APEX",
      colorName: "ブルー",
      imageUrl: "/media/aj159-blue.jpg",
      priceJpy: 12980,
      quantity: 2,
    }]));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CartProvider><CartPage /></CartProvider>));

    expect(container.querySelector(".store-cart-layout")).not.toBeNull();
    expect(container.querySelector(".store-cart-line-item")?.textContent).toContain("AJ159 APEX");
    expect(container.querySelector(".store-cart-line-variant")?.textContent).toContain("ブルー");
    expect(container.querySelector<HTMLImageElement>(".store-cart-line-image")?.src).toContain("/media/aj159-blue.jpg");
    expect(container.querySelector(".store-cart-line-price")?.textContent).toContain("25,960");
    expect(container.querySelector('[aria-label="AJ159 APEX の数量を減らす"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="AJ159 APEX の数量を増やす"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="AJ159 APEX を削除"]')).not.toBeNull();
    expect(container.querySelector(".store-cart-order-summary")?.textContent).toContain("送料無料");
    expect(container.querySelector(".store-cart-order-total")?.textContent).toContain("25,960");
    expect(container.querySelector(".store-cart-legal")?.compareDocumentPosition(
      container.querySelector<HTMLButtonElement>(".store-cart-checkout")!,
    )).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="AJ159 APEX の数量を減らす"]')?.click());
    expect(container.querySelector(".store-cart-quantity span")?.textContent).toBe("1");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="AJ159 APEX の数量を増やす"]')?.click());
    expect(container.querySelector(".store-cart-quantity span")?.textContent).toBe("2");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="AJ159 APEX を削除"]')?.click());
    expect(container.querySelector(".store-cart-empty")?.textContent).toContain("カートに商品はありません");

    await act(async () => root.unmount());
    container.remove();
  });

  it("renders an explicit empty state and responsive cart controls", () => {
    const html = renderToStaticMarkup(<CartProvider><CartPage /></CartProvider>);
    const css = readFileSync(resolve(process.cwd(), "app/storefront.css"), "utf8");

    expect(html).toContain('class="store-cart-empty"');
    expect(html).toContain("カートに商品はありません");
    expect(css).toMatch(/\.store-cart-layout\s*\{[^}]*grid-template-columns:/);
    expect(css).toMatch(/@media \(max-width:760px\)[\s\S]*\.store-cart-layout\s*\{[^}]*grid-template-columns:1fr/);
    expect(css).toMatch(/\.store-cart-quantity button\s*\{[^}]*min-width:44px[^}]*min-height:44px/);
    expect(css).toMatch(/@media \(max-width:760px\)[\s\S]*\.store-cart-legal a\s*\{[^}]*min-height:44px/);
  });

  it("shows the checkout error in an alert without hiding the legal notice", async () => {
    window.localStorage.setItem("ajazz-japan-cart", JSON.stringify([{
      variantId: "variant-blue",
      name: "AJ159 APEX / ブルー",
      priceJpy: 12980,
      quantity: 1,
    }]));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "決済を開始できません" }, { status: 500 }));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CartProvider><CartPage /></CartProvider>));
    await act(async () => container.querySelector<HTMLButtonElement>(".store-cart-checkout")?.click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("決済を開始できません");
    expect(container.querySelector(".store-cart-legal")).not.toBeNull();

    await act(async () => root.unmount());
    container.remove();
  });

  it("releases checkout loading and shows a Japanese error when the request is rejected", async () => {
    window.localStorage.setItem("ajazz-japan-cart", JSON.stringify([{
      variantId: "variant-blue",
      name: "AJ159 APEX / ブルー",
      priceJpy: 12980,
      quantity: 1,
    }]));
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(<CartProvider><CartPage /></CartProvider>));
    const checkoutButton = container.querySelector<HTMLButtonElement>(".store-cart-checkout")!;
    await act(async () => checkoutButton.click());

    expect(container.querySelector('[role="alert"]')?.textContent).toContain("通信エラー");
    expect(checkoutButton.disabled).toBe(false);
    expect(checkoutButton.textContent).toBe("安全な決済へ進む");

    await act(async () => root.unmount());
    container.remove();
  });

  it("redirects to the checkoutUrl returned by the commerce API", async () => {
    const destinations: string[] = [];
    const result = await startCheckout(
      [{ variantId: "42", quantity: 1 }],
      async () => new Response(JSON.stringify({ checkoutUrl: "https://checkout.stripe.com/c/pay/cs_1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
      (url) => destinations.push(url),
      "checkout_1",
    );

    expect(result).toEqual({ redirected: true });
    expect(destinations).toEqual(["https://checkout.stripe.com/c/pay/cs_1"]);
  });

  it("reuses the checkout key for retries and rotates it when the cart changes", () => {
    let sequence = 0;
    const randomUUID = () => `checkout_${++sequence}`;
    const first = checkoutAttempt([{ variantId: "42", quantity: 1 }], undefined, randomUUID);
    const retry = checkoutAttempt([{ variantId: "42", quantity: 1 }], first, randomUUID);
    const changed = checkoutAttempt([{ variantId: "42", quantity: 2 }], retry, randomUUID);

    expect(retry).toEqual(first);
    expect(changed.idempotencyKey).toBe("checkout_2");
  });

  it("tells the cart to rotate its key after the server confirms the reservation expired", async () => {
    const result = await startCheckout(
      [{ variantId: "42", quantity: 1 }],
      async () => Response.json({ error: "Checkout reservation expired" }, { status: 409 }),
      () => undefined,
      "checkout_1",
    );
    expect(result).toMatchObject({ redirected: false, resetAttempt: true });
  });
});
