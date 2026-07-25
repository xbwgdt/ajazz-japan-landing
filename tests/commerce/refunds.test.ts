import { describe, expect, it } from "vitest";
import { RefundTransitionError, requestOrderRefund } from "../../lib/commerce/refunds";

describe("Stripe refunds", () => {
  it("refunds an eligible shipped order and records the provider refund", async () => {
    const records: unknown[] = [];
    const result = await requestOrderRefund("order_1", {
      async find() { return { status: "shipped", paymentIntentId: "pi_1", amountJpy: 19980 }; },
      async record(input) { records.push(input); },
    }, {
      async createRefund(input) { expect(input).toEqual({ paymentIntentId: "pi_1", amountJpy: 19980 }); return { id: "re_1", status: "succeeded" }; },
    });

    expect(result).toEqual({ id: "re_1", status: "succeeded" });
    expect(records).toEqual([{ orderId: "order_1", stripeRefundId: "re_1", amountJpy: 19980, status: "succeeded" }]);
  });

  it("rejects refunds for orders without a refundable status or payment", async () => {
    const store = { async find() { return { status: "cancelled" as const, paymentIntentId: null, amountJpy: 19980 }; }, async record() {} };
    await expect(requestOrderRefund("order_1", store, { async createRefund() { throw new Error("must not run"); } })).rejects.toBeInstanceOf(RefundTransitionError);
  });
});
