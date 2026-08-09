import { describe, expect, it } from "vitest";
import {
  getAdminDashboardSnapshot,
  type AdminDashboardStore,
} from "../../lib/cms/admin-dashboard";
import { Products } from "../../cms/collections/Products";

describe("admin dashboard snapshot", () => {
  it("returns operational counts and safe activity summaries", async () => {
    const store: AdminDashboardStore = {
      async getSnapshot() {
        return {
          archivedCount: 1,
          draftCount: 2,
          latestRmsSync: { completedAt: "2026-08-09T00:00:00.000Z", updatedCount: 3 },
          outOfStockCount: 4,
          pendingPublicationProducts: [{ id: "product-1", name: "AK820", slug: "ak820" }],
          publishedCount: 5,
          recentAuditEvents: [{ action: "publish", subjectId: "product-1" }],
          recentEdits: [{ id: "product-1", name: "AK820", slug: "ak820", updatedAt: "2026-08-09T00:00:00.000Z" }],
          rmsFailureSummary: null,
          totalCount: 8,
        };
      },
    };

    await expect(getAdminDashboardSnapshot(store)).resolves.toMatchObject({
      totalCount: 8,
      publishedCount: 5,
      pendingPublicationProducts: [{ slug: "ak820" }],
    });
  });

  it("registers focused product controls and indexed list filters", () => {
    expect(Products.admin?.components?.edit?.beforeDocumentControls).toEqual(expect.arrayContaining([
      "/cms/admin/ProductActions#ProductActions",
      "/cms/admin/ManualInventoryAction#ManualInventoryAction",
    ]));
    expect(Products.admin?.listSearchableFields).toEqual(expect.arrayContaining([
      "name",
      "slug",
      "category",
      "sourceType",
      "lifecycle",
      "stockState",
    ]));
  });
});
