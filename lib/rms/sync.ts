import {
  chunkInventoryKeys,
  type RmsInventoryClient,
  type RmsInventoryKey,
  type RmsInventoryRecord,
} from "./client";

export interface RmsInventorySyncStore {
  getActiveVariantKeys(): Promise<RmsInventoryKey[]>;
  setVariantInventory(record: RmsInventoryRecord): Promise<void>;
  createSyncLog(): Promise<number>;
  completeSyncLog(
    logId: number,
    update: {
      status: "completed" | "failed";
      updatedCount: number;
      failedCount: number;
      errorMessage?: string;
    },
  ): Promise<void>;
}

export async function syncRmsInventory(
  client: RmsInventoryClient,
  store: RmsInventorySyncStore,
) {
  const logId = await store.createSyncLog();
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const batch of chunkInventoryKeys(await store.getActiveVariantKeys())) {
    let records: RmsInventoryRecord[];
    try {
      records = await client.getInventories(batch);
    } catch (error) {
      failed += batch.length;
      errors.push(error instanceof Error ? error.message : "RMS inventory request failed");
      continue;
    }

    const recordsByKey = new Map(records.map((record) => [inventoryKey(record), record]));
    let omitted = 0;
    for (const requested of batch) {
      const record = recordsByKey.get(inventoryKey(requested));
      if (!record) {
        failed += 1;
        omitted += 1;
        continue;
      }
      try {
        await store.setVariantInventory(record);
        updated += 1;
      } catch (error) {
        failed += 1;
        errors.push(error instanceof Error ? error.message : "RMS inventory update failed");
      }
    }
    if (omitted) {
      errors.push(`RMS response omitted ${omitted} requested SKU(s)`);
    }
  }

  await store.completeSyncLog(logId, {
    status: failed ? "failed" : "completed",
    updatedCount: updated,
    failedCount: failed,
    ...(errors.length ? { errorMessage: errors.join("; ") } : {}),
  });

  return { updated, failed };
}

function inventoryKey(key: RmsInventoryKey) {
  return `${key.rmsManageNumber}\u0000${key.rmsSkuNumber}`;
}
