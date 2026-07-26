import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("store admin configuration", () => {
  it("documents dedicated admin credentials without survey variables", () => {
    const env = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

    expect(env).toContain("ADMIN_PASSWORD=");
    expect(env).toContain("ADMIN_SECRET=");
    expect(env).not.toContain("SURVEY_ADMIN_");
  });
});
