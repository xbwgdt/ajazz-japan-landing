import { describe, expect, it, vi } from "vitest";
import * as qs from "qs-esm";
import { Products } from "../../cms/collections/Products";
import { applyStockStateToHref, clearStockStateFromHref, stockStateFromHref } from "../../lib/cms/stock-state-filter-query";
import { createStockStateRouteHandler, findCmsProductIdsForStockState, stockStateWhere } from "../../lib/cms/stock-state-filter";

describe("authoritative product stock-state filter", () => {
  it("maps current operational stock to CMS IDs with reservation-aware in/out semantics", async () => {
    const queries: string[] = [];
    const execute = vi.fn(async (strings: TemplateStringsArray) => {
      queries.push(strings.join(""));
      return [{ cms_product_id: "cms-1" }, { cms_product_id: 2 }];
    });
    await expect(findCmsProductIdsForStockState(execute, "in")).resolves.toEqual(["cms-1", "2"]);
    const query = queries[0];
    expect(query).toContain("cms_product_id IS NOT NULL");
    expect(query).toContain("p.published = TRUE");
    expect(query).toContain("p.lifecycle = 'active'");
    expect(query).toContain("pv.available_quantity - pv.reserved_quantity > 0");

    await findCmsProductIdsForStockState(execute, "out");
    expect(queries[1]).toContain("NOT EXISTS");
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
    const browserGet = await GET(new Request("https://ajazz.jp/api/cms/products/stock-state?state=in", { headers: { host: "ajazz.jp" } }));
    expect(browserGet.status).toBe(200);
  });

  it("intersects the stock IDs with native Payload filters and represents no matches", () => {
    expect(stockStateWhere({ category: { equals: "keyboards" } }, ["11", "12"])).toEqual({
      and: [{ category: { equals: "keyboards" } }, { id: { in: ["11", "12"] } }],
    });
    expect(stockStateWhere(undefined, [])).toEqual({ id: { in: [-1] } });
    expect(stockStateWhere({ or: [] }, ["11"])).toEqual({ id: { in: ["11"] } });
    expect(stockStateWhere({
      or: [{ and: [{ category: { equals: "mouse" } }, { sourceType: { equals: "rms" } }] }],
    }, ["11"])).toEqual({
      or: [{ and: [
        { category: { equals: "mouse" } },
        { sourceType: { equals: "rms" } },
        { id: { in: ["11"] } },
      ] }],
    });
  });

  it("serializes stock IDs as a Payload-compatible nested where query", () => {
    const existing = qs.stringify({ where: { category: { equals: "mouse" } } });
    const href = applyStockStateToHref(`/admin/collections/products?${existing}`, ["11", "12"], "in", "https://ajazz.jp");
    const parsed = qs.parse(new URL(href, "https://ajazz.jp").search, { depth: 10, ignoreQueryPrefix: true });

    expect(parsed.where).toEqual({
      and: [
        { category: { equals: "mouse" } },
        { id: { in: ["11", "12"] } },
      ],
    });
    expect(parsed.stockState).toBe("in");
    expect(stockStateFromHref(href, "https://ajazz.jp")).toBe("in");
    const cleared = clearStockStateFromHref(href, "https://ajazz.jp");
    expect(qs.parse(new URL(cleared, "https://ajazz.jp").search, { depth: 10, ignoreQueryPrefix: true }).where)
      .toEqual({ category: { equals: "mouse" } });
  });

  it("registers the list filter without pretending stock is a CMS searchable field", () => {
    expect(Products.admin?.components?.beforeListTable).toEqual([
      "/cms/admin/ProductListStockFilter#ProductListStockFilter",
    ]);
    expect(Products.admin?.listSearchableFields).not.toContain("stockState");
  });
});
