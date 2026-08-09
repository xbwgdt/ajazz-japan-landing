import { isSameOrigin } from "../http-security";

export type StockState = "in" | "out";
type StockRow = { cms_product_id?: string | number };
type Query = { rows?: StockRow[] } | StockRow[];
type StockSql = (strings: TemplateStringsArray, ...values: unknown[]) => PromiseLike<Query>;

function rows(result: Query) {
  return Array.isArray(result) ? result : result.rows ?? [];
}

export async function findCmsProductIdsForStockState(
  database: StockSql,
  state: StockState,
): Promise<string[]> {
  const result = state === "in" ? await database`
    SELECT p.cms_product_id
    FROM public.products p
    WHERE p.cms_product_id IS NOT NULL
      AND p.published = TRUE
      AND p.lifecycle = 'active'
      AND EXISTS (
        SELECT 1 FROM public.product_variants pv
        WHERE pv.product_id = p.id AND pv.active = TRUE
          AND pv.available_quantity - pv.reserved_quantity > 0
      )
  ` : await database`
    SELECT p.cms_product_id
    FROM public.products p
    WHERE p.cms_product_id IS NOT NULL
      AND p.published = TRUE
      AND p.lifecycle = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.product_variants pv
        WHERE pv.product_id = p.id AND pv.active = TRUE
          AND pv.available_quantity - pv.reserved_quantity > 0
      )
  `;
  return rows(result).flatMap((row) => row.cms_product_id === undefined || row.cms_product_id === null ? [] : [String(row.cms_product_id)]);
}

export function stockStateWhere(existing: unknown, ids: string[]) {
  const stockWhere = { id: { in: ids.length ? ids : [-1] } };
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) return stockWhere;
  const record = existing as Record<string, unknown>;
  if (Array.isArray(record.or)) {
    if (record.or.length === 0) return stockWhere;
    return {
      or: record.or.map((branch) => {
        if (!branch || typeof branch !== "object" || Array.isArray(branch)) return { and: [branch, stockWhere] };
        const branchRecord = branch as Record<string, unknown>;
        return Array.isArray(branchRecord.and)
          ? { ...branchRecord, and: [...branchRecord.and, stockWhere] }
          : { and: [branchRecord, stockWhere] };
      }),
    };
  }
  if (Array.isArray(record.and)) return { ...record, and: [...record.and, stockWhere] };
  return { and: [existing, stockWhere] };
}

export function createStockStateRouteHandler(dependencies: {
  authenticate(headers: Headers): Promise<void>;
  findIds(state: StockState): Promise<string[]>;
}) {
  return async function GET(request: Request): Promise<Response> {
    if (request.headers.get("origin") && !isSameOrigin(request)) return Response.json({ code: "forbidden" }, { status: 403 });
    const state = new URL(request.url).searchParams.get("state");
    if (state !== "in" && state !== "out") return Response.json({ code: "stock_state_required" }, { status: 400 });
    try {
      await dependencies.authenticate(request.headers);
      return Response.json({ ids: await dependencies.findIds(state), state });
    } catch (error) {
      const status = error && typeof error === "object" && "status" in error ? Number((error as { status?: unknown }).status) : 0;
      return Response.json({ code: status === 401 ? "unauthorized" : "stock_state_filter_failed" }, { status: status === 401 ? 401 : 500 });
    }
  };
}
