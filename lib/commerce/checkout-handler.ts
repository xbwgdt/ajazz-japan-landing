import { validateCart, type CartVariantSource } from "./cart";
import { createCheckoutSession, type CheckoutSessionGateway } from "./checkout";
import {
  ReservationExpiredError,
  ReservationMismatchError,
  reserveVariants,
  type ReservationStore,
} from "./reservations";
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
      const parsedLines = parseLines(input.lines);

      if (!idempotencyKey || !parsedLines) {
        return Response.json({ error: "Invalid checkout request" }, { status: 400 });
      }

      const lines = canonicalizeLines(parsedLines);
      const cart = await validateCart(lines, dependencies.variants);
      const reservation = await reserveVariants(lines, idempotencyKey, cart.totalJpy, dependencies.reservations);
      const { checkoutUrl, checkoutSessionId } = await createCheckoutSession(
        cart,
        dependencies.gateway,
        reservation,
      );
      await dependencies.reservations.bindCheckoutSession(reservation.id, checkoutSessionId);

      return Response.json({ checkoutUrl, reservationId: reservation.id });
    } catch (error) {
      if (error instanceof ReservationExpiredError || error instanceof ReservationMismatchError) {
        return Response.json({ error: error.message }, { status: 409 });
      }
      return Response.json({ error: "Unable to start checkout" }, { status: 400 });
    }
  };
}

function canonicalizeLines(lines: CartLine[]) {
  const quantities = new Map<string, number>();
  for (const line of lines) {
    quantities.set(line.variantId, (quantities.get(line.variantId) ?? 0) + line.quantity);
  }
  return [...quantities]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([variantId, quantity]) => ({ variantId, quantity }));
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
