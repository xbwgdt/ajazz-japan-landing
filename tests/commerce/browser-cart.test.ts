import { describe, expect, it } from "vitest";
import { addCartLine, cartTotalQuantity, removeCartLine, setCartLineQuantity } from "../../lib/commerce/browser-cart";

describe("browser cart", () => {
  it("merges matching variants and keeps the requested quantity", () => {
    const cart = addCartLine([], { variantId: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, quantity: 1 });
    const updated = addCartLine(cart, { variantId: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, quantity: 2 });

    expect(updated).toEqual([{ variantId: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, quantity: 3 }]);
    expect(cartTotalQuantity(updated)).toBe(3);
  });

  it("removes a line by its server-side variant id", () => {
    const cart = removeCartLine([
      { variantId: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, quantity: 1 },
      { variantId: "43", name: "AJ179 APEX", priceJpy: 8980, quantity: 1 },
    ], "42");

    expect(cart).toEqual([{ variantId: "43", name: "AJ179 APEX", priceJpy: 8980, quantity: 1 }]);
  });

  it("updates a line quantity and removes it at zero", () => {
    const lines = [{ variantId: "42", name: "AK820 MAX ULTRA", priceJpy: 19980, quantity: 1 }];
    expect(setCartLineQuantity(lines, "42", 3)).toEqual([{ ...lines[0], quantity: 3 }]);
    expect(setCartLineQuantity(lines, "42", 0)).toEqual([]);
  });
});
