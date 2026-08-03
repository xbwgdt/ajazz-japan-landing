import { describe, expect, it } from "vitest";
import { RefundTransitionError, orderStatusAfterRefund, requestOrderRefund } from "../../lib/commerce/refunds";
import { createStripeRefundGateway } from "../../lib/commerce/stripe";

describe("Stripe refunds", () => {
  it("restocks a paid order after a successful refund", async () => {
    const records: unknown[] = [];
    const result = await requestOrderRefund("order_1", {
      async find() { return { status: "paid", paymentIntentId: "pi_1", amountJpy: 19980, refundAttemptKey: "attempt_1" }; },
      async record(input) { records.push(input); },
    }, {
      async createRefund(input) { expect(input).toEqual({ orderId: "order_1", paymentIntentId: "pi_1", amountJpy: 19980, attemptKey: "attempt_1" }); return { id: "re_1", status: "succeeded" }; },
    });

    expect(result).toEqual({ id: "re_1", status: "succeeded" });
    expect(records).toEqual([{
      orderId: "order_1", stripeRefundId: "re_1", amountJpy: 19980,
      status: "succeeded", previousStatus: "paid", restock: true,
    }]);
  });

  it("does not restock a shipped order before the return is received", async () => {
    const records: unknown[] = [];
    await requestOrderRefund("order_1", {
      async find() { return { status: "shipped", paymentIntentId: "pi_1", amountJpy: 19980, refundAttemptKey: "attempt_1" }; },
      async record(input) { records.push(input); },
    }, { async createRefund() { return { id: "re_1", status: "succeeded" }; } });

    expect(records).toEqual([{
      orderId: "order_1", stripeRefundId: "re_1", amountJpy: 19980,
      status: "succeeded", previousStatus: "shipped", restock: false,
    }]);
  });

  it("rejects refunds for orders without a refundable status or payment", async () => {
    const store = { async find() { return { status: "cancelled" as const, paymentIntentId: null, amountJpy: 19980, refundAttemptKey: "attempt_1" }; }, async record() {} };
    await expect(requestOrderRefund("order_1", store, { async createRefund() { throw new Error("must not run"); } })).rejects.toBeInstanceOf(RefundTransitionError);
  });

  it("binds the refund request to the order for asynchronous webhook reconciliation", async () => {
    await requestOrderRefund("order_1", {
      async find() { return { status: "paid", paymentIntentId: "pi_1", amountJpy: 19980, refundAttemptKey: "attempt_1" }; },
      async record() {},
    }, {
      async createRefund(input) {
        expect(input).toEqual({ orderId: "order_1", paymentIntentId: "pi_1", amountJpy: 19980, attemptKey: "attempt_1" });
        return { id: "re_1", status: "pending" };
      },
    });
  });

  it("restores the prior order status when Stripe reports a failed refund", () => {
    expect(orderStatusAfterRefund("failed", "awaiting_fulfillment")).toBe("awaiting_fulfillment");
    expect(orderStatusAfterRefund("succeeded", "paid")).toBe("refunded");
    expect(orderStatusAfterRefund("pending", "paid")).toBe("refund_pending");
  });

  it("uses a stable Stripe idempotency key for repeated refund requests", async () => {
    let options: unknown;
    const gateway = createStripeRefundGateway({
      refunds: {
        async create(_input, requestOptions) {
          options = requestOptions;
          return { id: "re_1", status: "pending" };
        },
      },
    });
    await gateway.createRefund({ orderId: "order_1", paymentIntentId: "pi_1", amountJpy: 19980, attemptKey: "attempt_1" });
    expect(options).toEqual({ idempotencyKey: "refund:order_1:attempt_1" });
  });
});
