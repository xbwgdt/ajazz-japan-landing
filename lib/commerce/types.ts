export type OrderStatus =
  | "paid"
  | "awaiting_fulfillment"
  | "shipped"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export interface ProductVariant {
  id: string;
  sku: string;
  productId: string;
  name: string;
  priceJpy: number;
  availableQuantity: number;
}

export interface CartLine {
  variantId: string;
  quantity: number;
}

export interface FulfillmentProvider {
  name: string;
  submit(orderId: string): Promise<void>;
}

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  paid: ["awaiting_fulfillment"],
  awaiting_fulfillment: ["shipped", "cancelled", "refund_pending"],
  shipped: [],
  cancelled: [],
  refund_pending: ["refunded"],
  refunded: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}
