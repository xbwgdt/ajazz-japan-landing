import { commerceSql, ensureCommerceSchema } from "./db";

export async function releaseExpiredReservations() {
  await ensureCommerceSchema();
  return commerceSql().begin(async (sql) => {
    const expired = await sql<Array<{ id: string }>>`
      UPDATE stock_reservations
      SET status = 'expired'
      WHERE status = 'active' AND expires_at <= NOW()
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
