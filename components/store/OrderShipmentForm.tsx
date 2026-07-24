"use client";

import { useState } from "react";

export function OrderShipmentForm({ orderId, status, trackingNumber }: { orderId: string; status: string; trackingNumber: string | null }) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [tracking, setTracking] = useState(trackingNumber ?? "");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (currentStatus === "shipped") return <span>{trackingNumber ?? tracking}</span>;
  if (currentStatus !== "paid" && currentStatus !== "awaiting_fulfillment") return <span>-</span>;

  async function updateStatus(nextStatus: "awaiting_fulfillment" | "shipped") {
    setIsSaving(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus, trackingNumber: nextStatus === "shipped" ? tracking : "" }),
    });
    const payload = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (response.ok) {
      setCurrentStatus(nextStatus);
      setMessage(nextStatus === "shipped" ? "発送済みに更新しました。" : "出荷準備中に更新しました。");
    } else {
      setMessage(payload.error ?? "更新に失敗しました。");
    }
  }

  if (currentStatus === "paid") return <div className="store-shipment-form">
    <button type="button" onClick={() => updateStatus("awaiting_fulfillment")} disabled={isSaving}>{isSaving ? "更新中" : "出荷準備へ"}</button>
    {message ? <small>{message}</small> : null}
  </div>;

  return <div className="store-shipment-form">
    <input aria-label="追跡番号" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="追跡番号" />
    <button type="button" onClick={() => updateStatus("shipped")} disabled={isSaving || !tracking.trim()}>{isSaving ? "更新中" : "発送"}</button>
    {message ? <small>{message}</small> : null}
  </div>;
}
