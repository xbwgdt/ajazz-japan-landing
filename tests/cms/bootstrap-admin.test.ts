import { describe, expect, it, vi } from "vitest";
import {
  bootstrapAdmin,
  readBootstrapAdminCredentials,
  runBootstrapAdmin,
} from "../../scripts/bootstrap-admin";

describe("administrator bootstrap", () => {
  it("fails closed when the environment password is missing", () => {
    expect(() => readBootstrapAdminCredentials({
      BOOTSTRAP_ADMIN_EMAIL: "xiet@a-jazz.com",
    })).toThrow("BOOTSTRAP_ADMIN_PASSWORD must contain at least 16 characters");
  });

  it("validates environment credentials before initializing Payload", async () => {
    const initializePayload = vi.fn();

    await expect(runBootstrapAdmin({
      BOOTSTRAP_ADMIN_EMAIL: "xiet@a-jazz.com",
    }, initializePayload)).rejects.toThrow(
      "BOOTSTRAP_ADMIN_PASSWORD must contain at least 16 characters",
    );
    expect(initializePayload).not.toHaveBeenCalled();
  });

  it("normalizes the fixed email before creating the first administrator", async () => {
    const payload = {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
    };

    await expect(bootstrapAdmin(payload as never, {
      email: " XIET@A-JAZZ.COM ",
      password: "a-secure-password",
    })).resolves.toBe("created");
    expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({
      collection: "admins",
      where: { email: { equals: "xiet@a-jazz.com" } },
    }));
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "admins",
      data: {
        email: "xiet@a-jazz.com",
        password: "a-secure-password",
        role: "administrator",
      },
    }));
  });

  it("does not overwrite an existing administrator", async () => {
    const payload = {
      create: vi.fn(),
      find: vi.fn().mockResolvedValue({
        docs: [{ id: 1, email: "xiet@a-jazz.com" }],
      }),
    };

    await expect(bootstrapAdmin(payload as never, {
      email: "xiet@a-jazz.com",
      password: "a-secure-password",
    })).resolves.toBe("exists");
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("rejects any first-administrator email other than the approved address", async () => {
    const payload = { create: vi.fn(), find: vi.fn() };

    await expect(bootstrapAdmin(payload as never, {
      email: "other@example.com",
      password: "a-secure-password",
    })).rejects.toThrow("BOOTSTRAP_ADMIN_EMAIL must be xiet@a-jazz.com");
    expect(payload.find).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });
});
