"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";

export interface PurchasableVariant {
  id?: string;
  rmsSkuNumber: string;
  priceJpy: number;
  availableQuantity: number;
}

export function VariantPurchasePanel({ name, variants }: { name: string; variants: PurchasableVariant[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = variants[selectedIndex];
  if (!selected) return null;
  const available = selected.availableQuantity > 0;
  const price = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(selected.priceJpy);

  return <>
    <label className="store-variant-label">SKU
      <select value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>
        {variants.map((variant, index) => <option key={variant.rmsSkuNumber} value={index}>{variant.rmsSkuNumber}</option>)}
      </select>
    </label>
    <p className="store-price">{price}</p>
    <p className={available ? "store-stock is-available" : "store-stock is-unavailable"}>{available ? "在庫あり" : "在庫切れ"}</p>
    <AddToCartButton variantId={selected.id} name={name} priceJpy={selected.priceJpy} available={available} />
  </>;
}
