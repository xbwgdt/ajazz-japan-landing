import { describe, expect, it } from "vitest";
import { OrderTransitionError, updateOrderStatus } from "../../lib/commerce/orders";

describe("manual fulfillment", () => {
  it("allows awaiting fulfillment orders to be marked shipped with a tracking number", async () => {
    const updates: unknown[] = [];
    await updateOrderStatus(
      { orderId: "order_1", currentStatus: "awaiting_fulfillment", nextStatus: "shipped", trackingNumber: "1234567890" },
      { async save(input) { updates.push(input); } },
    );

    expect(updates).toEqual([{ orderId: "order_1", nextStatus: "shipped", trackingNumber: "1234567890" }]);
  });

  it("rejects invalid transitions and duplicate tracking updates", async () => {
    const store = { async save() {} };
    await expect(updateOrderStatus(
      { orderId: "order_1", currentStatus: "shipped", nextStatus: "paid", trackingNumber: "123" }, store,
    )).rejects.toBeInstanceOf(OrderTransitionError);
    await expect(updateOrderStatus(
      { orderId: "order_1", currentStatus: "awaiting_fulfillment", nextStatus: "shipped", trackingNumber: "" }, store,
    )).rejects.toBeInstanceOf(OrderTransitionError);
  });
});
