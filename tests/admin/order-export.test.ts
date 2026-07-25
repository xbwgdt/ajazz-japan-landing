import { describe, expect, it } from "vitest";
import { toOrderCsv } from "../../lib/commerce/admin-order-export";

describe("order CSV export", () => {
  it("escapes buyer data and preserves operational fields", () => {
    const csv = toOrderCsv([{
      id: "order_1", status: "awaiting_fulfillment", customerEmail: "buyer@example.jp", totalJpy: 19980,
      createdAt: new Date("2026-07-25T00:00:00.000Z"), trackingNumber: null,
      shippingAddress: { name: "山田,太郎", address: { postal_code: "340-0043", state: "埼玉県", city: "草加市", line1: "草加2-13-21-7" } },
    }]);
    expect(csv).toContain('"山田,太郎 340-0043 埼玉県 草加市 草加2-13-21-7"');
    expect(csv).toContain("order_1,buyer@example.jp");
  });
});
