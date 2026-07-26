import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("order admin security", () => {
  it("uses dedicated admin credentials to sign order-admin sessions", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "store-admin-password");
    vi.stubEnv("ADMIN_SECRET", "a".repeat(32));

    const security = await import("../../lib/admin-security");

    expect(security.verifyAdminPassword("store-admin-password")).toBe(true);
    expect(security.verifyAdminPassword("wrong-password")).toBe(false);
    expect(security.verifyAdminToken(security.createAdminToken())).toBe(true);
  });

  it("rejects an administrator secret shorter than 32 characters", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "store-admin-password");
    vi.stubEnv("ADMIN_SECRET", "too-short");

    const security = await import("../../lib/admin-security");

    expect(() => security.createAdminToken()).toThrow("ADMIN_SECRET is not configured");
  });
});
