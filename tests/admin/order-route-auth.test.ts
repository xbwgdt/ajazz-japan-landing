import { APIError } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  requireAuthenticatedAdmin: vi.fn(),
}));

vi.mock("../../lib/cms/auth", () => authMocks);

function request(path: string, method = "GET", origin = "https://ajazz.jp") {
  return new Request(`https://ajazz.jp${path}`, {
    method,
    headers: {
      host: "ajazz.jp",
      origin,
    },
  });
}

describe("order route Payload authentication", () => {
  beforeEach(() => {
    authMocks.requireAuthenticatedAdmin.mockReset();
    authMocks.requireAuthenticatedAdmin.mockRejectedValue(new APIError("Unauthorized", 401));
  });

  it.each([
    ["shipment", () => import("../../app/api/admin/orders/[id]/route"), "PATCH", "/api/admin/orders/order-1"],
    ["refund", () => import("../../app/api/admin/orders/[id]/refund/route"), "POST", "/api/admin/orders/order-1/refund"],
    ["restock", () => import("../../app/api/admin/orders/[id]/restock/route"), "POST", "/api/admin/orders/order-1/restock"],
  ])("returns 401 for an unauthenticated %s mutation", async (_name, load, method, path) => {
    const route = await load();
    const response = await route[method as "PATCH" | "POST"](
      request(path, method),
      { params: Promise.resolve({ id: "order-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it.each([
    ["shipment", () => import("../../app/api/admin/orders/[id]/route"), "PATCH", "/api/admin/orders/order-1"],
    ["refund", () => import("../../app/api/admin/orders/[id]/refund/route"), "POST", "/api/admin/orders/order-1/refund"],
    ["restock", () => import("../../app/api/admin/orders/[id]/restock/route"), "POST", "/api/admin/orders/order-1/restock"],
  ])("rejects a cross-origin %s mutation before authentication", async (_name, load, method, path) => {
    const route = await load();
    const response = await route[method as "PATCH" | "POST"](
      request(path, method, "https://attacker.example"),
      { params: Promise.resolve({ id: "order-1" }) },
    );

    expect(response.status).toBe(403);
    expect(authMocks.requireAuthenticatedAdmin).not.toHaveBeenCalled();
  });

  it("returns 401 for an unauthenticated CSV export", async () => {
    const { GET } = await import("../../app/api/admin/orders/export.csv/route");
    const response = await GET(request("/api/admin/orders/export.csv"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects a cross-origin CSV export before authentication", async () => {
    const { GET } = await import("../../app/api/admin/orders/export.csv/route");
    const response = await GET(request("/api/admin/orders/export.csv", "GET", "https://attacker.example"));

    expect(response.status).toBe(403);
    expect(authMocks.requireAuthenticatedAdmin).not.toHaveBeenCalled();
  });
});
