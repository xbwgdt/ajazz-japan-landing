import { describe, expect, it } from "vitest";
import { createRmsInventoryCronHandler } from "../../lib/rms/cron";

describe("RMS inventory cron", () => {
  it("requires the cron secret and returns inventory sync totals", async () => {
    const handler = createRmsInventoryCronHandler({
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
});
