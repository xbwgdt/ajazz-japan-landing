import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "../../app/api/health/route";

describe("Railway deployment", () => {
  it("provides a health endpoint for Railway deployment checks", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("builds, starts, and health-checks the AJAZZ web service", () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), "railway.json"), "utf8"));

    expect(config.build.buildCommand).toBe("pnpm build");
    expect(config.deploy).toMatchObject({
      startCommand: "HOSTNAME=0.0.0.0 pnpm start",
      healthcheckPath: "/api/health",
      restartPolicyType: "ON_FAILURE",
    });
  });
});
