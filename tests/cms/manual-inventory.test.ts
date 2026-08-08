import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireAdminMock, routeAdjustMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(async () => ({ id: 1, email: "xiet@a-jazz.com", role: "administrator" })),
  routeAdjustMock: vi.fn(async (input: Record<string, unknown>) => ({
    productId: Number(input.productId),
    variantId: Number(input.variantId),
    oldQuantity: 5,
    newQuantity: Number(input.quantity),
    reason: String(input.reason),
    actorId: "1",
    actorEmail: "xiet@a-jazz.com",
    correlationId: "adjustment-route",
  })),
}));

import {
  InventoryAdjustmentError,
  adjustManualInventory,
  createPostgresManualInventoryStore,
} from "../../lib/cms/manual-inventory";
import { createManualInventoryRouteHandler } from "../../app/api/cms/products/[id]/inventory/route";

const actor = { id: "1", email: "xiet@a-jazz.com" };

describe("manual inventory adjustment", () => {
  it("records an absolute quantity through the store", async () => {
    const store = {
      adjustAbsolute: vi.fn(async (input: Record<string, unknown>) => ({
        productId: Number(input.productId),
        variantId: Number(input.variantId),
        oldQuantity: 5,
        newQuantity: Number(input.quantity),
        reason: String(input.reason),
        actorId: String((input.actor as typeof actor).id),
        actorEmail: (input.actor as typeof actor).email,
        correlationId: "adjustment-1",
      })),
    };

    await expect(adjustManualInventory({
      productId: 42,
      variantId: 101,
      quantity: 8,
      reason: "倉庫入庫",
      actor,
    }, store)).resolves.toMatchObject({ oldQuantity: 5, newQuantity: 8, reason: "倉庫入庫" });
    expect(store.adjustAbsolute).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ productId: 42, variantId: 101, quantity: -1, reason: "倉庫入庫", actor }, "invalid_inventory_quantity"],
    [{ productId: 42, variantId: 101, quantity: 1.5, reason: "倉庫入庫", actor }, "invalid_inventory_quantity"],
    [{ productId: 42, variantId: 101, quantity: 8, reason: "ab", actor }, "invalid_inventory_reason"],
    [{ productId: 42, variantId: 101, quantity: 8, reason: "在", actor }, "invalid_inventory_reason"],
  ])("rejects invalid absolute adjustments", async (input, code) => {
    await expect(adjustManualInventory(input, { adjustAbsolute: vi.fn() })).rejects.toMatchObject({ code });
  });

  it("locks ownership and inserts the audit in the same SQL transaction", async () => {
    const queries: string[] = [];
    const transactionSql = vi.fn((strings: TemplateStringsArray) => {
      const text = strings.join("?");
      queries.push(text);
      if (text.includes("SELECT")) return Promise.resolve([{
        product_id: 42,
        variant_id: 101,
        inventory_mode: "manual",
        available_quantity: 5,
      }]);
      if (text.includes("INSERT INTO public.manual_inventory_adjustments")) {
        return Promise.resolve([{ created_at: "2026-08-09T00:00:00.000Z" }]);
      }
      return Promise.resolve([]);
    });
    const sql = { begin: vi.fn(async (callback: (client: typeof transactionSql) => Promise<unknown>) => callback(transactionSql)) };
    const store = createPostgresManualInventoryStore(sql as never, async () => undefined);

    await expect(store.adjustAbsolute({
      productId: 42,
      variantId: 101,
      quantity: 8,
      reason: "倉庫入庫",
      actor,
      correlationId: "adjustment-1",
    })).resolves.toMatchObject({ oldQuantity: 5, newQuantity: 8 });

    expect(sql.begin).toHaveBeenCalledTimes(1);
    expect(queries[0]).toContain("FOR UPDATE");
    expect(queries.some((query) => query.includes("UPDATE public.product_variants"))).toBe(true);
    expect(queries.some((query) => query.includes("INSERT INTO public.manual_inventory_adjustments"))).toBe(true);
  });

  it("rejects RMS inventory before any quantity update", async () => {
    const queries: string[] = [];
    const transactionSql = vi.fn((strings: TemplateStringsArray) => {
      const text = strings.join("?");
      queries.push(text);
      return Promise.resolve(text.includes("SELECT") ? [{
        product_id: 42,
        variant_id: 101,
        inventory_mode: "rms",
        available_quantity: 5,
      }] : []);
    });
    const store = createPostgresManualInventoryStore({
      begin: async (callback: (client: typeof transactionSql) => Promise<unknown>) => callback(transactionSql),
    } as never, async () => undefined);

    await expect(store.adjustAbsolute({
      productId: 42,
      variantId: 101,
      quantity: 8,
      reason: "倉庫入庫",
      actor,
      correlationId: "adjustment-1",
    })).rejects.toMatchObject({ code: "rms_inventory_read_only", status: 409 });
    expect(queries.some((query) => query.includes("UPDATE public.product_variants"))).toBe(false);
  });

  it("rejects a variant owned by another product under the row lock", async () => {
    const queries: string[] = [];
    const transactionSql = vi.fn((strings: TemplateStringsArray) => {
      const text = strings.join("?");
      queries.push(text);
      return Promise.resolve(text.includes("SELECT") ? [{
        product_id: 99,
        variant_id: 101,
        inventory_mode: "manual",
        available_quantity: 5,
      }] : []);
    });
    const store = createPostgresManualInventoryStore({
      begin: async (callback: (client: typeof transactionSql) => Promise<unknown>) => callback(transactionSql),
    } as never, async () => undefined);

    await expect(store.adjustAbsolute({
      productId: 42,
      variantId: 101,
      quantity: 8,
      reason: "倉庫入庫",
      actor,
      correlationId: "adjustment-1",
    })).rejects.toMatchObject({ code: "variant_product_mismatch", status: 404 });
    expect(queries.some((query) => query.includes("UPDATE public.product_variants"))).toBe(false);
  });
});

function request(body: unknown, origin = "https://ajazz.jp") {
  return new Request("https://ajazz.jp/api/cms/products/42/inventory", {
    method: "POST",
    headers: { "content-type": "application/json", host: "ajazz.jp", origin },
    body: JSON.stringify(body),
  });
}

describe("manual inventory route", () => {
  const POST = createManualInventoryRouteHandler({
    authenticate: requireAdminMock,
    adjust: routeAdjustMock,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ id: 1, email: "xiet@a-jazz.com", role: "administrator" });
  });

  it("requires same origin before authentication", async () => {
    const response = await POST(request({ variantId: 101, quantity: 8, reason: "倉庫入庫" }, "https://evil.test"), {
      params: Promise.resolve({ id: "42" }),
    });
    expect(response.status).toBe(403);
    expect(requireAdminMock).not.toHaveBeenCalled();

    const withoutOrigin = new Request("https://ajazz.jp/api/cms/products/42/inventory", {
      method: "POST",
      headers: { "content-type": "application/json", host: "ajazz.jp" },
      body: JSON.stringify({ variantId: 101, quantity: 8, reason: "倉庫入庫" }),
    });
    expect((await POST(withoutOrigin, { params: Promise.resolve({ id: "42" }) })).status).toBe(403);
  });

  it("requires an administrator and strict object JSON", async () => {
    requireAdminMock.mockRejectedValueOnce(new InventoryAdjustmentError("unauthorized", 401));
    expect((await POST(request({ variantId: 101, quantity: 8, reason: "倉庫入庫" }), {
      params: Promise.resolve({ id: "42" }),
    })).status).toBe(401);

    expect((await POST(request([]), { params: Promise.resolve({ id: "42" }) })).status).toBe(400);
    expect((await POST(request({ variantId: 101, quantity: 8, reason: "倉庫入庫", extra: true }), {
      params: Promise.resolve({ id: "42" }),
    })).status).toBe(400);
  });

  it("maps stable validation, missing, RMS conflict, and server statuses", async () => {
    for (const [error, status] of [
      [new InventoryAdjustmentError("invalid_inventory_quantity", 400), 400],
      [new InventoryAdjustmentError("variant_not_found", 404), 404],
      [new InventoryAdjustmentError("rms_inventory_read_only", 409), 409],
      [new Error("database unavailable"), 500],
    ] as const) {
      routeAdjustMock.mockRejectedValueOnce(error);
      const response = await POST(request({ variantId: 101, quantity: 8, reason: "倉庫入庫" }), {
        params: Promise.resolve({ id: "42" }),
      });
      expect(response.status).toBe(status);
    }
  });

  it("returns 400 for malformed JSON", async () => {
    const malformed = new Request("https://ajazz.jp/api/cms/products/42/inventory", {
      method: "POST",
      headers: { "content-type": "application/json", host: "ajazz.jp", origin: "https://ajazz.jp" },
      body: "{",
    });
    const response = await POST(malformed, { params: Promise.resolve({ id: "42" }) });
    expect(response.status).toBe(400);
    expect(routeAdjustMock).not.toHaveBeenCalled();
  });

  it("rejects non-canonical route and body identifiers", async () => {
    expect((await POST(request({ variantId: 101, quantity: 8, reason: "在庫修正" }), {
      params: Promise.resolve({ id: "42x" }),
    })).status).toBe(400);
    expect((await POST(request({ variantId: "101", quantity: 8, reason: "在庫修正" }), {
      params: Promise.resolve({ id: "42" }),
    })).status).toBe(400);
    expect(routeAdjustMock).not.toHaveBeenCalled();
  });
});
