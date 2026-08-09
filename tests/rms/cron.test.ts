import { describe, expect, it } from "vitest";
import { createRmsInventoryCronHandler } from "../../lib/rms/cron";

describe("RMS inventory cron", () => {
  it("requires the cron secret and returns inventory sync totals", async () => {
    const handler = createRmsInventoryCronHandler({
      enabled: true,
      secret: "cron-secret",
      async sync() {
        return { updated: 12, failed: 0 };
      },
    });

    await expect(handler(new Request("https://ajazz.jp/api/cron/rms-inventory"))).resolves.toMatchObject({ status: 401 });
    const response = await handler(new Request("https://ajazz.jp/api/cron/rms-inventory", {
      headers: { authorization: "Bearer cron-secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: 12, failed: 0 });
  });

  it("does not call RMS when inventory sync is disabled", async () => {
    let syncCalls = 0;
    const handler = createRmsInventoryCronHandler({
      enabled: false,
      secret: "cron-secret",
      async sync() {
        syncCalls += 1;
        return { updated: 1, failed: 0 };
      },
    });

    await expect(handler(new Request(
      "https://ajazz-staging.up.railway.app/api/cron/rms-inventory",
    ))).resolves.toMatchObject({ status: 401 });

    const response = await handler(new Request(
      "https://ajazz-staging.up.railway.app/api/cron/rms-inventory",
      { headers: { authorization: "Bearer cron-secret" } },
    ));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "RMS inventory sync is disabled",
    });
    expect(syncCalls).toBe(0);
  });
});
