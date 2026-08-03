import { describe, expect, it } from "vitest";
import { CartValidationError, validateCart } from "../../lib/commerce/cart";
import { createCheckoutSession } from "../../lib/commerce/checkout";
import { createStripeCheckoutGateway } from "../../lib/commerce/stripe";
import {
  CHECKOUT_EXPIRATION_SECONDS,
  ReservationMismatchError,
  ReservationExpiredError,
  cartFingerprint,
  reserveVariants,
} from "../../lib/commerce/reservations";

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
      existing: undefined as {
        id: string;
        cartFingerprint: string;
        expectedTotalJpy: number;
        expiresAt: Date;
      } | undefined,
      async getByIdempotencyKey() {
        return this.existing;
      },
      async create(input: { idempotencyKey: string; cartFingerprint: string; expectedTotalJpy: number; expiresAt: Date }) {
        created.push(input.idempotencyKey);
        this.existing = {
          id: "reservation_1",
          cartFingerprint: input.cartFingerprint,
          expectedTotalJpy: input.expectedTotalJpy,
          expiresAt: input.expiresAt,
        };
        return this.existing;
      },
      async bindCheckoutSession() {},
    };

    const first = await reserveVariants([{ variantId: "42", quantity: 1 }], "checkout_1", 19980, store);
    const second = await reserveVariants([{ variantId: "42", quantity: 1 }], "checkout_1", 19980, store);

    expect(first.id).toBe("reservation_1");
    expect(second.id).toBe("reservation_1");
    expect(created).toEqual(["checkout_1"]);
  });

  it("rejects reuse of an idempotency key with a different cart or total", async () => {
    const existing = {
      id: "reservation_1",
      cartFingerprint: cartFingerprint([{ variantId: "42", quantity: 1 }]),
      expectedTotalJpy: 19980,
      expiresAt: new Date(Date.now() + CHECKOUT_EXPIRATION_SECONDS * 1000),
    };
    const store = {
      async getByIdempotencyKey() { return existing; },
      async create() { throw new Error("must not create"); },
      async bindCheckoutSession() {},
    };

    await expect(reserveVariants([{ variantId: "43", quantity: 1 }], "checkout_1", 19980, store))
      .rejects.toBeInstanceOf(ReservationMismatchError);
    await expect(reserveVariants([{ variantId: "42", quantity: 1 }], "checkout_1", 1, store))
      .rejects.toBeInstanceOf(ReservationMismatchError);
  });

  it("rejects reuse after the shared checkout reservation expiry", async () => {
    const store = {
      async getByIdempotencyKey() {
        return {
          id: "reservation_1",
          cartFingerprint: cartFingerprint([{ variantId: "42", quantity: 1 }]),
          expectedTotalJpy: 19980,
          expiresAt: new Date("2026-08-03T00:00:00.000Z"),
          status: "expired",
        };
      },
      async create() { throw new Error("must not create"); },
      async bindCheckoutSession() {},
    };

    await expect(reserveVariants(
      [{ variantId: "42", quantity: 1 }],
      "checkout_1",
      19980,
      store,
      new Date("2026-08-03T00:01:00.000Z"),
    )).rejects.toBeInstanceOf(ReservationExpiredError);
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
        return { id: "cs_1", url: "https://checkout.stripe.com/pay/example" };
      },
    }, {
      id: "reservation_1",
      cartFingerprint: "cart_fingerprint",
      expectedTotalJpy: 39960,
      expiresAt: new Date("2026-08-03T01:31:00.000Z"),
    });

    expect(result).toEqual({ checkoutUrl: "https://checkout.stripe.com/pay/example", checkoutSessionId: "cs_1" });
    expect(request).toEqual({
      currency: "jpy",
      allowedCountries: ["JP"],
      shippingAmountJpy: 0,
      metadata: {
        reservationId: "reservation_1",
        cartFingerprint: "cart_fingerprint",
        expectedTotalJpy: "39960",
      },
      expiresAtUnix: 1785720660,
      idempotencyKey: "reservation_1",
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
          async create(input: Record<string, unknown>, options?: { idempotencyKey: string }) {
            request = input;
            expect(options).toEqual({ idempotencyKey: "reservation_1" });
            return { id: "cs_1", url: "https://checkout.stripe.com/pay/example" };
          },
        },
      },
    });

    const session = await gateway.createSession({
      currency: "jpy",
      allowedCountries: ["JP"],
      shippingAmountJpy: 0,
      metadata: { reservationId: "reservation_1", cartFingerprint: "fingerprint", expectedTotalJpy: "19980" },
      expiresAtUnix: 1785720660,
      idempotencyKey: "reservation_1",
      lineItems: [{ name: "AK820 MAX ULTRA", unitAmountJpy: 19980, quantity: 1 }],
    });

    expect(session.url).toBe("https://checkout.stripe.com/pay/example");
    expect(request).toMatchObject({
      mode: "payment",
      billing_address_collection: "required",
      consent_collection: { terms_of_service: "required" },
      shipping_address_collection: { allowed_countries: ["JP"] },
      shipping_options: [{ shipping_rate_data: { fixed_amount: { amount: 0, currency: "jpy" } } }],
      expires_at: 1785720660,
    });
  });
});
