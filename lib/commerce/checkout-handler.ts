import { validateCart, type CartVariantSource } from "./cart";
import { createCheckoutSession, type CheckoutSessionGateway } from "./checkout";
import { reserveVariants, type ReservationStore } from "./reservations";
import type { CartLine } from "./types";

export interface CheckoutHandlerDependencies {
  variants: CartVariantSource;
  reservations: ReservationStore;
  gateway: CheckoutSessionGateway;
}

export function createCheckoutHandler(dependencies: CheckoutHandlerDependencies) {
  return async (request: Request) => {
    try {
      const input = await request.json();
      const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey : "";
      const lines = parseLines(input.lines);

      if (!idempotencyKey || !lines) {
        return Response.json({ error: "Invalid checkout request" }, { status: 400 });
      }

      const cart = await validateCart(lines, dependencies.variants);
      const reservation = await reserveVariants(lines, idempotencyKey, dependencies.reservations);
      const { checkoutUrl } = await createCheckoutSession(cart, dependencies.gateway);

      return Response.json({ checkoutUrl, reservationId: reservation.id });
    } catch {
      return Response.json({ error: "Unable to start checkout" }, { status: 400 });
    }
  };
}

function parseLines(value: unknown): CartLine[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const lines = value.filter(
    (line): line is CartLine =>
      Boolean(
        line &&
          typeof line === "object" &&
          "variantId" in line &&
          "quantity" in line &&
          typeof line.variantId === "string" &&
          typeof line.quantity === "number" &&
          Number.isInteger(line.quantity),
      ),
  );

  return lines.length === value.length ? lines : undefined;
}
