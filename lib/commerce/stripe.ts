import Stripe from "stripe";
import { assertStripeEnvironmentSafety } from "../deployment/staging-safety";
import type { CheckoutSessionGateway } from "./checkout";
import type { VerifiedStripeEvent } from "./stripe-webhook";
import type { StripeRefundGateway } from "./refunds";

interface StripeCheckoutClient {
  checkout: {
    sessions: {
      create(input: Record<string, unknown>, options?: { idempotencyKey: string }): Promise<{ id: string; url: string | null }>;
    };
  };
}

interface StripeRefundClient {
  refunds: { create(
    input: { payment_intent: string; amount: number; metadata: { orderId: string } },
    options?: { idempotencyKey: string },
  ): Promise<{ id: string; status: string | null }> };
}

export function createStripeCheckoutGateway(
  client: StripeCheckoutClient,
): CheckoutSessionGateway {
  return {
    async createSession(input) {
      const session = await client.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        billing_address_collection: "required",
        consent_collection: { terms_of_service: "required" },
        shipping_address_collection: {
          allowed_countries: input.allowedCountries,
        },
        shipping_options: [
          {
            shipping_rate_data: {
              display_name: "全国送料無料",
              type: "fixed_amount",
              fixed_amount: {
                amount: input.shippingAmountJpy,
                currency: input.currency,
              },
            },
          },
        ],
        line_items: input.lineItems.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: input.currency,
            unit_amount: line.unitAmountJpy,
            product_data: { name: line.name },
          },
        })),
        metadata: input.metadata,
        expires_at: input.expiresAtUnix,
        success_url: `${siteUrl()}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl()}/cart`,
      }, { idempotencyKey: input.idempotencyKey });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      return { id: session.id, url: session.url };
    },
  };
}

export function configuredStripeCheckoutGateway() {
  assertStripeEnvironmentSafety(process.env);
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return createStripeCheckoutGateway(new Stripe(secretKey) as unknown as StripeCheckoutClient);
}

export function createStripeRefundGateway(client: StripeRefundClient): StripeRefundGateway {
  return {
    async createRefund(input) {
      const refund = await client.refunds.create({
        payment_intent: input.paymentIntentId,
        amount: input.amountJpy,
        metadata: { orderId: input.orderId },
      }, { idempotencyKey: `refund:${input.orderId}:${input.attemptKey}` });
      return { id: refund.id, status: refund.status ?? "pending" };
    },
  };
}

export function configuredStripeRefundGateway() {
  assertStripeEnvironmentSafety(process.env);
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  return createStripeRefundGateway(new Stripe(secretKey) as unknown as StripeRefundClient);
}

export function configuredStripeWebhookVerifier() {
  assertStripeEnvironmentSafety(process.env);
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw new Error("Stripe webhook configuration is missing");
  }

  const stripe = new Stripe(secretKey);
  return {
    async verify(rawBody: string, signature: string): Promise<VerifiedStripeEvent> {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
        const refund = event.data.object as Stripe.Refund;
        return {
          id: event.id,
          type: event.type,
          data: {
            object: {
              id: refund.id,
              metadata: { orderId: refund.metadata.orderId },
              amountTotalJpy: refund.amount,
              refundStatus: refund.status,
              paymentIntentId: typeof refund.payment_intent === "string"
                ? refund.payment_intent
                : refund.payment_intent?.id,
            },
          },
        };
      }

      const session = event.data.object as Stripe.Checkout.Session;
      const shippingDetails = session as unknown as {
        shipping_details?: Record<string, unknown> | null;
        collected_information?: { shipping_details?: Record<string, unknown> | null } | null;
      };
      return {
        id: event.id,
        type: event.type,
        data: {
          object: {
            id: session.id,
            metadata: {
              reservationId: session.metadata?.reservationId,
              cartFingerprint: session.metadata?.cartFingerprint,
              expectedTotalJpy: session.metadata?.expectedTotalJpy,
            },
            customerEmail: session.customer_details?.email ?? session.customer_email,
            paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
            termsAccepted: session.consent?.terms_of_service === "accepted",
            shippingAddress: shippingDetails.collected_information?.shipping_details
              ?? shippingDetails.shipping_details
              ?? null,
            amountTotalJpy: session.amount_total,
            paymentStatus: session.payment_status,
          },
        },
      };
    },
  };
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://ajazz.jp";
}
