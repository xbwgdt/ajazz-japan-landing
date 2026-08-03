import { createHash } from "node:crypto";
import type { CartLine } from "./types";

export const CHECKOUT_EXPIRATION_SECONDS = 60 * 60;

export class ReservationMismatchError extends Error {}
export class ReservationExpiredError extends Error {}

export interface StockReservation {
  id: string;
  cartFingerprint: string;
  expectedTotalJpy: number;
  expiresAt: Date;
  status?: string;
  checkoutSessionId?: string;
}

export interface ReservationStore {
  getByIdempotencyKey(idempotencyKey: string): Promise<StockReservation | undefined>;
  create(input: {
    lines: CartLine[];
    idempotencyKey: string;
    cartFingerprint: string;
    expectedTotalJpy: number;
    expiresAt: Date;
  }): Promise<StockReservation>;
  bindCheckoutSession(reservationId: string, checkoutSessionId: string): Promise<void>;
}

export async function reserveVariants(
  lines: CartLine[],
  idempotencyKey: string,
  expectedTotalJpy: number,
  store: ReservationStore,
  now = new Date(),
) {
  const fingerprint = cartFingerprint(lines);
  const existing = await store.getByIdempotencyKey(idempotencyKey);
  if (existing) {
    if (existing.cartFingerprint !== fingerprint || existing.expectedTotalJpy !== expectedTotalJpy) {
      throw new ReservationMismatchError("The idempotency key is already bound to a different cart");
    }
    if (existing.status && existing.status !== "active" || existing.expiresAt.getTime() <= now.getTime()) {
      throw new ReservationExpiredError("The checkout reservation has expired");
    }
    return existing;
  }

  return store.create({
    lines,
    idempotencyKey,
    cartFingerprint: fingerprint,
    expectedTotalJpy,
    expiresAt: new Date(now.getTime() + CHECKOUT_EXPIRATION_SECONDS * 1000),
  });
}

export function cartFingerprint(lines: CartLine[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
  }
  const canonical = [...quantities]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
