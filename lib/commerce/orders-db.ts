import { randomUUID } from "node:crypto";
import { commerceSql, ensureCommerceSchema } from "./db";
import type { PaidOrderStore } from "./orders";

export function databasePaidOrderStore(): PaidOrderStore {
  return {
    async hasProcessedEvent(eventId) {
      await ensureCommerceSchema();
      const [row] = await commerceSql()<Array<{ stripe_event_id: string }>>`
        SELECT stripe_event_id FROM stripe_webhook_events WHERE stripe_event_id = ${eventId}
      `;
      return Boolean(row);
    },
    async getReservation(reservationId) {
      await ensureCommerceSchema();
      const [row] = await commerceSql()<Array<{ id: string; active: boolean }>>`
        SELECT id::text AS id, (status = 'active' AND expires_at > NOW()) AS active
        FROM stock_reservations
        WHERE id = ${reservationId}
      `;
      return row;
    },
    async createPaidOrder(input) {
      await ensureCommerceSchema();
      const orderId = randomUUID();
      await commerceSql().begin(async (sql) => {
        const [reservation] = await sql<Array<{ id: string }>>`
          SELECT id::text AS id
          FROM stock_reservations
          WHERE id = ${input.reservationId}
            AND status = 'active'
            AND expires_at > NOW()
          FOR UPDATE
        `;
        if (!reservation) {
          throw new Error("Reservation is no longer active");
        }

        const items = await sql<
          Array<{ variant_id: number; quantity: number; name: string; price_jpy: number; available_quantity: number }>
        >`
          SELECT sri.variant_id, sri.quantity, p.name, pv.price_jpy, pv.available_quantity
          FROM stock_reservation_items sri
          JOIN product_variants pv ON pv.id = sri.variant_id
          JOIN products p ON p.id = pv.product_id
          WHERE sri.reservation_id = ${input.reservationId}
          FOR UPDATE OF pv
        `;
        if (!items.length || items.some((item) => item.available_quantity < item.quantity)) {
          throw new Error("Reserved inventory is no longer available");
        }

        const subtotalJpy = items.reduce((total, item) => total + item.price_jpy * item.quantity, 0);
        await sql`
          INSERT INTO orders (
            id, reservation_id, stripe_checkout_session_id, subtotal_jpy, total_jpy
          ) VALUES (
            ${orderId}, ${input.reservationId}, ${input.checkoutSessionId}, ${subtotalJpy}, ${subtotalJpy}
          )
        `;
        for (const item of items) {
          await sql`
            INSERT INTO order_items (order_id, variant_id, name, unit_price_jpy, quantity)
            VALUES (${orderId}, ${item.variant_id}, ${item.name}, ${item.price_jpy}, ${item.quantity})
          `;
          await sql`
            UPDATE product_variants
            SET available_quantity = available_quantity - ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.variant_id}
          `;
        }
        await sql`
          INSERT INTO payments (order_id, amount_jpy, status)
          VALUES (${orderId}, ${subtotalJpy}, 'paid')
        `;
        await sql`
          UPDATE stock_reservations SET status = 'consumed' WHERE id = ${input.reservationId}
        `;
      });
      return { id: orderId };
    },
    async markEventProcessed(eventId) {
      await ensureCommerceSchema();
      await commerceSql()`
        INSERT INTO stripe_webhook_events (stripe_event_id, event_type)
        VALUES (${eventId}, 'checkout.session.completed')
        ON CONFLICT (stripe_event_id) DO NOTHING
      `;
    },
  };
}
