import { describe, expect, it } from "vitest";
import {
  adminLoginAddress,
  adminLoginScopeKey,
  assessAdminLogin,
  type AdminLoginAttemptStore,
} from "../../lib/admin-login-throttle";

function memoryStore(): AdminLoginAttemptStore & { failures: number } {
  return {
    failures: 0,
    async assessAttempt(_clientKey, passwordMatches) {
      if (this.failures >= 5) return "blocked";
      if (!passwordMatches) {
        this.failures += 1;
        return "invalid";
      }
      this.failures = 0;
      return "accepted";
    },
  };
}

describe("persistent administrator login throttling", () => {
  it("blocks a client after five persisted failures and clears failures after success", async () => {
    const store = memoryStore();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(assessAdminLogin("client-key", false, store)).resolves.toEqual({ status: "invalid" });
    }
    await expect(assessAdminLogin("client-key", true, store)).resolves.toEqual({ status: "blocked" });
    expect(store.failures).toBe(5);

    store.failures = 4;
    await expect(assessAdminLogin("client-key", true, store)).resolves.toEqual({ status: "accepted" });
    expect(store.failures).toBe(0);
  });

  it("uses Railway's X-Real-IP instead of a caller-controlled forwarded chain", () => {
    const secret = "a".repeat(32);
    const request = new Request("https://ajazz.jp/admin/login", { headers: {
      "x-forwarded-for": "spoofed, 198.51.100.20",
      "x-real-ip": "203.0.113.10",
    } });
    expect(adminLoginAddress(request)).toBe("203.0.113.10");
    expect(adminLoginScopeKey(secret, adminLoginAddress(request)))
      .not.toBe(adminLoginScopeKey(secret, "203.0.113.11"));
  });
});
