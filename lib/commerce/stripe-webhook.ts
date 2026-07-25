import type { CheckoutCompletedEvent } from "./orders";

export interface VerifiedStripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: { reservationId?: string | null } | null;
      customerEmail?: string | null;
      shippingAddress?: Record<string, unknown> | null;
      paymentIntentId?: string | null;
    };
  };
}

export interface StripeWebhookDependencies {
  verify(rawBody: string, signature: string): Promise<VerifiedStripeEvent>;
  process(event: CheckoutCompletedEvent): Promise<unknown>;
}

export function createStripeWebhookHandler(dependencies: StripeWebhookDependencies) {
  return async (request: Request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    try {
      const event = await dependencies.verify(await request.text(), signature);
      if (event.type !== "checkout.session.completed") {
        return Response.json({ received: true });
      }

      const reservationId = event.data.object.metadata?.reservationId;
      if (!reservationId) {
        return Response.json({ error: "Missing reservation metadata" }, { status: 400 });
      }

      await dependencies.process({
        id: event.id,
        checkoutSessionId: event.data.object.id,
        reservationId,
        signatureValid: true,
        customerEmail: event.data.object.customerEmail,
        shippingAddress: event.data.object.shippingAddress,
        stripePaymentIntentId: event.data.object.paymentIntentId,
      });
      return Response.json({ received: true });
    } catch {
      return Response.json({ error: "Invalid Stripe webhook" }, { status: 400 });
    }
  };
}
