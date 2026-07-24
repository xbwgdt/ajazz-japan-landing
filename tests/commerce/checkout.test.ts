import { describe, expect, it } from "vitest";
import { CartValidationError, validateCart } from "../../lib/commerce/cart";
import { createCheckoutSession } from "../../lib/commerce/checkout";
import { createStripeCheckoutGateway } from "../../lib/commerce/stripe";
import { reserveVariants } from "../../lib/commerce/reservations";

describe("checkout cart validation", () => {
  it("uses the server-side variant price and applies free domestic shipping", async () => {
    const cart = await validateCart(
      [{ variantId: "42", quantity: 2 }],
      {
        async getVariants() {
          return [
            {
              id: "42",
              name: "AK820 MAX ULTRA / Black",
              priceJpy: 19980,
              availableQuantity: 5,
            },
          ];
        },
      },
    );

    expect(cart).toEqual({
      lines: [
        {
          variantId: "42",
          name: "AK820 MAX ULTRA / Black",
          quantity: 2,
          unitPriceJpy: 19980,
        },
      ],
      shippingJpy: 0,
      totalJpy: 39960,
    });
  });

  it("rejects checkout for an unavailable variant", async () => {
    await expect(
      validateCart([{ variantId: "42", quantity: 1 }], {
        async getVariants() {
          return [
            { id: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, availableQuantity: 0 },
          ];
        },
      }),
    ).rejects.toBeInstanceOf(CartValidationError);
  });
});

describe("stock reservations", () => {
  it("reuses a reservation for the same checkout idempotency key", async () => {
    const created: string[] = [];
    const store = {
      existing: undefined as { id: string } | undefined,
      async getByIdempotencyKey() {
        return this.existing;
      },
      async create(input: { idempotencyKey: string }) {
        created.push(input.idempotencyKey);
        this.existing = { id: "reservation_1" };
        return this.existing;
      },
    };

    const first = await reserveVariants([{ variantId: "42", quantity: 1 }], "checkout_1", store);
    const second = await reserveVariants([{ variantId: "42", quantity: 1 }], "checkout_1", store);

    expect(first).toEqual({ id: "reservation_1" });
    expect(second).toEqual({ id: "reservation_1" });
    expect(created).toEqual(["checkout_1"]);
  });
});

describe("Stripe Checkout", () => {
  it("creates a JPY checkout with free shipping and a Japanese address", async () => {
    const cart = {
      lines: [
        {
          variantId: "42",
          name: "AK820 MAX ULTRA / Black",
          quantity: 2,
          unitPriceJpy: 19980,
        },
      ],
      shippingJpy: 0,
      totalJpy: 39960,
    };
    let request: unknown;

    const result = await createCheckoutSession(cart, {
      async createSession(input) {
        request = input;
        return { url: "https://checkout.stripe.com/pay/example" };
      },
    }, "reservation_1");

    expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.com/pay/example" });
    expect(request).toEqual({
      currency: "jpy",
      allowedCountries: ["JP"],
      shippingAmountJpy: 0,
      metadata: { reservationId: "reservation_1" },
      lineItems: [
        {
          name: "AK820 MAX ULTRA / Black",
          unitAmountJpy: 19980,
          quantity: 2,
        },
      ],
    });
  });

  it("maps the checkout contract to Stripe's hosted checkout API", async () => {
    let request: Record<string, unknown> | undefined;
    const gateway = createStripeCheckoutGateway({
      checkout: {
        sessions: {
          async create(input: Record<string, unknown>) {
            request = input;
            return { url: "https://checkout.stripe.com/pay/example" };
          },
        },
      },
    });

    const session = await gateway.createSession({
      currency: "jpy",
      allowedCountries: ["JP"],
      shippingAmountJpy: 0,
      metadata: { reservationId: "reservation_1" },
      lineItems: [{ name: "AK820 MAX ULTRA", unitAmountJpy: 19980, quantity: 1 }],
    });

    expect(session.url).toBe("https://checkout.stripe.com/pay/example");
    expect(request).toMatchObject({
      mode: "payment",
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: ["JP"] },
      shipping_options: [{ shipping_rate_data: { fixed_amount: { amount: 0, currency: "jpy" } } }],
    });
  });
});
