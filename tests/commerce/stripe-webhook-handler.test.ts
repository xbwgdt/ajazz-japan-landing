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
            id: "cs_1", metadata: { reservationId: "reservation_1", cartFingerprint: "fingerprint", expectedTotalJpy: "19980" }, customerEmail: "buyer@example.jp",
            paymentIntentId: "pi_1", termsAccepted: true, shippingAddress: { postal_code: "340-0043", country: "JP" },
            amountTotalJpy: 19980, paymentStatus: "paid",
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
      cartFingerprint: "fingerprint", expectedTotalJpy: 19980, amountTotalJpy: 19980, paymentStatus: "paid",
    });
  });

  it("reconciles signed asynchronous refund updates", async () => {
    let reconciled: unknown;
    const handler = createStripeWebhookHandler({
      async verify() {
        return {
          id: "evt_refund_1",
          type: "refund.updated",
          data: { object: {
            id: "re_1",
            metadata: { orderId: "order_1" },
            refundStatus: "succeeded",
            amountTotalJpy: 19980,
            paymentIntentId: "pi_1",
          } },
        };
      },
      async process() { throw new Error("must not process checkout"); },
      async processRefund(event) { reconciled = event; },
    });

    const response = await handler(new Request("https://ajazz.jp/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "valid" },
      body: "{}",
    }));

    expect(response.status).toBe(200);
    expect(reconciled).toEqual({
      eventId: "evt_refund_1",
      orderId: "order_1",
      stripeRefundId: "re_1",
      amountJpy: 19980,
      status: "succeeded",
      paymentIntentId: "pi_1",
    });
  });

  it("reconciles refund.created so a successful Stripe refund cannot be lost locally", async () => {
    let reconciled: unknown;
    const handler = createStripeWebhookHandler({
      async verify() {
        return {
          id: "evt_refund_created",
          type: "refund.created",
          data: { object: {
            id: "re_1", metadata: { orderId: "order_1" }, refundStatus: "succeeded", amountTotalJpy: 19980,
            paymentIntentId: "pi_1",
          } },
        };
      },
      async process() { throw new Error("must not process checkout"); },
      async processRefund(event) { reconciled = event; },
    });

    const response = await handler(new Request("https://ajazz.jp/api/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": "valid" }, body: "{}",
    }));
    expect(response.status).toBe(200);
    expect(reconciled).toMatchObject({ eventId: "evt_refund_created", stripeRefundId: "re_1" });
  });

  it("releases inventory when Stripe confirms an unpaid Checkout Session expired", async () => {
    let expired: unknown;
    const handler = createStripeWebhookHandler({
      async verify() {
        return { id: "evt_expired", type: "checkout.session.expired", data: { object: { id: "cs_1" } } };
      },
      async process() { throw new Error("must not process checkout"); },
      async processExpiration(event) { expired = event; },
    });
    const response = await handler(new Request("https://ajazz.jp/api/stripe/webhook", {
      method: "POST", headers: { "stripe-signature": "valid" }, body: "{}",
    }));
    expect(response.status).toBe(200);
    expect(expired).toEqual({ eventId: "evt_expired", checkoutSessionId: "cs_1" });
  });
});
