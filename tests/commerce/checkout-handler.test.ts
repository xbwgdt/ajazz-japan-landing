import { describe, expect, it } from "vitest";
import { createCheckoutHandler } from "../../lib/commerce/checkout-handler";

describe("checkout handler", () => {
  it("validates server-side variants, creates one reservation, and returns the hosted checkout URL", async () => {
    const handler = createCheckoutHandler({
      variants: {
        async getVariants() {
          return [{ id: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, availableQuantity: 3 }];
        },
      },
      reservations: {
        async getByIdempotencyKey() {
          return undefined;
        },
        async create() {
          return { id: "reservation_1" };
        },
      },
      gateway: {
        async createSession() {
          return { url: "https://checkout.stripe.com/pay/example" };
        },
      },
    });

    const response = await handler(
      new Request("https://ajazz.jp/api/commerce/checkout", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: "checkout_1",
          lines: [{ variantId: "42", quantity: 1 }],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      checkoutUrl: "https://checkout.stripe.com/pay/example",
      reservationId: "reservation_1",
    });
  });
});
