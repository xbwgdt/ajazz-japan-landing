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
    try {
      const result = await startCheckout(checkoutLines, fetch, (url) => window.location.assign(url), attemptRef.current.idempotencyKey);
      if (!result.redirected) {
        if (result.resetAttempt) attemptRef.current = undefined;
        setError(result.error);
      }
    } catch {
      setError("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setIsCheckingOut(false);
    }
  }

  const legalNotice = <p className="store-cart-legal">ご購入前に <Link href="/terms">利用規約</Link> と <Link href="/legal">特定商取引法に基づく表記</Link> をご確認ください。決済画面で利用規約への同意をお願いしています。</p>;

  return <section className="store-cart-page store-cart-content">
    <div className="store-cart-heading">
      <div><p className="store-eyebrow">YOUR SELECTION</p><h1>カート</h1></div>
      <Link className="store-cart-continue" href="/#products">買い物を続ける</Link>
    </div>
    {!lines.length ? <div className="store-cart-empty">
      <p>カートに商品はありません。</p>
      <Link className="store-button store-button-primary" href="/#products">商品を見る</Link>
      {legalNotice}
    </div> : <div className="store-cart-layout">
      <section className="store-cart-lines" aria-label="カートの商品">
        {lines.map((line) => <article className="store-cart-line-item" key={line.variantId}>
          <div className="store-cart-line-identity">
            {line.imageUrl ? <img className="store-cart-line-image" src={line.imageUrl} alt="" /> : null}
            <div>
              <p className="store-cart-line-label">SELECTED PRODUCT</p>
              <h2>{line.name}</h2>
              {line.colorName ? <p className="store-cart-line-variant">カラー：{line.colorName}</p> : null}
              <p>単価 ¥{line.priceJpy.toLocaleString("ja-JP")}</p>
            </div>
          </div>
          <div className="store-cart-quantity" aria-label={`${line.name} の数量`}>
            <button type="button" onClick={() => setQuantity(line.variantId, line.quantity - 1)} aria-label={`${line.name} の数量を減らす`}>−</button>
            <span aria-live="polite">{line.quantity}</span>
            <button type="button" onClick={() => setQuantity(line.variantId, line.quantity + 1)} aria-label={`${line.name} の数量を増やす`}>+</button>
          </div>
          <strong className="store-cart-line-price">¥{(line.priceJpy * line.quantity).toLocaleString("ja-JP")}</strong>
          <button className="store-cart-remove" type="button" onClick={() => remove(line.variantId)} aria-label={`${line.name} を削除`}>削除</button>
        </article>)}
      </section>
      <aside className="store-cart-order-summary" aria-label="ご注文内容">
        <p className="store-eyebrow">ORDER SUMMARY</p>
        <h2>ご注文内容</h2>
        <dl>
          <div><dt>商品小計</dt><dd>¥{total.toLocaleString("ja-JP")}</dd></div>
          <div><dt>送料</dt><dd>送料無料</dd></div>
        </dl>
        <p className="store-cart-order-total"><span>合計</span><strong>¥{total.toLocaleString("ja-JP")}</strong></p>
        {error ? <p className="store-cart-error" role="alert">{error}</p> : null}
        {legalNotice}
        <button className="store-button store-button-primary store-cart-checkout" type="button" onClick={checkout} disabled={isCheckingOut}>{isCheckingOut ? "決済画面へ移動中" : "安全な決済へ進む"}</button>
      </aside>
    </div>}
  </section>;
}
