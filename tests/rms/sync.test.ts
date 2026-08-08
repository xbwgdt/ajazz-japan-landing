import { describe, expect, it, vi } from "vitest";
import { chunkInventoryKeys, createRmsInventoryHttpClient } from "../../lib/rms/client";
import { syncRmsInventory } from "../../lib/rms/sync";

const { observedDatabaseQueries, databaseSqlMock } = vi.hoisted(() => {
  const observedDatabaseQueries: string[] = [];
  const databaseSqlMock = vi.fn((strings: TemplateStringsArray) => {
    observedDatabaseQueries.push(strings.join("?"));
    return Promise.resolve([]);
  });
  return { observedDatabaseQueries, databaseSqlMock };
});

vi.mock("../../lib/commerce/db", () => ({
  commerceSql: () => databaseSqlMock,
  ensureCommerceSchema: vi.fn(async () => undefined),
}));

import { databaseRmsInventorySyncStore } from "../../lib/rms/database-store";

describe("RMS inventory synchronization", () => {
  it("selects only active RMS variants with complete RMS identifiers", async () => {
    observedDatabaseQueries.length = 0;
    await databaseRmsInventorySyncStore().getActiveVariantKeys();
    const query = observedDatabaseQueries[0];
    expect(query).toContain("p.source_type = 'rms'");
    expect(query).toContain("pv.inventory_mode = 'rms'");
    expect(query).toContain("p.rms_manage_number IS NOT NULL");
    expect(query).toContain("pv.rms_sku_number IS NOT NULL");
    expect(query).toContain("pv.active = TRUE");

    await databaseRmsInventorySyncStore().setVariantInventory({
      rmsManageNumber: "ak820-max",
      rmsSkuNumber: "BLACK",
      quantity: 8,
    });
    const update = observedDatabaseQueries.at(-1);
    expect(update).toContain("p.source_type = 'rms'");
    expect(update).toContain("pv.inventory_mode = 'rms'");
    expect(update).toContain("pv.active = TRUE");
  });
  it("splits inventory requests into batches of at most 1,000 SKU keys", () => {
    const keys = Array.from({ length: 1001 }, (_, index) => ({
      rmsManageNumber: "ak820-max",
      rmsSkuNumber: `SKU-${index}`,
    }));

    expect(chunkInventoryKeys(keys).map((batch) => batch.length)).toEqual([1000, 1]);
  });

  it("calls InventoryAPI 2.1 with ESA credentials and maps returned stock", async () => {
    let request: { url: string; init?: RequestInit } | undefined;
    const client = createRmsInventoryHttpClient({
      serviceSecret: "service-secret",
      licenseKey: "license-key",
      fetch: async (url, init) => {
        request = { url, init };
        return new Response(JSON.stringify({
          inventories: [{ manageNumber: "ak820-max", variantId: "AK820-BLACK", quantity: 12 }],
        }), { status: 200, headers: { "content-type": "application/json" } });
      },
    });

    await expect(client.getInventories([{ rmsManageNumber: "ak820-max", rmsSkuNumber: "AK820-BLACK" }]))
      .resolves.toEqual([{ rmsManageNumber: "ak820-max", rmsSkuNumber: "AK820-BLACK", quantity: 12 }]);
    expect(request).toEqual({
      url: "https://api.rms.rakuten.co.jp/es/2.1/inventories/bulk-get",
      init: {
        method: "POST",
        headers: {
          Authorization: "ESA c2VydmljZS1zZWNyZXQ6bGljZW5zZS1rZXk=",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inventories: [{ manageNumber: "ak820-max", variantId: "AK820-BLACK" }] }),
      },
    });
  });

  it("keeps prior stock for a failed batch and records the failure", async () => {
    const keys = Array.from({ length: 1001 }, (_, index) => ({
      rmsManageNumber: "ak820-max",
      rmsSkuNumber: `SKU-${index}`,
    }));
    const updated: string[] = [];
    const logUpdates: Array<{ status: string; errorMessage?: string; updatedCount: number; failedCount: number }> = [];

    const result = await syncRmsInventory(
      {
        async getInventories(batch) {
          if (batch[0]?.rmsSkuNumber === "SKU-1000") {
            throw new Error("RMS timed out");
          }
          return batch.map((key) => ({ ...key, quantity: 8 }));
        },
      },
      {
        async getActiveVariantKeys() {
          return keys;
        },
        async setVariantInventory(record) {
          updated.push(record.rmsSkuNumber);
        },
        async createSyncLog() {
          return 17;
        },
        async completeSyncLog(_, update) {
          logUpdates.push(update);
        },
      },
    );

    expect(result).toEqual({ updated: 1000, failed: 1 });
    expect(updated).toHaveLength(1000);
    expect(updated).not.toContain("SKU-1000");
    expect(logUpdates).toEqual([
      { status: "failed", errorMessage: "RMS timed out", updatedCount: 1000, failedCount: 1 },
    ]);
  });

  it("treats requested SKUs omitted from a successful RMS response as partial failures", async () => {
    const updated: string[] = [];
    const logUpdates: unknown[] = [];
    const result = await syncRmsInventory({
      async getInventories() {
        return [{ rmsManageNumber: "ak820", rmsSkuNumber: "BLACK", quantity: 8 }];
      },
    }, {
      async getActiveVariantKeys() {
        return [
          { rmsManageNumber: "ak820", rmsSkuNumber: "BLACK" },
          { rmsManageNumber: "ak820", rmsSkuNumber: "WHITE" },
        ];
      },
      async setVariantInventory(record) { updated.push(record.rmsSkuNumber); },
      async createSyncLog() { return 18; },
      async completeSyncLog(_, update) { logUpdates.push(update); },
    });

    expect(result).toEqual({ updated: 1, failed: 1 });
    expect(updated).toEqual(["BLACK"]);
    expect(logUpdates).toEqual([{
      status: "failed",
      updatedCount: 1,
      failedCount: 1,
      errorMessage: "RMS response omitted 1 requested SKU(s)",
    }]);
  });
});
