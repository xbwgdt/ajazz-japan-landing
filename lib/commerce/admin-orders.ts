import { commerceSql, ensureCommerceSchema } from "./db";
import type { OrderStatusStore } from "./orders";
import type { RefundOrderStore } from "./refunds";
import type { OrderStatus } from "./types";

export interface AdminOrderSummary {
  id: string;
  status: OrderStatus;
  customerEmail: string | null;
  totalJpy: number;
  createdAt: Date;
  trackingNumber: string | null;
  shippingAddress: Record<string, unknown> | null;
}

export async function listAdminOrders(): Promise<AdminOrderSummary[]> {
  await ensureCommerceSchema();
  const rows = await commerceSql()<Array<{
    id: string;
    status: OrderStatus;
    customer_email: string | null;
    total_jpy: number;
    created_at: Date;
    tracking_number: string | null;
    shipping_address: Record<string, unknown> | null;
  }>>`
    SELECT
      o.id::text AS id,
      o.status,
      o.customer_email,
      o.total_jpy,
      o.created_at,
      f.tracking_number
      , o.shipping_address
    FROM orders o
    LEFT JOIN LATERAL (
      SELECT tracking_number
      FROM fulfillments
      WHERE order_id = o.id
      ORDER BY created_at DESC
      LIMIT 1
    ) f ON TRUE
    ORDER BY o.created_at DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    customerEmail: row.customer_email,
    totalJpy: Number(row.total_jpy),
    createdAt: new Date(row.created_at),
    trackingNumber: row.tracking_number,
    shippingAddress: row.shipping_address,
  }));
}

export function databaseOrderStatusStore(): OrderStatusStore {
  return {
    async save(input) {
      await ensureCommerceSchema();
      await commerceSql().begin(async (sql) => {
        await sql`
          UPDATE orders
          SET status = ${input.nextStatus}, updated_at = NOW()
          WHERE id = ${input.orderId}
        `;

        if (input.nextStatus === "shipped") {
          const existing = await sql<Array<{ id: number }>>`
            SELECT id FROM fulfillments WHERE order_id = ${input.orderId} LIMIT 1 FOR UPDATE
          `;
          if (existing[0]) {
            await sql`
              UPDATE fulfillments
              SET tracking_number = ${input.trackingNumber}, shipped_at = NOW()
              WHERE id = ${existing[0].id}
            `;
          } else {
            await sql`
              INSERT INTO fulfillments (order_id, tracking_number, shipped_at)
              VALUES (${input.orderId}, ${input.trackingNumber}, NOW())
            `;
          }
        }
      });
    },
  };
}

export async function findAdminOrderStatus(orderId: string): Promise<OrderStatus | undefined> {
  await ensureCommerceSchema();
  const [row] = await commerceSql()<Array<{ status: OrderStatus }>>`
    SELECT status FROM orders WHERE id = ${orderId}
  `;
  return row?.status;
}

export function databaseRefundOrderStore(): RefundOrderStore {
  return {
    async find(orderId) {
      await ensureCommerceSchema();
      const [row] = await commerceSql()<Array<{ status: OrderStatus; stripe_payment_intent_id: string | null; total_jpy: number }>>`
        SELECT o.status, p.stripe_payment_intent_id, o.total_jpy
        FROM orders o
        JOIN payments p ON p.order_id = o.id
        WHERE o.id = ${orderId} AND p.status = 'paid'
        ORDER BY p.id DESC
        LIMIT 1
      `;
      return row ? { status: row.status, paymentIntentId: row.stripe_payment_intent_id, amountJpy: Number(row.total_jpy) } : undefined;
    },
    async record(input) {
      await ensureCommerceSchema();
      await commerceSql().begin(async (sql) => {
        await sql`
          INSERT INTO refunds (order_id, stripe_refund_id, amount_jpy, status)
          VALUES (${input.orderId}, ${input.stripeRefundId}, ${input.amountJpy}, ${input.status})
          ON CONFLICT (stripe_refund_id) DO NOTHING
        `;
        await sql`
          UPDATE orders
          SET status = ${input.status === "succeeded" ? "refunded" : "refund_pending"}, updated_at = NOW()
          WHERE id = ${input.orderId}
        `;
      });
    },
  };
}
