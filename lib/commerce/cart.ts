import type { CartLine } from "./types";

export class CartValidationError extends Error {}

export interface CheckoutVariant {
  id: string;
  name: string;
  priceJpy: number;
  availableQuantity: number;
}

export interface CartVariantSource {
  getVariants(variantIds: string[]): Promise<CheckoutVariant[]>;
}

export async function validateCart(lines: CartLine[], source: CartVariantSource) {
  if (!lines.length) {
    throw new CartValidationError("Your cart is empty");
  }

  const variants = await source.getVariants(lines.map((line) => line.variantId));
  const byId = new Map(variants.map((variant) => [variant.id, variant]));
  const validatedLines = lines.map((line) => {
    const variant = byId.get(line.variantId);
    if (!variant || line.quantity < 1 || line.quantity > variant.availableQuantity) {
      throw new CartValidationError("One or more items are unavailable");
    }

    return {
      variantId: variant.id,
      name: variant.name,
      quantity: line.quantity,
      unitPriceJpy: variant.priceJpy,
    };
  });

  return {
    lines: validatedLines,
    shippingJpy: 0,
    totalJpy: validatedLines.reduce(
      (total, line) => total + line.unitPriceJpy * line.quantity,
      0,
    ),
  };
}
