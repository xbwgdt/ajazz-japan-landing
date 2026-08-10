"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCart } from "./CartProvider";
import type { CartLine } from "../../lib/commerce/types";

interface CheckoutApiResponse {
  checkoutUrl?: string;
  error?: string;
}

interface CheckoutAttempt {
  cartKey: string;
  idempotencyKey: string;
}

export function checkoutAttempt(
  lines: CartLine[],
  previous?: CheckoutAttempt,
  randomUUID: () => string = () => crypto.randomUUID(),
): CheckoutAttempt {
  const cartKey = JSON.stringify([...lines]
    .sort((left, right) => left.variantId.localeCompare(right.variantId))
    .map(({ variantId, quantity }) => ({ variantId, quantity })));
  return previous?.cartKey === cartKey ? previous : { cartKey, idempotencyKey: randomUUID() };
}

export async function startCheckout(
  lines: CartLine[],
  fetcher: typeof fetch = fetch,
  navigate: (url: string) => void = (url) => window.location.assign(url),
  idempotencyKey = crypto.randomUUID(),
) {
  const response = await fetcher("/api/commerce/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idempotencyKey, lines }),
  });
  const payload = await response.json().catch(() => ({})) as CheckoutApiResponse;
  if (response.ok && payload.checkoutUrl) {
    navigate(payload.checkoutUrl);
    return { redirected: true } as const;
  }
  return {
    redirected: false,
    resetAttempt: response.status === 409,
    error: payload.error ?? "決済画面を開始できませんでした。時間をおいて再度お試しください。",
  } as const;
}

export function CartPage() {
  const { lines, remove, setQuantity } = useCart();
  const [error, setError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const attemptRef = useRef<CheckoutAttempt | undefined>(undefined);
  const total = lines.reduce((sum, line) => sum + line.priceJpy * line.quantity, 0);

  async function checkout() {
    setError("");
    setIsCheckingOut(true);
    const checkoutLines = lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }));
    attemptRef.current = checkoutAttempt(checkoutLines, attemptRef.current);
    const result = await startCheckout(checkoutLines, fetch, (url) => window.location.assign(url), attemptRef.current.idempotencyKey);
    if (!result.redirected) {
      if (result.resetAttempt) attemptRef.current = undefined;
      setIsCheckingOut(false);
      setError(result.error);
    }
  }

  return <main className="storefront store-cart-page">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo-dark.png" alt="AJAZZ JAPAN" /></Link><Link href="/">買い物を続ける</Link></header>
    <section className="store-cart-content"><p className="store-eyebrow">YOUR SELECTION</p><h1>カート</h1>
      {!lines.length ? <div className="store-cart-empty"><p>カートに商品はありません。</p><Link className="store-button store-button-primary" href="/#products">商品を見る</Link></div> : <>
        <div className="store-cart-lines">{lines.map((line) => <article key={line.variantId}>
          <div><h2>{line.name}</h2><div className="store-cart-quantity"><button type="button" onClick={() => setQuantity(line.variantId, line.quantity - 1)} aria-label={`${line.name} の数量を減らす`}>−</button><span>{line.quantity}</span><button type="button" onClick={() => setQuantity(line.variantId, line.quantity + 1)} aria-label={`${line.name} の数量を増やす`}>+</button></div></div>
          <strong>¥{(line.priceJpy * line.quantity).toLocaleString("ja-JP")}</strong><button type="button" onClick={() => remove(line.variantId)} aria-label={`${line.name} を削除`}>削除</button>
        </article>)}</div>
        <div className="store-cart-summary"><p>送料 <span>無料</span></p><strong>合計 <span>¥{total.toLocaleString("ja-JP")}</span></strong>{error ? <p className="store-cart-error">{error}</p> : null}<button className="store-button store-button-primary" type="button" onClick={checkout} disabled={isCheckingOut}>{isCheckingOut ? "決済画面へ移動中" : "安全な決済へ進む"}</button></div>
      </>}
      <p className="store-cart-legal">ご購入前に <Link href="/terms">利用規約</Link> と <Link href="/legal">特定商取引法に基づく表記</Link> をご確認ください。決済画面で利用規約への同意をお願いしています。</p>
    </section>
  </main>;
}
