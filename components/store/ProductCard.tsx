"use client";

import Link from "next/link";
import { useState } from "react";
import { productCategoryLabel, type ProductCategoryKey } from "../../lib/commerce/product-categories";

export interface ProductCardProps {
  slug: string;
  name: string;
  category: ProductCategoryKey;
  tagline: string;
  image: string;
  index: number;
  priceJpy?: number;
  compareAtPriceJpy?: number;
  points: number;
  available: boolean;
  variants?: Array<{ colorName?: string; imageUrl?: string; availableQuantity: number }>;
}

const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });

export function ProductCard({
  slug,
  name,
  category,
  tagline,
  image,
  index,
  priceJpy,
  compareAtPriceJpy,
  points = 0,
  available = false,
  variants = [],
}: ProductCardProps) {
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const visibleVariants = variants.filter((variant) => variant.imageUrl).slice(0, 4);
  const previewImage = visibleVariants[selectedVariantIndex]?.imageUrl ?? image;
  const hiddenCount = Math.max(0, variants.filter((variant) => variant.imageUrl).length - visibleVariants.length);

  return <article className="store-card">
    <div className="store-card-image">
      <img src={previewImage || image} alt={name} />
      <span>{String(index + 1).padStart(2, "0")}</span>
    </div>
    <div className="store-card-body">
      <div className="store-card-meta">
        <p>{productCategoryLabel(category)}</p>
        <h3>{name}</h3>
        <span>{tagline}</span>
      </div>
      <div className="store-card-commerce">
        <div className="store-card-prices">
          {priceJpy === undefined ? <p className="store-card-price is-pending">価格準備中</p> : <p className="store-card-price">{yen.format(priceJpy)}<small>税込</small></p>}
          {compareAtPriceJpy !== undefined ? <s className="store-card-compare-price">{yen.format(compareAtPriceJpy)}</s> : null}
        </div>
        <p className="store-card-points">{points.toLocaleString("ja-JP")}ポイント進呈</p>
        <p className={`store-card-stock ${available ? "is-available" : "is-unavailable"}`}>{available ? "在庫あり" : "在庫切れ"}</p>
      </div>
    </div>
    {visibleVariants.length ? <div className="store-card-swatches" aria-label={`${name}のカラー`}>
      {visibleVariants.map((variant, variantIndex) => <button
        key={`${variant.colorName ?? "color"}-${variantIndex}`}
        type="button"
        aria-label={variant.colorName ?? `カラー ${variantIndex + 1}`}
        aria-pressed={variantIndex === selectedVariantIndex}
        disabled={variant.availableQuantity <= 0}
        onClick={() => setSelectedVariantIndex(variantIndex)}
      ><img src={variant.imageUrl} alt="" /></button>)}
      {hiddenCount ? <span>+{hiddenCount}</span> : null}
    </div> : null}
    <Link href={`/products/${slug}`} className="store-card-command">製品を見る</Link>
  </article>;
}
