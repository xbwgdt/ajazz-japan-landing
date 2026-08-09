import { describe, expect, it, vi } from "vitest";
import { Products } from "../../cms/collections/Products";
import { createStockStateRouteHandler, findCmsProductIdsForStockState, stockStateWhere } from "../../lib/cms/stock-state-filter";

function sqlText(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks ?? [];
  return chunks.flatMap((chunk) => typeof chunk === "string" ? [chunk] : (
    chunk && typeof chunk === "object" && "value" in chunk && Array.isArray((chunk as { value?: unknown }).value)
      ? (chunk as { value: unknown[] }).value.filter((value): value is string => typeof value === "string") : []
  )).join("") + chunks.flatMap((chunk) => chunk && typeof chunk === "object" && "queryChunks" in chunk ? [sqlText(chunk)] : []).join("");
}

describe("authoritative product stock-state filter", () => {
  it("maps current operational stock to CMS IDs with reservation-aware in/out semantics", async () => {
    const execute = vi.fn(async (_query: unknown) => [{ cms_product_id: "cms-1" }, { cms_product_id: 2 }]);
    await expect(findCmsProductIdsForStockState(execute, "in")).resolves.toEqual(["cms-1", "2"]);
    const query = sqlText(execute.mock.calls[0][0]);
    expect(query).toContain("cms_product_id IS NOT NULL");
    expect(query).toContain("p.published = TRUE");
    expect(query).toContain("p.lifecycle = 'active'");
    expect(query).toContain("pv.available_quantity - pv.reserved_quantity > 0");

    await findCmsProductIdsForStockState(execute, "out");
    expect(sqlText(execute.mock.calls[1][0])).toContain("NOT EXISTS");
  });

  it("requires same-origin authenticated requests and returns no customer data", async () => {
    const authenticate = vi.fn(async () => undefined);
    const GET = createStockStateRouteHandler({ authenticate, findIds: async () => ["cms-1"] });
    const forbidden = await GET(new Request("https://ajazz.jp/api/cms/products/stock-state?state=in", { headers: { host: "ajazz.jp", origin: "https://evil.example" } }));
    expect(forbidden.status).toBe(403);
    expect(authenticate).not.toHaveBeenCalled();
    const response = await GET(new Request("https://ajazz.jp/api/cms/products/stock-state?state=out", { headers: { host: "ajazz.jp", origin: "https://ajazz.jp" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ids: ["cms-1"], state: "out" });
  });

  it("intersects the stock IDs with native Payload filters and represents no matches", () => {
    expect(stockStateWhere({ category: { equals: "keyboards" } }, ["11", "12"])).toEqual({
      and: [{ category: { equals: "keyboards" } }, { id: { in: ["11", "12"] } }],
    });
    expect(stockStateWhere(undefined, [])).toEqual({ id: { in: ["__stock_state_no_match__"] } });
  });

  it("registers the list filter without pretending stock is a CMS searchable field", () => {
    expect(Products.admin?.components?.beforeListTable).toEqual([
      "/cms/admin/ProductListStockFilter#ProductListStockFilter",
    ]);
    expect(Products.admin?.listSearchableFields).not.toContain("stockState");
  });
});
