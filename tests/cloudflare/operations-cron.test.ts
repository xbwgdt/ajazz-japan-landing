import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dispatchCronTask, tasksForCron } from "../../cloudflare/ajazz-operations-cron/src/dispatch";

const environment = {
  AJAZZ_ORIGIN: "https://ajazz.jp",
  CRON_SECRET: "cron-secret",
};

describe("Cloudflare operations cron", () => {
  it("maps each configured schedule to its intended AJAZZ operation", () => {
    expect(tasksForCron("*/10 * * * *")).toEqual([{ path: "/api/cron/release-reservations" }]);
    expect(tasksForCron("*/15 * * * *")).toEqual([{ path: "/api/cron/rms-inventory" }]);
  });

  it("calls the selected endpoint with the shared cron secret", async () => {
    const requests: Array<{ input: string; authorization: string | undefined }> = [];
    const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ input: String(input), authorization: new Headers(init?.headers).get("authorization") ?? undefined });
      return new Response(null, { status: 200 });
    }) as typeof fetch;

    await dispatchCronTask({ path: "/api/cron/rms-inventory" }, environment, fetcher);

    expect(requests).toEqual([{
      input: "https://ajazz.jp/api/cron/rms-inventory",
      authorization: "Bearer cron-secret",
    }]);
  });

  it("surfaces a failed AJAZZ operation", async () => {
    const fetcher = (async () => new Response(null, { status: 500 })) as typeof fetch;

    await expect(dispatchCronTask({ path: "/api/cron/rms-inventory" }, environment, fetcher))
      .rejects.toThrow("AJAZZ cron endpoint failed with 500");
  });

  it("registers the inventory and reservation schedules with Cloudflare", () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "cloudflare/ajazz-operations-cron/wrangler.json"), "utf8"));

    expect(config.triggers.crons).toEqual(["*/10 * * * *", "*/15 * * * *"]);
  });
});
