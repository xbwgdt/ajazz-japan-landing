import { randomUUID } from "node:crypto";
import { commerceSql, ensureCommerceSchema } from "../commerce/db";

export type InventoryActor = { id: number | string; email: string };

export type ManualInventoryAdjustmentInput = {
  productId: number;
  variantId: number;
  quantity: number;
  reason: string;
  actor: InventoryActor;
};

type StoreAdjustmentInput = ManualInventoryAdjustmentInput & { correlationId: string };

export type InventoryAdjustment = {
  productId: number;
  variantId: number;
  oldQuantity: number;
  newQuantity: number;
  reason: string;
  actorId: string;
  actorEmail: string;
  correlationId: string;
  createdAt?: string;
};

export interface ManualInventoryStore {
  adjustAbsolute(input: StoreAdjustmentInput): Promise<InventoryAdjustment>;
}

export class InventoryAdjustmentError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

function validId(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function validJapaneseReason(reason: string) {
  const normalized = reason.trim();
  return normalized.length >= 2
    && normalized.length <= 200
    && /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(normalized);
}

export async function adjustManualInventory(
  input: ManualInventoryAdjustmentInput,
  store: ManualInventoryStore,
): Promise<InventoryAdjustment> {
  if (!validId(input.productId) || !validId(input.variantId)) {
    throw new InventoryAdjustmentError("invalid_inventory_target", 400);
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 0) {
    throw new InventoryAdjustmentError("invalid_inventory_quantity", 400);
  }
  if (typeof input.reason !== "string" || !validJapaneseReason(input.reason)) {
    throw new InventoryAdjustmentError("invalid_inventory_reason", 400);
  }
  if (!input.actor?.id || typeof input.actor.email !== "string" || !input.actor.email.trim()) {
    throw new InventoryAdjustmentError("unauthorized", 401);
  }

  return store.adjustAbsolute({
    ...input,
    reason: input.reason.trim(),
    correlationId: randomUUID(),
  });
}

type SqlTag = {
  <T extends readonly unknown[] = readonly unknown[]>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T>;
  begin<T>(callback: (sql: SqlTag) => Promise<T>): Promise<T>;
};

type LockedVariant = {
  product_id: number;
  variant_id: number;
  inventory_mode: string;
  available_quantity: number;
};

export function createPostgresManualInventoryStore(
  client: SqlTag = commerceSql() as unknown as SqlTag,
  prepareSchema: () => Promise<void> = ensureCommerceSchema,
): ManualInventoryStore {
  return {
    async adjustAbsolute(input) {
      await prepareSchema();
      return client.begin(async (sql) => {
        const [locked] = await sql<LockedVariant[]>`
          SELECT
            p.id AS product_id,
            pv.id AS variant_id,
            pv.inventory_mode,
            pv.available_quantity
          FROM public.product_variants pv
          JOIN public.products p ON p.id = pv.product_id
          WHERE pv.id = ${input.variantId}
          FOR UPDATE OF p, pv
        `;

        if (!locked) throw new InventoryAdjustmentError("variant_not_found", 404);
        if (Number(locked.product_id) !== input.productId) {
          throw new InventoryAdjustmentError("variant_product_mismatch", 404);
        }
        if (locked.inventory_mode === "rms") {
          throw new InventoryAdjustmentError("rms_inventory_read_only", 409);
        }
        if (locked.inventory_mode !== "manual") {
          throw new InventoryAdjustmentError("invalid_inventory_mode", 409);
        }

        await sql`
          UPDATE public.product_variants
          SET available_quantity = ${input.quantity}, updated_at = NOW()
          WHERE id = ${input.variantId} AND product_id = ${input.productId}
        `;
        const [audit] = await sql<Array<{ created_at: string | Date }>>`
          INSERT INTO public.manual_inventory_adjustments (
            product_id,
            variant_id,
            old_quantity,
            new_quantity,
            reason,
            actor_id,
            actor_email,
            correlation_id
          ) VALUES (
            ${input.productId},
            ${input.variantId},
            ${locked.available_quantity},
            ${input.quantity},
            ${input.reason},
            ${String(input.actor.id)},
            ${input.actor.email},
            ${input.correlationId}
          )
          RETURNING created_at
        `;

        return {
          productId: input.productId,
          variantId: input.variantId,
          oldQuantity: Number(locked.available_quantity),
          newQuantity: input.quantity,
          reason: input.reason,
          actorId: String(input.actor.id),
          actorEmail: input.actor.email,
          correlationId: input.correlationId,
          createdAt: audit?.created_at instanceof Date
            ? audit.created_at.toISOString()
            : audit?.created_at,
        };
      });
    },
  };
}
