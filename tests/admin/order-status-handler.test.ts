import { describe, expect, it } from "vitest";
import { updateAdminOrder } from "../../lib/commerce/admin-order-handler";

describe("admin order status handler", () => {
  it("loads the current status before recording a shipment", async () => {
    const writes: unknown[] = [];
    const result = await updateAdminOrder(
      { orderId: "order_1", nextStatus: "shipped", trackingNumber: "JP123" },
      {
        async findStatus() { return "awaiting_fulfillment"; },
        async save(input) { writes.push(input); },
      },
    );

    expect(result).toEqual({ orderId: "order_1", status: "shipped" });
    expect(writes).toEqual([{ orderId: "order_1", nextStatus: "shipped", trackingNumber: "JP123" }]);
  });

  it("does not update an order that does not exist", async () => {
    await expect(updateAdminOrder(
      { orderId: "missing", nextStatus: "shipped", trackingNumber: "JP123" },
      { async findStatus() { return undefined; }, async save() {} },
    )).rejects.toThrow("Order not found");
  });
});
