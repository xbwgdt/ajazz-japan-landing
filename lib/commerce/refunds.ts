import { canTransitionOrder, type OrderStatus } from "./types";

export class RefundTransitionError extends Error {}

export interface RefundOrderStore {
  find(orderId: string): Promise<{
    status: OrderStatus;
    paymentIntentId: string | null;
    amountJpy: number;
    refundAttemptKey: string;
  } | undefined>;
  record(input: {
    orderId: string;
    stripeRefundId: string;
    amountJpy: number;
    status: string;
    previousStatus: OrderStatus;
    restock: boolean;
  }): Promise<void>;
}

export interface StripeRefundGateway {
  createRefund(input: {
    orderId: string;
    paymentIntentId: string;
    amountJpy: number;
    attemptKey: string;
  }): Promise<{ id: string; status: string }>;
}

export async function requestOrderRefund(orderId: string, store: RefundOrderStore, gateway: StripeRefundGateway) {
  const order = await store.find(orderId);
  if (!order || !order.paymentIntentId || !canTransitionOrder(order.status, "refund_pending")) {
    throw new RefundTransitionError("This order cannot be refunded.");
  }

  const refund = await gateway.createRefund({
    orderId,
    paymentIntentId: order.paymentIntentId,
    amountJpy: order.amountJpy,
    attemptKey: order.refundAttemptKey,
  });
  await store.record({
    orderId,
    stripeRefundId: refund.id,
    amountJpy: order.amountJpy,
    status: refund.status,
    previousStatus: order.status,
    restock: order.status !== "shipped" && refund.status === "succeeded",
  });
  return refund;
}

export interface RefundUpdatedEvent {
  eventId: string;
  orderId: string;
  stripeRefundId: string;
  amountJpy: number;
  status: string;
  paymentIntentId: string;
}

export interface RefundEventStore {
  reconcile(event: RefundUpdatedEvent): Promise<void>;
}

export async function processRefundUpdated(event: RefundUpdatedEvent, store: RefundEventStore) {
  await store.reconcile(event);
}

export function orderStatusAfterRefund(refundStatus: string, previousStatus: OrderStatus): OrderStatus {
  if (refundStatus === "succeeded") return "refunded";
  if (refundStatus === "failed" || refundStatus === "canceled") return previousStatus;
  return "refund_pending";
}
