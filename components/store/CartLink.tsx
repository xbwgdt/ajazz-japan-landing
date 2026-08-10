"use client";

import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { quantity } = useCart();
  return (
    <Link href="/cart" className="store-icon-button store-cart" aria-label={`カート、${quantity}点`}>
      <ShoppingBag aria-hidden="true" size={20} strokeWidth={1.8} />
      <span aria-hidden="true">{quantity}</span>
    </Link>
  );
}
