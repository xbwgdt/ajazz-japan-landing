import { updateOrderStatus, type OrderStatusStore } from "./orders";
import type { OrderStatus } from "./types";

export interface AdminOrderUpdateInput {
  orderId: string;
  nextStatus: OrderStatus;
  trackingNumber: string;
}

export interface AdminOrderUpdateDependencies extends OrderStatusStore {
  findStatus(orderId: string): Promise<OrderStatus | undefined>;
}

export async function updateAdminOrder(
  input: AdminOrderUpdateInput,
  dependencies: AdminOrderUpdateDependencies,
) {
  const currentStatus = await dependencies.findStatus(input.orderId);
  if (!currentStatus) {
    throw new Error("Order not found");
  }

  await updateOrderStatus({ ...input, currentStatus }, dependencies);
  return { orderId: input.orderId, status: input.nextStatus };
}
