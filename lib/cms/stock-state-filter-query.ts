import * as qs from "qs-esm";
import { stockStateWhere, type StockState } from "./stock-state-filter";

type QueryRecord = Record<string, unknown>;

function parseQuery(url: URL): QueryRecord {
  return qs.parse(url.search, { depth: 10, ignoreQueryPrefix: true }) as QueryRecord;
}

function storedBaseWhere(value: unknown): unknown {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function applyStockStateToHref(
  href: string,
  ids: string[],
  state: StockState,
  origin: string,
): string {
  const url = new URL(href, origin);
  const query = parseQuery(url);
  const baseWhere = storedBaseWhere(query.stockBaseWhere) ?? query.where;
  query.stockBaseWhere = JSON.stringify(baseWhere ?? null);
  query.stockState = state;
  query.where = stockStateWhere(baseWhere, ids);
  url.search = qs.stringify(query, { addQueryPrefix: true });
  return `${url.pathname}${url.search}`;
}

export function clearStockStateFromHref(href: string, origin: string): string {
  const url = new URL(href, origin);
  const query = parseQuery(url);
  const baseWhere = storedBaseWhere(query.stockBaseWhere);
  delete query.stockBaseWhere;
  delete query.stockState;
  if (baseWhere === undefined || baseWhere === null) delete query.where;
  else query.where = baseWhere;
  url.search = qs.stringify(query, { addQueryPrefix: true });
  return `${url.pathname}${url.search}`;
}

export function stockStateFromHref(href: string, origin: string): StockState | "" {
  const state = parseQuery(new URL(href, origin)).stockState;
  return state === "in" || state === "out" ? state : "";
}
