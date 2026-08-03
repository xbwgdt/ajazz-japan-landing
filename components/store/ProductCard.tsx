"use client";

import Link from "next/link";
import { useState } from "react";

export interface ProductCardProps {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  image: string;
  index: number;
  variants?: Array<{ colorName?: string; imageUrl?: string; availableQuantity: number }>;
}

export function ProductCard({ slug, name, category, tagline, image, index, variants = [] }: ProductCardProps) {
  const [previewImage, setPreviewImage] = useState(image);
  const visibleVariants = variants.filter((variant) => variant.imageUrl).slice(0, 4);
  const hiddenCount = Math.max(0, variants.filter((variant) => variant.imageUrl).length - visibleVariants.length);

  return <article className="store-card">
    <Link href={`/products/${slug}`} className="store-card-link">
      <div className="store-card-image">
        <img src={previewImage || image} alt={name} />
        <span>{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="store-card-meta">
        <p>{category}</p>
        <h3>{name}</h3>
        <span>{tagline}</span>
      </div>
    </Link>
    {visibleVariants.length ? <div className="store-card-swatches" aria-label={`${name}のカラー`}>
      {visibleVariants.map((variant, variantIndex) => <button
        key={`${variant.colorName ?? "color"}-${variantIndex}`}
        type="button"
        aria-label={variant.colorName ?? `カラー ${variantIndex + 1}`}
        disabled={variant.availableQuantity <= 0}
        onClick={() => setPreviewImage(variant.imageUrl ?? image)}
      ><img src={variant.imageUrl} alt="" /></button>)}
      {hiddenCount ? <span>+{hiddenCount}</span> : null}
    </div> : null}
  </article>;
}
