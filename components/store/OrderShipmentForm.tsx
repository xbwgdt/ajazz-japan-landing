"use client";

import { useState } from "react";

export function OrderShipmentForm({ orderId, status, trackingNumber }: { orderId: string; status: string; trackingNumber: string | null }) {
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (status === "shipped") return <span>{trackingNumber ?? "-"}</span>;
  if (status !== "awaiting_fulfillment") return <span>-</span>;

  async function markShipped() {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "shipped", trackingNumber: tracking }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);
    setMessage(response.ok ? "発送済みに更新しました。" : payload.error ?? "更新に失敗しました。");
  }

  return <div className="store-shipment-form">
    <input aria-label="追跡番号" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="追跡番号" />
    <button type="button" onClick={markShipped} disabled={isSaving || !tracking.trim()}>{isSaving ? "更新中" : "発送"}</button>
    {message ? <small>{message}</small> : null}
  </div>;
}
