"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

export function AddToCartButton({ variantId, name, priceJpy, available, quantity = 1 }: { variantId?: string; name: string; priceJpy: number; available: boolean; quantity?: number }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const canAdd = available && Boolean(variantId);

  useEffect(() => {
    setAdded(false);
  }, [variantId]);

  return <button type="button" disabled={!canAdd} className="store-add-button" onClick={() => {
    if (!variantId) return;
    add({ variantId, name, priceJpy, quantity });
    setAdded(true);
  }}>
    {!available ? "入荷をお待ちください" : !variantId ? "販売準備中" : added ? "カートに追加しました" : "カートに入れる"}
  </button>;
}
