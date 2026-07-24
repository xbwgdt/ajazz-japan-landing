export const RMS_INVENTORY_BATCH_SIZE = 1000;

export interface RmsInventoryKey {
  rmsManageNumber: string;
  rmsSkuNumber: string;
}

export interface RmsInventoryRecord extends RmsInventoryKey {
  quantity: number;
}

export interface RmsInventoryClient {
  getInventories(keys: RmsInventoryKey[]): Promise<RmsInventoryRecord[]>;
}

export function chunkInventoryKeys(keys: RmsInventoryKey[]) {
  const batches: RmsInventoryKey[][] = [];
  for (let start = 0; start < keys.length; start += RMS_INVENTORY_BATCH_SIZE) {
    batches.push(keys.slice(start, start + RMS_INVENTORY_BATCH_SIZE));
  }
  return batches;
}
