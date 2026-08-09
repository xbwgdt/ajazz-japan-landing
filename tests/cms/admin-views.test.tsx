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

vi.mock("../../lib/cms/admin-dashboard", () => ({
  getAdminDashboardSnapshot: vi.fn().mockResolvedValue({
    archivedCount: 0,
    draftCount: 1,
    latestRmsSync: null,
    outOfStockCount: 0,
    pendingPublicationProducts: [],
    publishedCount: 1,
    recentAuditEvents: [],
    recentEdits: [],
    rmsFailureSummary: null,
    totalCount: 2,
  }),
}));

describe("Payload administrator views", () => {
  it("links the Payload dashboard to order management", async () => {
    const html = renderToStaticMarkup(await Dashboard());

    expect(html).toContain('href="/admin/orders"');
    expect(html).toContain("Order management");
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
  });
});
