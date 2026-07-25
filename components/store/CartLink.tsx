"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function CartLink() {
  const { quantity } = useCart();
  return <Link href="/cart" className="store-cart" aria-label={`Cart, ${quantity} items`}><span>{quantity}</span></Link>;
}
