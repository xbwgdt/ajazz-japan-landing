"use client";

import { useState } from "react";
import { stockStateWhere, type StockState } from "../../lib/cms/stock-state-filter";

function readWhere(value: string | null): unknown {
  if (!value) return undefined;
  try { return JSON.parse(value) as unknown; } catch { return undefined; }
}

export function applyStockStateToUrl(href: string, ids: string[]): string {
  const url = new URL(href, window.location.origin);
  const baseWhere = readWhere(url.searchParams.get("stockBaseWhere") ?? url.searchParams.get("where"));
  if (!url.searchParams.has("stockBaseWhere") && url.searchParams.get("where")) url.searchParams.set("stockBaseWhere", url.searchParams.get("where") as string);
  url.searchParams.set("where", JSON.stringify(stockStateWhere(baseWhere, ids)));
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function ProductListStockFilter() {
  const [state, setState] = useState<StockState | "">("");
  const [error, setError] = useState<string | null>(null);
  async function apply(next: StockState | "") {
    setState(next);
    setError(null);
    const url = new URL(window.location.href);
    if (!next) {
      const baseWhere = url.searchParams.get("stockBaseWhere");
      url.searchParams.delete("stockState");
      url.searchParams.delete("stockBaseWhere");
      if (baseWhere) url.searchParams.set("where", baseWhere);
      else url.searchParams.delete("where");
      window.location.assign(`${url.pathname}?${url.searchParams.toString()}`);
      return;
    }
    const response = await fetch(`/api/cms/products/stock-state?state=${next}`, { credentials: "same-origin", headers: { origin: window.location.origin } });
    if (!response.ok) { setError("stock_state_filter_failed"); return; }
    const result = await response.json() as { ids: string[] };
    url.searchParams.set("stockState", next);
    window.location.assign(applyStockStateToUrl(url.toString(), result.ids));
  }
  return <div aria-label="Stock state filter">
    <label>Stock state <select value={state} onChange={(event) => { void apply(event.target.value as StockState | ""); }}><option value="">All stock states</option><option value="in">In stock</option><option value="out">Out of stock</option></select></label>
    {error && <p role="alert">{error}</p>}
  </div>;
}
