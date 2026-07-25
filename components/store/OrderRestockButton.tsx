"use client";

import { useState } from "react";

export function OrderRestockButton({ orderId, status }: { orderId: string; status: string }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (status !== "refunded") return <span>-</span>;
  async function restock() {
    if (!window.confirm("返品商品の検品が完了し、在庫へ戻します。続行しますか？")) return;
    setIsSubmitting(true);
    const response = await fetch(`/api/admin/orders/${orderId}/restock`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    setMessage(response.ok ? (payload.restocked ? "在庫へ戻しました。" : "すでに入庫済みです。") : payload.error ?? "入庫に失敗しました。");
  }
  return <div className="store-restock"><button type="button" onClick={restock} disabled={isSubmitting}>{isSubmitting ? "処理中" : "返品入庫"}</button>{message ? <small>{message}</small> : null}</div>;
}
