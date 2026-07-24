import { randomUUID } from "node:crypto";
import { commerceSql, ensureCommerceSchema } from "./db";
import type { CartVariantSource } from "./cart";
import type { ReservationStore } from "./reservations";

export function databaseVariantSource(): CartVariantSource {
  return {
    async getVariants(variantIds) {
      await ensureCommerceSchema();
      const sql = commerceSql();
      const rows = await sql<
        Array<{ id: string; name: string; price_jpy: number; available_quantity: number }>
      >`
        SELECT pv.id::text AS id, p.name, pv.price_jpy, pv.available_quantity
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE p.published = TRUE AND pv.id::text IN ${sql(variantIds)}
      `;
      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        priceJpy: row.price_jpy,
        availableQuantity: row.available_quantity,
      }));
    },
  };
}

export function databaseReservationStore(): ReservationStore {
  return {
    async getByIdempotencyKey(idempotencyKey) {
      await ensureCommerceSchema();
      const [row] = await commerceSql()<Array<{ id: string }>>`
        SELECT id::text AS id
        FROM stock_reservations
        WHERE idempotency_key = ${idempotencyKey}
          AND status = 'active'
          AND expires_at > NOW()
      `;
      return row;
    },
    async create(input) {
      await ensureCommerceSchema();
      const id = randomUUID();
      await commerceSql().begin(async (sql) => {
        await sql`
          INSERT INTO stock_reservations (id, idempotency_key, expires_at)
          VALUES (${id}, ${input.idempotencyKey}, NOW() + INTERVAL '15 minutes')
        `;
        for (const line of input.lines) {
          await sql`
            INSERT INTO stock_reservation_items (reservation_id, variant_id, quantity)
            VALUES (${id}, ${line.variantId}, ${line.quantity})
          `;
        }
      });
      return { id };
    },
  };
}
