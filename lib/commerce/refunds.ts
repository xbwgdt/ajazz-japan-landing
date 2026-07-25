import { canTransitionOrder, type OrderStatus } from "./types";

export class RefundTransitionError extends Error {}

export interface RefundOrderStore {
  find(orderId: string): Promise<{ status: OrderStatus; paymentIntentId: string | null; amountJpy: number } | undefined>;
  record(input: { orderId: string; stripeRefundId: string; amountJpy: number; status: string }): Promise<void>;
}

export interface StripeRefundGateway {
  createRefund(input: { paymentIntentId: string; amountJpy: number }): Promise<{ id: string; status: string }>;
}

export async function requestOrderRefund(orderId: string, store: RefundOrderStore, gateway: StripeRefundGateway) {
  const order = await store.find(orderId);
  if (!order || !order.paymentIntentId || !canTransitionOrder(order.status, "refund_pending")) {
    throw new RefundTransitionError("This order cannot be refunded.");
  }

  const refund = await gateway.createRefund({ paymentIntentId: order.paymentIntentId, amountJpy: order.amountJpy });
  await store.record({ orderId, stripeRefundId: refund.id, amountJpy: order.amountJpy, status: refund.status });
  return refund;
}
