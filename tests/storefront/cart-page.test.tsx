import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartPage, checkoutAttempt, startCheckout } from "../../components/store/CartPage";
import { CartProvider } from "../../components/store/CartProvider";

describe("cart checkout notice", () => {
  it("links to the terms and return policy before checkout", () => {
    const html = renderToStaticMarkup(<CartProvider><CartPage /></CartProvider>);

    expect(html).toContain("利用規約");
    expect(html).toContain("特定商取引法に基づく表記");
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
