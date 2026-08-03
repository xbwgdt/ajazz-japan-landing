import type { StockReservation } from "./reservations";

export interface ValidatedCart {
  lines: Array<{
    variantId: string;
    name: string;
    quantity: number;
    unitPriceJpy: number;
  }>;
  shippingJpy: number;
  totalJpy: number;
}

export interface CheckoutSessionGateway {
  createSession(input: {
    currency: "jpy";
    allowedCountries: ["JP"];
    shippingAmountJpy: 0;
    metadata: { reservationId: string; cartFingerprint: string; expectedTotalJpy: string };
    expiresAtUnix: number;
    idempotencyKey: string;
    lineItems: Array<{
      name: string;
      unitAmountJpy: number;
      quantity: number;
    }>;
  }): Promise<{ id: string; url: string }>;
}

export async function createCheckoutSession(
  cart: ValidatedCart,
  gateway: CheckoutSessionGateway,
  reservation: StockReservation,
) {
  const session = await gateway.createSession({
    currency: "jpy",
    allowedCountries: ["JP"],
    shippingAmountJpy: 0,
    metadata: {
      reservationId: reservation.id,
      cartFingerprint: reservation.cartFingerprint,
      expectedTotalJpy: String(reservation.expectedTotalJpy),
    },
    expiresAtUnix: Math.floor(reservation.expiresAt.getTime() / 1000),
    idempotencyKey: reservation.id,
    lineItems: cart.lines.map((line) => ({
      name: line.name,
      unitAmountJpy: line.unitPriceJpy,
      quantity: line.quantity,
    })),
  });

  return { checkoutUrl: session.url, checkoutSessionId: session.id };
}
