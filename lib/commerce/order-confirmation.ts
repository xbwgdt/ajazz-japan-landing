import { commerceSql, ensureCommerceSchema } from "./db";
import type { OrderStatus } from "./types";

export interface OrderConfirmation {
  id: string;
  status: OrderStatus;
  customerEmail: string | null;
  totalJpy: number;
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
