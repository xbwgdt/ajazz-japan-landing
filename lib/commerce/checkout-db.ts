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
      const [row] = await commerceSql()<Array<{
        id: string;
        cart_fingerprint: string;
        expected_total_jpy: number;
        expires_at: Date;
        status: string;
        stripe_checkout_session_id: string | null;
      }>>`
        SELECT id::text AS id, cart_fingerprint, expected_total_jpy, expires_at, status, stripe_checkout_session_id
        FROM stock_reservations
        WHERE idempotency_key = ${idempotencyKey}
      `;
      return row ? {
        id: row.id,
        cartFingerprint: row.cart_fingerprint,
        expectedTotalJpy: Number(row.expected_total_jpy),
        expiresAt: new Date(row.expires_at),
        status: row.status,
        checkoutSessionId: row.stripe_checkout_session_id ?? undefined,
      } : undefined;
    },
    async create(input) {
      await ensureCommerceSchema();
      const id = randomUUID();
      await commerceSql().begin(async (sql) => {
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
          INSERT INTO stock_reservations (id, idempotency_key, cart_fingerprint, expected_total_jpy, expires_at)
          VALUES (${id}, ${input.idempotencyKey}, ${input.cartFingerprint}, ${input.expectedTotalJpy}, ${input.expiresAt})
        `;
        for (const line of input.lines) {
          await sql`
            INSERT INTO stock_reservation_items (reservation_id, variant_id, quantity)
            VALUES (${id}, ${line.variantId}, ${line.quantity})
          `;
        }
      });
      return {
        id,
        cartFingerprint: input.cartFingerprint,
        expectedTotalJpy: input.expectedTotalJpy,
        expiresAt: input.expiresAt,
        status: "active",
      };
    },
    async bindCheckoutSession(reservationId, checkoutSessionId) {
      await ensureCommerceSchema();
      const [reservation] = await commerceSql()<Array<{ id: string }>>`
        UPDATE stock_reservations
        SET stripe_checkout_session_id = ${checkoutSessionId}
        WHERE id = ${reservationId}
          AND status = 'active'
          AND expires_at > NOW()
          AND (stripe_checkout_session_id IS NULL OR stripe_checkout_session_id = ${checkoutSessionId})
        RETURNING id::text AS id
      `;
      if (!reservation) throw new Error("Reservation is bound to another checkout session");
    },
  };
}
