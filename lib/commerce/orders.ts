import { canTransitionOrder, type OrderStatus } from "./types";

export class WebhookSignatureError extends Error {}

export interface CheckoutCompletedEvent {
  id: string;
  checkoutSessionId: string;
  reservationId: string;
  signatureValid: boolean;
}

export interface PaidOrderStore {
  hasProcessedEvent(eventId: string): Promise<boolean>;
  getReservation(reservationId: string): Promise<{ id: string; active: boolean } | undefined>;
  createPaidOrder(input: {
    checkoutSessionId: string;
    reservationId: string;
  }): Promise<{ id: string }>;
  markEventProcessed(eventId: string): Promise<void>;
}

export async function processCheckoutCompleted(
  event: CheckoutCompletedEvent,
  store: PaidOrderStore,
) {
  if (!event.signatureValid) {
    throw new WebhookSignatureError("Stripe webhook signature is invalid");
  }

  if (await store.hasProcessedEvent(event.id)) {
    return undefined;
  }

  const reservation = await store.getReservation(event.reservationId);
  if (!reservation?.active) {
    throw new Error("Reservation is no longer active");
  }

  const order = await store.createPaidOrder({
    checkoutSessionId: event.checkoutSessionId,
    reservationId: reservation.id,
  });
  await store.markEventProcessed(event.id);
  return order;
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
