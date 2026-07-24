import type { CartLine } from "./types";

export interface StockReservation {
  id: string;
}

export interface ReservationStore {
  getByIdempotencyKey(idempotencyKey: string): Promise<StockReservation | undefined>;
  create(input: { lines: CartLine[]; idempotencyKey: string }): Promise<StockReservation>;
}

export async function reserveVariants(
  lines: CartLine[],
  idempotencyKey: string,
  store: ReservationStore,
) {
  const existing = await store.getByIdempotencyKey(idempotencyKey);
  return existing ?? store.create({ lines, idempotencyKey });
}
