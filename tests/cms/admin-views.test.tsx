import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Dashboard } from "../../cms/admin/Dashboard";
import { OrdersView } from "../../cms/admin/OrdersView";

vi.mock("../../lib/commerce/admin-orders", () => ({
  listAdminOrders: vi.fn().mockResolvedValue([{
    id: "order-123",
    status: "paid",
    customerEmail: "buyer@example.com",
    totalJpy: 12800,
    createdAt: new Date("2026-08-04T00:00:00.000Z"),
    trackingNumber: null,
    shippingAddress: null,
    termsAcceptedAt: new Date("2026-08-04T00:00:00.000Z"),
  }]),
}));

describe("Payload administrator views", () => {
  it("links the Payload dashboard to order management", async () => {
    const html = renderToStaticMarkup(<Dashboard />);

    expect(html).toContain('href="/admin/orders"');
    expect(html).toContain("注文管理");
  });

  it("renders the existing order operations inside the custom view", async () => {
    const view = await OrdersView({
      initPageResult: {
        req: { user: { collection: "admins" } },
      },
    } as never);
    const html = renderToStaticMarkup(view);

    expect(html).toContain("order-123");
    expect(html).toContain("buyer@example.com");
    expect(html).toContain("CSV出力");
    expect(html).toContain("出荷準備へ");
    expect(html).toContain("返金");
  });
});
