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
        SELECT pv.id::text AS id, p.name, pv.price_jpy, (pv.available_quantity - pv.reserved_quantity) AS available_quantity
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
          WITH expired AS (
            UPDATE stock_reservations
            SET status = 'expired'
            WHERE status = 'active' AND expires_at <= NOW()
            RETURNING id
          )
          UPDATE product_variants pv
          SET reserved_quantity = GREATEST(0, pv.reserved_quantity - sri.quantity), updated_at = NOW()
          FROM stock_reservation_items sri
          WHERE sri.reservation_id IN (SELECT id FROM expired)
            AND sri.variant_id = pv.id
        `;

        for (const line of [...input.lines].sort((left, right) => left.variantId.localeCompare(right.variantId))) {
          const [variant] = await sql<Array<{ id: string; available_quantity: number; reserved_quantity: number }>>`
            SELECT id::text AS id, available_quantity, reserved_quantity
            FROM product_variants
            WHERE id::text = ${line.variantId}
            FOR UPDATE
          `;
          if (!variant || variant.available_quantity - variant.reserved_quantity < line.quantity) {
            throw new Error("Requested inventory is no longer available");
          }
          await sql`
            UPDATE product_variants
            SET reserved_quantity = reserved_quantity + ${line.quantity}, updated_at = NOW()
            WHERE id::text = ${line.variantId}
          `;
        }

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
