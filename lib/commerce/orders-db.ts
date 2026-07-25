import { randomUUID } from "node:crypto";
import { commerceSql, ensureCommerceSchema } from "./db";
import type { PaidOrderStore } from "./orders";

export function databasePaidOrderStore(): PaidOrderStore {
  return {
    async createPaidOrder(input) {
      await ensureCommerceSchema();
      const orderId = randomUUID();
      return commerceSql().begin(async (sql) => {
        // This claim is rolled back with the order if any following step fails.
        const [claimedEvent] = await sql<Array<{ stripe_event_id: string }>>`
          INSERT INTO stripe_webhook_events (stripe_event_id, event_type)
          VALUES (${input.eventId}, 'checkout.session.completed')
          ON CONFLICT (stripe_event_id) DO NOTHING
          RETURNING stripe_event_id
        `;
        if (!claimedEvent) return undefined;

        const [reservation] = await sql<Array<{ id: string }>>`
          SELECT id::text AS id
          FROM stock_reservations
          WHERE id = ${input.reservationId}
            AND status = 'active'
            AND expires_at > NOW()
          FOR UPDATE
        `;
        if (!reservation) throw new Error("Reservation is no longer active");

        const items = await sql<
          Array<{ variant_id: number; quantity: number; name: string; price_jpy: number; available_quantity: number; reserved_quantity: number }>
        >`
          SELECT sri.variant_id, sri.quantity, p.name, pv.price_jpy, pv.available_quantity, pv.reserved_quantity
          FROM stock_reservation_items sri
          JOIN product_variants pv ON pv.id = sri.variant_id
          JOIN products p ON p.id = pv.product_id
          WHERE sri.reservation_id = ${input.reservationId}
          FOR UPDATE OF pv
        `;
        if (!items.length || items.some((item) => item.available_quantity < item.quantity || item.reserved_quantity < item.quantity)) {
          throw new Error("Reserved inventory is no longer available");
        }

        const subtotalJpy = items.reduce((total, item) => total + item.price_jpy * item.quantity, 0);
        await sql`
          INSERT INTO orders (
            id, reservation_id, stripe_checkout_session_id, customer_email, shipping_address, terms_accepted_at, subtotal_jpy, total_jpy
          ) VALUES (
            ${orderId}, ${input.reservationId}, ${input.checkoutSessionId}, ${input.customerEmail ?? null},
            ${input.shippingAddress ? JSON.stringify(input.shippingAddress) : null}::jsonb,
            CASE WHEN ${input.termsAccepted ?? false} THEN NOW() ELSE NULL END,
            ${subtotalJpy}, ${subtotalJpy}
          )
        `;
        for (const item of items) {
          await sql`
            INSERT INTO order_items (order_id, variant_id, name, unit_price_jpy, quantity)
            VALUES (${orderId}, ${item.variant_id}, ${item.name}, ${item.price_jpy}, ${item.quantity})
          `;
          await sql`
            UPDATE product_variants
            SET available_quantity = available_quantity - ${item.quantity},
                reserved_quantity = reserved_quantity - ${item.quantity},
                updated_at = NOW()
            WHERE id = ${item.variant_id}
          `;
        }
        await sql`
          INSERT INTO payments (order_id, stripe_payment_intent_id, amount_jpy, status)
          VALUES (${orderId}, ${input.stripePaymentIntentId ?? null}, ${subtotalJpy}, 'paid')
        `;
        await sql`
          UPDATE stock_reservations SET status = 'consumed' WHERE id = ${input.reservationId}
        `;
        return { id: orderId };
      });
    },
  };
}
