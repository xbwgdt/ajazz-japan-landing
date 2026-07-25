import { describe, expect, it } from "vitest";
import { ReturnRestockError, restockReturnedOrder } from "../../lib/commerce/returns";

describe("returned inventory", () => {
  it("restocks an inspected refunded order only once", async () => {
    let calls = 0;
    const store = { async findStatus() { return "refunded" as const; }, async restock() { calls += 1; return calls === 1; } };
    await expect(restockReturnedOrder("order_1", store)).resolves.toEqual({ restocked: true });
    await expect(restockReturnedOrder("order_1", store)).resolves.toEqual({ restocked: false });
  });

  it("rejects restocking an order that has not been refunded", async () => {
    await expect(restockReturnedOrder("order_1", { async findStatus() { return "shipped" as const; }, async restock() { return true; } }))
      .rejects.toBeInstanceOf(ReturnRestockError);
  });
});
