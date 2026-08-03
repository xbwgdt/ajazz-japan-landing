import { commerceSql, ensureCommerceSchema } from "./db";

export async function releaseExpiredReservations() {
  await ensureCommerceSchema();
  return commerceSql().begin(async (sql) => {
    const expired = await sql<Array<{ id: string }>>`
      UPDATE stock_reservations
      SET status = 'expired'
      WHERE status = 'active' AND expires_at <= NOW() - INTERVAL '4 days'
      RETURNING id::text AS id
    `;
    if (!expired.length) return 0;

    const items = await sql<Array<{ variant_id: number; quantity: number }>>`
      SELECT variant_id, quantity
      FROM stock_reservation_items
      WHERE reservation_id IN ${sql(expired.map((reservation) => reservation.id))}
      FOR UPDATE
    `;
    for (const item of items) {
      await sql`
        UPDATE product_variants
        SET reserved_quantity = GREATEST(0, reserved_quantity - ${item.quantity}), updated_at = NOW()
        WHERE id = ${item.variant_id}
      `;
    }
    return expired.length;
  });
}

export interface CheckoutExpirationStore {
  release(input: { eventId: string; checkoutSessionId: string }): Promise<void>;
}

export async function processCheckoutExpired(
  event: { eventId: string; checkoutSessionId: string },
  store: CheckoutExpirationStore,
) {
  await store.release(event);
}

export function databaseCheckoutExpirationStore(): CheckoutExpirationStore {
  return {
    async release(input) {
      await ensureCommerceSchema();
      await commerceSql().begin(async (sql) => {
        const [claimedEvent] = await sql<Array<{ stripe_event_id: string }>>`
          INSERT INTO stripe_webhook_events (stripe_event_id, event_type)
          VALUES (${input.eventId}, 'checkout.session.expired')
          ON CONFLICT (stripe_event_id) DO NOTHING
          RETURNING stripe_event_id
        `;
        if (!claimedEvent) return;
        const [reservation] = await sql<Array<{ id: string }>>`
          UPDATE stock_reservations
          SET status = 'expired'
          WHERE stripe_checkout_session_id = ${input.checkoutSessionId}
            AND status = 'active'
          RETURNING id::text AS id
        `;
        if (!reservation) return;
        const items = await sql<Array<{ variant_id: number; quantity: number }>>`
          SELECT variant_id, quantity
          FROM stock_reservation_items
          WHERE reservation_id = ${reservation.id}
          FOR UPDATE
        `;
        for (const item of items) {
          await sql`
            UPDATE product_variants
            SET reserved_quantity = GREATEST(0, reserved_quantity - ${item.quantity}), updated_at = NOW()
            WHERE id = ${item.variant_id}
          `;
        }
      });
    },
  };
}
