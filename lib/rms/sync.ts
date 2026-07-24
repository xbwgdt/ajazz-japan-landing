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
    update: { status: "completed" | "failed"; errorMessage?: string },
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
    try {
      const records = await client.getInventories(batch);
      for (const record of records) {
        await store.setVariantInventory(record);
        updated += 1;
      }
    } catch (error) {
      failed += batch.length;
      errors.push(error instanceof Error ? error.message : "RMS inventory request failed");
    }
  }

  await store.completeSyncLog(logId, {
    status: failed ? "failed" : "completed",
    ...(errors.length ? { errorMessage: errors.join("; ") } : {}),
  });

  return { updated, failed };
}
