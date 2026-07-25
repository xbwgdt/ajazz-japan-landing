"use client";

import { useState } from "react";

export function OrderRefundButton({ orderId, status }: { orderId: string; status: string }) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!["paid", "awaiting_fulfillment", "shipped"].includes(status)) return <span>-</span>;

  async function refund() {
    if (!window.confirm("この注文をStripeで返金します。続行しますか？")) return;
    setIsSubmitting(true);
    const response = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    setMessage(response.ok ? "返金を受け付けました。" : payload.error ?? "返金に失敗しました。");
  }

  return <div className="store-refund"><button type="button" onClick={refund} disabled={isSubmitting}>{isSubmitting ? "処理中" : "返金"}</button>{message ? <small>{message}</small> : null}</div>;
}
