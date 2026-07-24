import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "../../lib/commerce/types";

describe("order status transitions", () => {
  it("allows a paid order to enter manual fulfillment", () => {
    expect(canTransitionOrder("paid", "awaiting_fulfillment")).toBe(true);
  });

  it("rejects moving a shipped order back to paid", () => {
    expect(canTransitionOrder("shipped", "paid")).toBe(false);
  });
});
