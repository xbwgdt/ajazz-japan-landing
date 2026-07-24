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
    metadata: { reservationId: string };
    lineItems: Array<{
      name: string;
      unitAmountJpy: number;
      quantity: number;
    }>;
  }): Promise<{ url: string }>;
}

export async function createCheckoutSession(
  cart: ValidatedCart,
  gateway: CheckoutSessionGateway,
  reservationId: string,
) {
  const session = await gateway.createSession({
    currency: "jpy",
    allowedCountries: ["JP"],
    shippingAmountJpy: 0,
    metadata: { reservationId },
    lineItems: cart.lines.map((line) => ({
      name: line.name,
      unitAmountJpy: line.unitPriceJpy,
      quantity: line.quantity,
    })),
  });

  return { checkoutUrl: session.url };
}
