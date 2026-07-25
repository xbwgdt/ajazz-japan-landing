import { describe, expect, it } from "vitest";
import { createStripeWebhookHandler } from "../../lib/commerce/stripe-webhook";

describe("Stripe webhook handler", () => {
  it("rejects an invalid signature before processing an event", async () => {
    const handler = createStripeWebhookHandler({
      async verify() { throw new Error("Invalid signature"); },
      async process() { throw new Error("must not run"); },
    });

    const response = await handler(new Request("https://ajazz.jp/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "invalid" },
      body: "{}",
    }));

    expect(response.status).toBe(400);
  });

  it("processes a signed checkout completion with its reservation metadata", async () => {
    let processed: unknown;
    const handler = createStripeWebhookHandler({
      async verify() {
        return {
          id: "evt_1",
          type: "checkout.session.completed",
          data: { object: {
            id: "cs_1", metadata: { reservationId: "reservation_1" }, customerEmail: "buyer@example.jp",
            paymentIntentId: "pi_1", termsAccepted: true, shippingAddress: { postal_code: "340-0043", country: "JP" },
          } },
        };
      },
      async process(event) {
        processed = event;
      },
    });

    const response = await handler(new Request("https://ajazz.jp/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "valid" },
      body: "{}",
    }));

    expect(response.status).toBe(200);
    expect(processed).toEqual({
      id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true,
      customerEmail: "buyer@example.jp", stripePaymentIntentId: "pi_1", termsAccepted: true, shippingAddress: { postal_code: "340-0043", country: "JP" },
    });
  });
});
