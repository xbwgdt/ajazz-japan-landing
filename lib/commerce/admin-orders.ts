import { commerceSql, ensureCommerceSchema } from "./db";
import type { OrderStatusStore } from "./orders";
import type { OrderStatus } from "./types";

export interface AdminOrderSummary {
  id: string;
  status: OrderStatus;
  customerEmail: string | null;
  totalJpy: number;
  createdAt: Date;
  trackingNumber: string | null;
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
  }>>`
    SELECT
      o.id::text AS id,
      o.status,
      o.customer_email,
      o.total_jpy,
      o.created_at,
      f.tracking_number
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
