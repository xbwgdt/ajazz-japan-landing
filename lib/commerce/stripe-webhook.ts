import type { CheckoutCompletedEvent } from "./orders";

export interface VerifiedStripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      metadata?: { reservationId?: string | null; cartFingerprint?: string | null; expectedTotalJpy?: string | null; orderId?: string | null } | null;
      customerEmail?: string | null;
      shippingAddress?: Record<string, unknown> | null;
      paymentIntentId?: string | null;
      termsAccepted?: boolean;
      amountTotalJpy?: number | null;
      paymentStatus?: string | null;
      refundStatus?: string | null;
    };
  };
}

export interface StripeWebhookDependencies {
  verify(rawBody: string, signature: string): Promise<VerifiedStripeEvent>;
  process(event: CheckoutCompletedEvent): Promise<unknown>;
  processRefund?(event: {
    eventId: string;
    orderId: string;
    stripeRefundId: string;
    amountJpy: number;
    status: string;
    paymentIntentId: string;
  }): Promise<unknown>;
  processExpiration?(event: { eventId: string; checkoutSessionId: string }): Promise<unknown>;
}

export function createStripeWebhookHandler(dependencies: StripeWebhookDependencies) {
  return async (request: Request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return Response.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    try {
      const event = await dependencies.verify(await request.text(), signature);
      if (event.type === "checkout.session.expired") {
        if (!dependencies.processExpiration) {
          return Response.json({ error: "Checkout expiration handler is not configured" }, { status: 500 });
        }
        await dependencies.processExpiration({ eventId: event.id, checkoutSessionId: event.data.object.id });
        return Response.json({ received: true });
      }
      if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed") {
        const orderId = event.data.object.metadata?.orderId;
        const amountJpy = event.data.object.amountTotalJpy;
        const status = event.data.object.refundStatus;
        const paymentIntentId = event.data.object.paymentIntentId;
        if (!dependencies.processRefund || !orderId || typeof amountJpy !== "number" || !status || !paymentIntentId) {
          return Response.json({ error: "Invalid refund metadata" }, { status: 400 });
        }
        await dependencies.processRefund({
          eventId: event.id,
          orderId,
          stripeRefundId: event.data.object.id,
          amountJpy,
          status,
          paymentIntentId,
        });
        return Response.json({ received: true });
      }
      if (event.type !== "checkout.session.completed") {
        return Response.json({ received: true });
      }

      const reservationId = event.data.object.metadata?.reservationId;
      if (!reservationId) {
        return Response.json({ error: "Missing reservation metadata" }, { status: 400 });
      }
      const cartFingerprint = event.data.object.metadata?.cartFingerprint;
      const expectedTotalJpy = Number(event.data.object.metadata?.expectedTotalJpy);
      const amountTotalJpy = event.data.object.amountTotalJpy;
      const paymentStatus = event.data.object.paymentStatus;
      if (!cartFingerprint || !Number.isInteger(expectedTotalJpy) || typeof amountTotalJpy !== "number" || !paymentStatus) {
        return Response.json({ error: "Invalid checkout metadata" }, { status: 400 });
      }

      await dependencies.process({
        id: event.id,
        checkoutSessionId: event.data.object.id,
        reservationId,
        signatureValid: true,
        customerEmail: event.data.object.customerEmail,
        shippingAddress: event.data.object.shippingAddress,
        stripePaymentIntentId: event.data.object.paymentIntentId,
        termsAccepted: event.data.object.termsAccepted,
        cartFingerprint,
        expectedTotalJpy,
        amountTotalJpy,
        paymentStatus,
      });
      return Response.json({ received: true });
    } catch {
      return Response.json({ error: "Invalid Stripe webhook" }, { status: 400 });
    }
  };
}
