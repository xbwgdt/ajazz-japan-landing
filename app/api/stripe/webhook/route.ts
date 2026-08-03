import { processCheckoutCompleted } from "../../../../lib/commerce/orders";
import { databasePaidOrderStore } from "../../../../lib/commerce/orders-db";
import { databaseRefundEventStore } from "../../../../lib/commerce/admin-orders";
import { processRefundUpdated } from "../../../../lib/commerce/refunds";
import { configuredStripeWebhookVerifier } from "../../../../lib/commerce/stripe";
import { createStripeWebhookHandler } from "../../../../lib/commerce/stripe-webhook";
import { databaseCheckoutExpirationStore, processCheckoutExpired } from "../../../../lib/commerce/reservation-cleanup";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const store = databasePaidOrderStore();
  const refundStore = databaseRefundEventStore();
  const expirationStore = databaseCheckoutExpirationStore();
  const handler = createStripeWebhookHandler({
    verify: configuredStripeWebhookVerifier().verify,
    process: (event) => processCheckoutCompleted(event, store),
    processRefund: (event) => processRefundUpdated(event, refundStore),
    processExpiration: (event) => processCheckoutExpired(event, expirationStore),
  });
  return handler(request);
}
