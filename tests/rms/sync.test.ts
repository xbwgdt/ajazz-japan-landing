import { describe, expect, it } from "vitest";
import { chunkInventoryKeys, createRmsInventoryHttpClient } from "../../lib/rms/client";
import { syncRmsInventory } from "../../lib/rms/sync";

describe("RMS inventory synchronization", () => {
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
    const logUpdates: Array<{ status: string; errorMessage?: string }> = [];

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
      { status: "failed", errorMessage: "RMS timed out" },
    ]);
  });
});
