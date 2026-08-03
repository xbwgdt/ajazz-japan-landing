import type { AdminOrderSummary } from "./admin-orders";

export function toOrderCsv(orders: AdminOrderSummary[]) {
  const rows = [["注文番号", "購入者メール", "配送先", "金額", "状態", "追跡番号", "利用規約同意日時", "受注日時"]];
  for (const order of orders) {
    rows.push([
      order.id,
      order.customerEmail ?? "",
      formatShippingAddress(order.shippingAddress),
      String(order.totalJpy),
      order.status,
      order.trackingNumber ?? "",
      order.termsAcceptedAt?.toISOString() ?? "",
      order.createdAt.toISOString(),
    ]);
  }
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}\r\n`;
}

function escapeCsv(value: string) {
  const neutralized = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(neutralized) ? `"${neutralized.replaceAll('"', '""')}"` : neutralized;
}

function formatShippingAddress(value: Record<string, unknown> | null) {
  if (!value) return "";
  const address = (value.address ?? value) as Record<string, unknown>;
  return [value.name, address.postal_code, address.state, address.city, address.line1, address.line2]
    .filter((part): part is string => typeof part === "string" && Boolean(part))
    .join(" ");
}
