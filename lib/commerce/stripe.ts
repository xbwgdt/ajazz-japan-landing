import Stripe from "stripe";
import type { CheckoutSessionGateway } from "./checkout";
import type { VerifiedStripeEvent } from "./stripe-webhook";

interface StripeCheckoutClient {
  checkout: {
    sessions: {
      create(input: Record<string, unknown>): Promise<{ url: string | null }>;
    };
  };
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
        success_url: `${siteUrl()}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl()}/cart`,
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL");
      }

      return { url: session.url };
    },
  };
}

export function configuredStripeCheckoutGateway() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  return createStripeCheckoutGateway(new Stripe(secretKey) as unknown as StripeCheckoutClient);
}

export function configuredStripeWebhookVerifier() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    throw new Error("Stripe webhook configuration is missing");
  }

  const stripe = new Stripe(secretKey);
  return {
    async verify(rawBody: string, signature: string): Promise<VerifiedStripeEvent> {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
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
            metadata: { reservationId: session.metadata?.reservationId },
            customerEmail: session.customer_details?.email ?? session.customer_email,
            paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
            shippingAddress: shippingDetails.collected_information?.shipping_details
              ?? shippingDetails.shipping_details
              ?? null,
          },
        },
      };
    },
  };
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://ajazz.jp";
}
