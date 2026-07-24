import { createCheckoutHandler } from "../../../../lib/commerce/checkout-handler";
import { databaseReservationStore, databaseVariantSource } from "../../../../lib/commerce/checkout-db";
import { configuredStripeCheckoutGateway } from "../../../../lib/commerce/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const handler = createCheckoutHandler({
    variants: databaseVariantSource(),
    reservations: databaseReservationStore(),
    gateway: configuredStripeCheckoutGateway(),
  });
  return handler(request);
}
