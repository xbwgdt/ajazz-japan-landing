import type { OrderStatus } from "./types";

export class ReturnRestockError extends Error {}

export interface ReturnRestockStore {
  findStatus(orderId: string): Promise<OrderStatus | undefined>;
  restock(orderId: string): Promise<boolean>;
}

export async function restockReturnedOrder(orderId: string, store: ReturnRestockStore) {
  if (await store.findStatus(orderId) !== "refunded") {
    throw new ReturnRestockError("Only refunded orders can be restocked after return inspection.");
  }
  return { restocked: await store.restock(orderId) };
}
