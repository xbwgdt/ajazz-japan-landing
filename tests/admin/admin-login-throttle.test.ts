import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Admins } from "../../cms/collections/Admins";

describe("Payload administrator login throttling", () => {
  it("uses Payload's built-in login-attempt limit", () => {
    expect(typeof Admins.auth).toBe("object");
    expect((Admins.auth as { maxLoginAttempts?: number }).maxLoginAttempts).toBe(5);
  });

  it("removes the legacy shared-password login surfaces", () => {
    for (const path of [
      "lib/admin-login-throttle.ts",
      "lib/admin-security.ts",
      "app/admin/login/page.tsx",
      "app/api/admin/login/route.ts",
      "app/api/admin/logout/route.ts",
    ]) {
      expect(existsSync(resolve(process.cwd(), path)), path).toBe(false);
    }
  });

  it("keeps the historical login-attempt table for later non-destructive cleanup", () => {
    const database = readFileSync(resolve(process.cwd(), "lib/commerce/db.ts"), "utf8");

    expect(database).toContain("admin_login_attempts");
  });
});
