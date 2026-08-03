import { commerceSql, ensureCommerceSchema } from "./db";
import type { OrderStatusStore } from "./orders";
import { orderStatusAfterRefund, type RefundEventStore, type RefundOrderStore } from "./refunds";
import type { ReturnRestockStore } from "./returns";
import type { OrderStatus } from "./types";

export interface AdminOrderSummary {
  id: string;
  status: OrderStatus;
  customerEmail: string | null;
  totalJpy: number;
  createdAt: Date;
  trackingNumber: string | null;
  shippingAddress: Record<string, unknown> | null;
  termsAcceptedAt: Date | null;
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
    terms_accepted_at: Date | null;
  }>>`
    SELECT
      o.id::text AS id,
      o.status,
      o.customer_email,
      o.total_jpy,
      o.created_at,
      f.tracking_number
      , o.shipping_address
      , o.terms_accepted_at
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
    termsAcceptedAt: row.terms_accepted_at ? new Date(row.terms_accepted_at) : null,
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
      const [row] = await commerceSql()<Array<{
        status: OrderStatus;
        stripe_payment_intent_id: string | null;
        total_jpy: number;
        updated_at: Date;
      }>>`
        SELECT o.status, p.stripe_payment_intent_id, o.total_jpy, o.updated_at
        FROM orders o
        JOIN payments p ON p.order_id = o.id
        WHERE o.id = ${orderId} AND p.status = 'paid'
        ORDER BY p.id DESC
        LIMIT 1
      `;
      return row ? {
        status: row.status,
        paymentIntentId: row.stripe_payment_intent_id,
        amountJpy: Number(row.total_jpy),
        refundAttemptKey: new Date(row.updated_at).getTime().toString(36),
      } : undefined;
    },
    async record(input) {
      await ensureCommerceSchema();
      await commerceSql().begin(async (sql) => {
        const [savedRefund] = await sql<Array<{ id: number }>>`
          INSERT INTO refunds (order_id, stripe_refund_id, amount_jpy, status)
          VALUES (${input.orderId}, ${input.stripeRefundId}, ${input.amountJpy}, ${input.status})
          ON CONFLICT (stripe_refund_id) DO NOTHING
          RETURNING id
        `;
        if (!savedRefund) return;
        await sql`
          UPDATE refunds
          SET previous_order_status = ${input.previousStatus}
          WHERE id = ${savedRefund.id}
        `;
        if (input.restock) {
          const [event] = await sql<Array<{ order_id: string }>>`
            INSERT INTO inventory_restock_events (order_id, reason, stripe_refund_id)
            VALUES (${input.orderId}, 'unshipped_refund', ${input.stripeRefundId})
            ON CONFLICT (order_id) DO NOTHING
            RETURNING order_id::text AS order_id
          `;
          if (event) {
            const items = await sql<Array<{ variant_id: number; quantity: number }>>`
              SELECT variant_id, quantity FROM order_items WHERE order_id = ${input.orderId}
              FOR UPDATE
            `;
            for (const item of items) {
              await sql`
                UPDATE product_variants
                SET available_quantity = available_quantity + ${item.quantity}, updated_at = NOW()
                WHERE id = ${item.variant_id}
              `;
            }
          }
        }
        await sql`
          UPDATE orders
          SET status = ${orderStatusAfterRefund(input.status, input.previousStatus)}, updated_at = NOW()
          WHERE id = ${input.orderId}
        `;
      });
    },
  };
}

export function databaseRefundEventStore(): RefundEventStore {
  return {
    async reconcile(event) {
      await ensureCommerceSchema();
      await commerceSql().begin(async (sql) => {
        const [claimedEvent] = await sql<Array<{ stripe_event_id: string }>>`
          INSERT INTO stripe_webhook_events (stripe_event_id, event_type)
          VALUES (${event.eventId}, 'refund.updated')
          ON CONFLICT (stripe_event_id) DO NOTHING
          RETURNING stripe_event_id
        `;
        if (!claimedEvent) return;

        let [refund] = await sql<Array<{
          id: number;
          amount_jpy: number;
          previous_order_status: OrderStatus | null;
          stripe_payment_intent_id: string | null;
        }>>`
          SELECT r.id, r.amount_jpy, r.previous_order_status, p.stripe_payment_intent_id
          FROM refunds r
          JOIN payments p ON p.order_id = r.order_id AND p.status = 'paid'
          WHERE r.stripe_refund_id = ${event.stripeRefundId}
            AND r.order_id = ${event.orderId}
          FOR UPDATE OF r
        `;
        if (!refund) {
          const [order] = await sql<Array<{
            status: OrderStatus;
            amount_jpy: number;
            stripe_payment_intent_id: string | null;
          }>>`
            SELECT o.status, p.amount_jpy, p.stripe_payment_intent_id
            FROM orders o
            JOIN payments p ON p.order_id = o.id
            WHERE o.id = ${event.orderId}
              AND p.status = 'paid'
            FOR UPDATE OF o
          `;
          if (
            !order
            || Number(order.amount_jpy) !== event.amountJpy
            || order.stripe_payment_intent_id !== event.paymentIntentId
          ) {
            throw new Error("Stripe refund does not match the recorded order payment");
          }
          [refund] = await sql<Array<{
            id: number;
            amount_jpy: number;
            previous_order_status: OrderStatus;
            stripe_payment_intent_id: string | null;
          }>>`
            INSERT INTO refunds (order_id, stripe_refund_id, amount_jpy, status, previous_order_status)
            VALUES (${event.orderId}, ${event.stripeRefundId}, ${event.amountJpy}, ${event.status}, ${order.status})
            ON CONFLICT (stripe_refund_id) DO UPDATE SET status = EXCLUDED.status
            RETURNING id, amount_jpy, previous_order_status, ${event.paymentIntentId}::text AS stripe_payment_intent_id
          `;
        }
        if (
          Number(refund.amount_jpy) !== event.amountJpy
          || refund.stripe_payment_intent_id !== event.paymentIntentId
        ) {
          throw new Error("Stripe refund does not match the recorded order refund");
        }

        await sql`UPDATE refunds SET status = ${event.status} WHERE id = ${refund.id}`;
        const previousStatus = refund.previous_order_status ?? "paid";
        if (event.status === "succeeded") {
          if (previousStatus !== "shipped") {
            const [restockEvent] = await sql<Array<{ order_id: string }>>`
              INSERT INTO inventory_restock_events (order_id, reason, stripe_refund_id)
              VALUES (${event.orderId}, 'unshipped_refund', ${event.stripeRefundId})
              ON CONFLICT (order_id) DO NOTHING
              RETURNING order_id::text AS order_id
            `;
            if (restockEvent) {
              const items = await sql<Array<{ variant_id: number; quantity: number }>>`
                SELECT variant_id, quantity FROM order_items WHERE order_id = ${event.orderId}
                FOR UPDATE
              `;
              for (const item of items) {
                await sql`
                  UPDATE product_variants
                  SET available_quantity = available_quantity + ${item.quantity}, updated_at = NOW()
                  WHERE id = ${item.variant_id}
                `;
              }
            }
          }
        }
        await sql`
          UPDATE orders
          SET status = ${orderStatusAfterRefund(event.status, previousStatus)}, updated_at = NOW()
          WHERE id = ${event.orderId}
        `;
      });
    },
  };
}

export function databaseReturnRestockStore(): ReturnRestockStore {
  return {
    async findStatus(orderId) {
      return findAdminOrderStatus(orderId);
    },
    async restock(orderId) {
      await ensureCommerceSchema();
      return commerceSql().begin(async (sql) => {
        const [event] = await sql<Array<{ order_id: string }>>`
          INSERT INTO inventory_restock_events (order_id, reason)
          VALUES (${orderId}, 'returned_item')
          ON CONFLICT (order_id) DO NOTHING
          RETURNING order_id::text AS order_id
        `;
        if (!event) return false;
        const items = await sql<Array<{ variant_id: number; quantity: number }>>`
          SELECT variant_id, quantity FROM order_items WHERE order_id = ${orderId}
          FOR UPDATE
        `;
        for (const item of items) {
          await sql`
            UPDATE product_variants
            SET available_quantity = available_quantity + ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.variant_id}
          `;
        }
        return true;
      });
    },
  };
}
