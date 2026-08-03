import { describe, expect, it } from "vitest";
import {
  CheckoutIntegrityError,
  assertCheckoutIntegrity,
  processCheckoutCompleted,
  WebhookSignatureError,
} from "../../lib/commerce/orders";

describe("Stripe checkout completion", () => {
  it("creates a paid order once for a valid, active reservation", async () => {
    const created: string[] = [];
    const store = {
      async createPaidOrder(input: { checkoutSessionId: string }) { created.push(input.checkoutSessionId); return { id: "order_1" }; },
    };

    const result = await processCheckoutCompleted(
      {
        id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true,
        cartFingerprint: "fingerprint", expectedTotalJpy: 19980, amountTotalJpy: 19980, paymentStatus: "paid",
      },
      store,
    );

    expect(result).toEqual({ id: "order_1" });
    expect(created).toEqual(["cs_1"]);
  });

  it("does not create a second order when the database transaction has already claimed the event", async () => {
    const result = await processCheckoutCompleted(
      {
        id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true,
        cartFingerprint: "fingerprint", expectedTotalJpy: 19980, amountTotalJpy: 19980, paymentStatus: "paid",
      },
      {
        async createPaidOrder() { return undefined; },
      },
    );

    expect(result).toBeUndefined();
  });

  it("rejects an invalid signature and an expired reservation", async () => {
    const store = {
      async createPaidOrder() { throw new Error("Reservation is no longer active"); },
    };

    await expect(processCheckoutCompleted(
      {
        id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: false,
        cartFingerprint: "fingerprint", expectedTotalJpy: 19980, amountTotalJpy: 19980, paymentStatus: "paid",
      }, store,
    )).rejects.toBeInstanceOf(WebhookSignatureError);
    await expect(processCheckoutCompleted(
      {
        id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true,
        cartFingerprint: "fingerprint", expectedTotalJpy: 19980, amountTotalJpy: 19980, paymentStatus: "paid",
      }, store,
    )).rejects.toThrow("Reservation is no longer active");
  });

  it("rejects a checkout session that does not match the persisted reservation and amount", () => {
    const reservation = {
      cartFingerprint: "persisted-fingerprint",
      expectedTotalJpy: 19980,
      checkoutSessionId: "cs_expected",
    };
    expect(() => assertCheckoutIntegrity(reservation, {
      cartFingerprint: "other-fingerprint",
      expectedTotalJpy: 19980,
      amountTotalJpy: 19980,
      checkoutSessionId: "cs_expected",
      paymentStatus: "paid",
    }, 19980)).toThrow(CheckoutIntegrityError);
    expect(() => assertCheckoutIntegrity(reservation, {
      cartFingerprint: "persisted-fingerprint",
      expectedTotalJpy: 19980,
      amountTotalJpy: 1,
      checkoutSessionId: "cs_expected",
      paymentStatus: "paid",
    }, 19980)).toThrow(CheckoutIntegrityError);
  });
});
