import { describe, expect, it, vi } from "vitest";
import { authenticateAdmin, requireAuthenticatedAdmin } from "../../lib/cms/auth";

describe("Payload administrator authentication", () => {
  it("rejects requests without a Payload administrator", async () => {
    await expect(requireAuthenticatedAdmin(new Headers(), {
      auth: vi.fn().mockResolvedValue({ user: null }),
    } as never)).rejects.toMatchObject({ status: 401 });
  });

  it("returns the authenticated administrator", async () => {
    const admin = {
      id: 1,
      collection: "admins",
      email: "xiet@a-jazz.com",
      role: "administrator",
    };

    await expect(requireAuthenticatedAdmin(new Headers(), {
      auth: vi.fn().mockResolvedValue({ user: admin }),
    } as never)).resolves.toEqual(admin);
  });

  it("rejects an administrator-shaped user without a collection", async () => {
    const user = {
      id: 2,
      email: "xiet@a-jazz.com",
      role: "administrator",
    };

    await expect(authenticateAdmin(new Headers(), {
      auth: vi.fn().mockResolvedValue({ user }),
    } as never)).resolves.toBeNull();
  });

  it("rejects a user authenticated from another collection", async () => {
    const user = {
      id: 2,
      collection: "customers",
      email: "customer@example.com",
      role: "administrator",
    };

    await expect(authenticateAdmin(new Headers(), {
      auth: vi.fn().mockResolvedValue({ user }),
    } as never)).resolves.toBeNull();
  });
});
