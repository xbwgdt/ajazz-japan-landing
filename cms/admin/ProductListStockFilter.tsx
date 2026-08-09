"use client";

import { useEffect, useState } from "react";
import type { StockState } from "../../lib/cms/stock-state-filter";
import { applyStockStateToHref, clearStockStateFromHref, stockStateFromHref } from "../../lib/cms/stock-state-filter-query";

export function ProductListStockFilter() {
  const [state, setState] = useState<StockState | "">("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setState(stockStateFromHref(window.location.href, window.location.origin));
  }, []);
  async function apply(next: StockState | "") {
    setError(null);
    const url = new URL(window.location.href);
    if (!next) {
      setState("");
      window.location.assign(clearStockStateFromHref(url.toString(), window.location.origin));
      return;
    }
    const response = await fetch(`/api/cms/products/stock-state?state=${next}`, { credentials: "same-origin" });
    if (!response.ok) {
      setError("stock_state_filter_failed");
      setState(stockStateFromHref(window.location.href, window.location.origin));
      return;
    }
    const result = await response.json() as { ids: string[] };
    setState(next);
    window.location.assign(applyStockStateToHref(url.toString(), result.ids, next, window.location.origin));
  }
  return <div aria-label="Stock state filter">
    <label>Stock state <select value={state} onChange={(event) => { void apply(event.target.value as StockState | ""); }}><option value="">All stock states</option><option value="in">In stock</option><option value="out">Out of stock</option></select></label>
    {error && <p role="alert">{error}</p>}
  </div>;
}
