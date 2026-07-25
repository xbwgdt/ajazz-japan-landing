import { canTransitionOrder, type OrderStatus } from "./types";

export class WebhookSignatureError extends Error {}

export interface CheckoutCompletedEvent {
  id: string;
  checkoutSessionId: string;
  reservationId: string;
  signatureValid: boolean;
}

export interface PaidOrderStore {
  createPaidOrder(input: {
    eventId: string;
    checkoutSessionId: string;
    reservationId: string;
  }): Promise<{ id: string } | undefined>;
}

export async function processCheckoutCompleted(
  event: CheckoutCompletedEvent,
  store: PaidOrderStore,
) {
  if (!event.signatureValid) {
    throw new WebhookSignatureError("Stripe webhook signature is invalid");
  }

  return store.createPaidOrder({
    eventId: event.id,
    checkoutSessionId: event.checkoutSessionId,
    reservationId: event.reservationId,
  });
}
export class OrderTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderTransitionError";
  }
}

export interface OrderStatusUpdate {
  orderId: string;
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  trackingNumber: string;
}

export interface OrderStatusStore {
  save(input: Pick<OrderStatusUpdate, "orderId" | "nextStatus" | "trackingNumber">): Promise<void>;
}

export async function updateOrderStatus(input: OrderStatusUpdate, store: OrderStatusStore) {
  if (!canTransitionOrder(input.currentStatus, input.nextStatus)) {
    throw new OrderTransitionError("This order status transition is not allowed.");
  }

  if (input.nextStatus === "shipped" && !input.trackingNumber.trim()) {
    throw new OrderTransitionError("A tracking number is required before shipping an order.");
  }

  await store.save({
    orderId: input.orderId,
    nextStatus: input.nextStatus,
    trackingNumber: input.trackingNumber.trim(),
  });
}
