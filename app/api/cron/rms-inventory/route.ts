import { configuredRmsInventoryHttpClient } from "../../../../lib/rms/client";
import { createRmsInventoryCronHandler } from "../../../../lib/rms/cron";
import { databaseRmsInventorySyncStore } from "../../../../lib/rms/database-store";
import { syncRmsInventory } from "../../../../lib/rms/sync";

const handler = createRmsInventoryCronHandler({
  secret: process.env.CRON_SECRET,
  async sync() {
    return syncRmsInventory(configuredRmsInventoryHttpClient(), databaseRmsInventorySyncStore());
  },
});

export async function GET(request: Request) {
  return handler(request);
}
