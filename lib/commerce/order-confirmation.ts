import { commerceSql, ensureCommerceSchema } from "./db";
import type { OrderStatus } from "./types";

export interface OrderConfirmation {
  id: string;
  status: OrderStatus;
  customerEmail: string | null;
  totalJpy: number;
}

export interface OrderStatusDisplay {
  heading: string;
  payment: string;
  shipment: string;
}

const orderStatusDisplays: Record<OrderStatus, OrderStatusDisplay> = {
  paid: {
    heading: "ご注文を受け付けました。",
    payment: "決済完了",
    shipment: "発送準備を開始します。通常3営業日以内に発送します。",
  },
  awaiting_fulfillment: {
    heading: "ご注文を受け付けました。",
    payment: "決済完了",
    shipment: "発送準備中です。通常3営業日以内に発送します。",
  },
  shipped: {
    heading: "商品を発送しました。",
    payment: "決済完了",
    shipment: "発送済みです。追跡情報は発送案内メールをご確認ください。",
  },
  cancelled: {
    heading: "ご注文はキャンセルされました。",
    payment: "注文キャンセル",
    shipment: "この注文の商品は発送されません。",
  },
  refund_pending: {
    heading: "返金手続き中です。",
    payment: "返金処理中",
    shipment: "返金状況は完了後にメールでご案内します。",
  },
  refunded: {
    heading: "返金が完了しました。",
    payment: "返金完了",
    shipment: "返金先への反映時期は決済会社により異なります。",
  },
};

export function getOrderStatusDisplay(status: OrderStatus): OrderStatusDisplay {
  return orderStatusDisplays[status];
}

export async function findOrderConfirmation(checkoutSessionId: string): Promise<OrderConfirmation | undefined> {
  await ensureCommerceSchema();
  const [order] = await commerceSql()<Array<{ id: string; status: OrderStatus; customer_email: string | null; total_jpy: number }>>`
    SELECT id::text AS id, status, customer_email, total_jpy
    FROM orders
    WHERE stripe_checkout_session_id = ${checkoutSessionId}
  `;
  return order ? { id: order.id, status: order.status, customerEmail: order.customer_email, totalJpy: Number(order.total_jpy) } : undefined;
}
