"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartProvider";

export function CartPage() {
  const { lines, remove } = useCart();
  const [error, setError] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const total = lines.reduce((sum, line) => sum + line.priceJpy * line.quantity, 0);

  async function checkout() {
    setError("");
    setIsCheckingOut(true);
    const response = await fetch("/api/commerce/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        lines: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok && payload.url) window.location.assign(payload.url);
    else {
      setIsCheckingOut(false);
      setError(payload.error ?? "決済画面を開始できませんでした。時間をおいて再度お試しください。");
    }
  }

  return <main className="storefront store-cart-page">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link><Link href="/">買い物を続ける</Link></header>
    <section className="store-cart-content">
      <p className="store-eyebrow">YOUR SELECTION</p><h1>カート</h1>
      {!lines.length ? <div className="store-cart-empty"><p>カートに商品はありません。</p><Link className="store-button store-button-primary" href="/#products">商品を見る</Link></div> : <>
        <div className="store-cart-lines">{lines.map((line) => <article key={line.variantId}>
          <div><h2>{line.name}</h2><p>数量 {line.quantity}</p></div><strong>¥{(line.priceJpy * line.quantity).toLocaleString("ja-JP")}</strong>
          <button type="button" onClick={() => remove(line.variantId)} aria-label={`${line.name} を削除`}>削除</button>
        </article>)}</div>
        <div className="store-cart-summary"><p>送料 <span>無料</span></p><strong>合計 <span>¥{total.toLocaleString("ja-JP")}</span></strong>
          {error ? <p className="store-cart-error">{error}</p> : null}
          <button className="store-button store-button-primary" type="button" onClick={checkout} disabled={isCheckingOut}>{isCheckingOut ? "決済画面へ移動中" : "安全な決済へ進む"}</button>
        </div>
      </>}
    </section>
  </main>;
}
