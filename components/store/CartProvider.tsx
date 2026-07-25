"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { addCartLine, cartTotalQuantity, removeCartLine, setCartLineQuantity, type BrowserCartLine } from "../../lib/commerce/browser-cart";

const storageKey = "ajazz-japan-cart";

interface CartContextValue {
  lines: BrowserCartLine[];
  quantity: number;
  add(line: BrowserCartLine): void;
  remove(variantId: string): void;
  setQuantity(variantId: string, quantity: number): void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<BrowserCartLine[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setLines(parsed);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines]);

  const value = useMemo(() => ({
    lines,
    quantity: cartTotalQuantity(lines),
    add: (line: BrowserCartLine) => setLines((current) => addCartLine(current, line)),
    remove: (variantId: string) => setLines((current) => removeCartLine(current, variantId)),
    setQuantity: (variantId: string, quantity: number) => setLines((current) => setCartLineQuantity(current, variantId, quantity)),
  }), [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
