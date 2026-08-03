"use client";

import { useState } from "react";
import { AddToCartButton } from "./AddToCartButton";

export interface PurchasableVariant {
  id?: string;
  rmsSkuNumber: string;
  priceJpy: number;
  compareAtPriceJpy?: number;
  colorName?: string;
  imageUrl?: string;
  availableQuantity: number;
}

export function VariantPurchasePanel({
  name,
  variants,
  selectedIndex: controlledIndex,
  onSelect,
}: {
  name: string;
  variants: PurchasableVariant[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}) {
  const [internalIndex, setInternalIndex] = useState(0);
  const selectedIndex = controlledIndex ?? internalIndex;
  const selected = variants[selectedIndex];
  if (!selected) return null;
  const available = selected.availableQuantity > 0;
  const price = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(selected.priceJpy);
  const compareAtPrice = selected.compareAtPriceJpy && selected.compareAtPriceJpy > selected.priceJpy
    ? new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(selected.compareAtPriceJpy)
    : undefined;
  const points = Math.floor(selected.priceJpy / 100);

  const selectVariant = (index: number) => {
    setInternalIndex(index);
    onSelect?.(index);
  };

  return <>
    <fieldset className="store-variant-picker">
      <legend>カラー：<strong>{selected.colorName ?? selected.rmsSkuNumber}</strong></legend>
      <div className="store-variant-thumbnails">
        {variants.map((variant, index) => (
          <button
            key={variant.rmsSkuNumber}
            type="button"
            aria-label={`${variant.colorName ?? variant.rmsSkuNumber}を選択`}
            aria-pressed={index === selectedIndex}
            className={index === selectedIndex ? "is-selected" : undefined}
            onClick={() => selectVariant(index)}
          >
            {variant.imageUrl
              ? <img src={variant.imageUrl} alt="" />
              : <span>{variant.colorName?.slice(0, 1) ?? index + 1}</span>}
          </button>
        ))}
      </div>
    </fieldset>
    <div className="store-price-row">
      <p className="store-price">{price}<small>税込</small></p>
      {compareAtPrice ? <p className="store-compare-price"><span>通常価格</span><s>{compareAtPrice}</s></p> : null}
    </div>
    <p className="store-points"><strong>{points}ポイント</strong>獲得予定</p>
    <p className={available ? "store-stock is-available" : "store-stock is-unavailable"}>{available ? "在庫あり" : "在庫切れ"}</p>
    <p className="store-selected-sku">SKU {selected.rmsSkuNumber}</p>
    <AddToCartButton variantId={selected.id} name={name} priceJpy={selected.priceJpy} available={available} />
  </>;
}
