export const RMS_INVENTORY_BATCH_SIZE = 1000;
export const RMS_INVENTORY_BULK_GET_URL = "https://api.rms.rakuten.co.jp/es/2.1/inventories/bulk-get";

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

interface RmsInventoryHttpClientOptions {
  serviceSecret: string;
  licenseKey: string;
  fetch?: typeof globalThis.fetch;
}

export function createRmsInventoryHttpClient(options: RmsInventoryHttpClientOptions): RmsInventoryClient {
  const fetcher = options.fetch ?? globalThis.fetch;
  const authorization = `ESA ${Buffer.from(`${options.serviceSecret}:${options.licenseKey}`).toString("base64")}`;

  return {
    async getInventories(keys) {
      const response = await fetcher(RMS_INVENTORY_BULK_GET_URL, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inventories: keys.map((key) => ({ manageNumber: key.rmsManageNumber, variantId: key.rmsSkuNumber })),
        }),
      });

      const payload = await response.json().catch(() => undefined) as { inventories?: unknown; errors?: Array<{ message?: string }> } | undefined;
      if (!response.ok) {
        throw new Error(payload?.errors?.[0]?.message ?? `RMS InventoryAPI request failed with ${response.status}`);
      }
      if (!Array.isArray(payload?.inventories)) {
        throw new Error("RMS InventoryAPI response did not include inventories");
      }

      return payload.inventories.map((inventory) => parseInventoryRecord(inventory));
    },
  };
}

export function configuredRmsInventoryHttpClient() {
  const serviceSecret = process.env.RMS_SERVICE_SECRET;
  const licenseKey = process.env.RMS_LICENSE_KEY;
  if (!serviceSecret || !licenseKey) {
    throw new Error("RMS InventoryAPI credentials are not configured");
  }
  return createRmsInventoryHttpClient({ serviceSecret, licenseKey });
}

export function chunkInventoryKeys(keys: RmsInventoryKey[]) {
  const batches: RmsInventoryKey[][] = [];
  for (let start = 0; start < keys.length; start += RMS_INVENTORY_BATCH_SIZE) {
    batches.push(keys.slice(start, start + RMS_INVENTORY_BATCH_SIZE));
  }
  return batches;
}

function parseInventoryRecord(value: unknown): RmsInventoryRecord {
  if (!value || typeof value !== "object") {
    throw new Error("RMS InventoryAPI returned an invalid inventory record");
  }
  const record = value as Record<string, unknown>;
  if (typeof record.manageNumber !== "string" || typeof record.variantId !== "string" || typeof record.quantity !== "number") {
    throw new Error("RMS InventoryAPI returned an invalid inventory record");
  }
  return {
    rmsManageNumber: record.manageNumber,
    rmsSkuNumber: record.variantId,
    quantity: record.quantity,
  };
}
