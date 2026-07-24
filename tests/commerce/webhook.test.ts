import { describe, expect, it } from "vitest";
import { processCheckoutCompleted, WebhookSignatureError } from "../../lib/commerce/orders";

describe("Stripe checkout completion", () => {
  it("creates a paid order once for a valid, active reservation", async () => {
    const created: string[] = [];
    const store = {
      async hasProcessedEvent() { return false; },
      async getReservation() { return { id: "reservation_1", active: true }; },
      async createPaidOrder(input: { checkoutSessionId: string }) { created.push(input.checkoutSessionId); return { id: "order_1" }; },
      async markEventProcessed() {},
    };

    const result = await processCheckoutCompleted(
      { id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true },
      store,
    );

    expect(result).toEqual({ id: "order_1" });
    expect(created).toEqual(["cs_1"]);
  });

  it("does not create a second order for a duplicate event", async () => {
    const result = await processCheckoutCompleted(
      { id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true },
      {
        async hasProcessedEvent() { return true; },
        async getReservation() { return { id: "reservation_1", active: true }; },
        async createPaidOrder() { throw new Error("must not run"); },
        async markEventProcessed() {},
      },
    );

    expect(result).toBeUndefined();
  });

  it("rejects an invalid signature and an expired reservation", async () => {
    const store = {
      async hasProcessedEvent() { return false; },
      async getReservation() { return { id: "reservation_1", active: false }; },
      async createPaidOrder() { throw new Error("must not run"); },
      async markEventProcessed() {},
    };

    await expect(processCheckoutCompleted(
      { id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: false }, store,
    )).rejects.toBeInstanceOf(WebhookSignatureError);
    await expect(processCheckoutCompleted(
      { id: "evt_1", checkoutSessionId: "cs_1", reservationId: "reservation_1", signatureValid: true }, store,
    )).rejects.toThrow("Reservation is no longer active");
  });
});
