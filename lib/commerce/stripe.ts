import Stripe from "stripe";
import type { CheckoutSessionGateway } from "./checkout";

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

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://ajazz.jp";
}
