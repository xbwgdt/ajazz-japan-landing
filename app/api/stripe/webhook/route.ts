import { processCheckoutCompleted } from "../../../../lib/commerce/orders";
import { databasePaidOrderStore } from "../../../../lib/commerce/orders-db";
import { configuredStripeWebhookVerifier } from "../../../../lib/commerce/stripe";
import { createStripeWebhookHandler } from "../../../../lib/commerce/stripe-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const store = databasePaidOrderStore();
  const handler = createStripeWebhookHandler({
    verify: configuredStripeWebhookVerifier().verify,
    process: (event) => processCheckoutCompleted(event, store),
  });
  return handler(request);
}
