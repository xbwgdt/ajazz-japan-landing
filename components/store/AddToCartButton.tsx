"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";

export function AddToCartButton({ variantId, name, priceJpy, available }: { variantId?: string; name: string; priceJpy: number; available: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const canAdd = available && Boolean(variantId);

  return <button type="button" disabled={!canAdd} className="store-add-button" onClick={() => {
    if (!variantId) return;
    add({ variantId, name, priceJpy, quantity: 1 });
    setAdded(true);
  }}>
    {!available ? "入荷をお待ちください" : !variantId ? "販売準備中" : added ? "カートに追加しました" : "カートに入れる"}
  </button>;
}
