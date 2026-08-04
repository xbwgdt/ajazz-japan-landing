import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("store admin configuration", () => {
  it("documents Payload bootstrap credentials without legacy shared secrets", () => {
    const env = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

    expect(env).toContain("BOOTSTRAP_ADMIN_EMAIL=xiet@a-jazz.com");
    expect(env).toContain("BOOTSTRAP_ADMIN_PASSWORD=");
    expect(env).not.toMatch(/^ADMIN_PASSWORD=/m);
    expect(env).not.toMatch(/^ADMIN_SECRET=/m);
    expect(env).not.toContain("SURVEY_ADMIN_");
  });
});
