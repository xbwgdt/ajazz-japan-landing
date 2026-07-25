import Link from "next/link";
import { CommerceDatabaseNotConfiguredError } from "../../../lib/commerce/db";
import { findOrderConfirmation } from "../../../lib/commerce/order-confirmation";

export const dynamic = "force-dynamic";
export const metadata = { title: "ご注文を受け付けました | AJAZZ JAPAN", robots: { index: false, follow: false } };

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id: sessionId } = await searchParams;
  const order = sessionId ? await findOrderConfirmation(sessionId).catch((error) => {
    if (error instanceof CommerceDatabaseNotConfiguredError) return undefined;
    throw error;
  }) : undefined;

  return <main className="storefront store-order-success">
    <header className="store-nav"><Link href="/" className="store-brand" aria-label="AJAZZ JAPAN home"><img src="/brand/ajazz-japan-logo.jpg" alt="AJAZZ JAPAN" /></Link></header>
    <section className="store-success-content">
      <p className="store-eyebrow">ORDER STATUS</p>
      {order ? <>
        <h1>ご注文を<br />受け付けました。</h1>
        <p>ご注文番号: <strong>{order.id}</strong></p><p>お支払い金額: <strong>¥{order.totalJpy.toLocaleString("ja-JP")}</strong></p>
        {order.customerEmail ? <p>ご注文に関する連絡先: <strong>{order.customerEmail}</strong></p> : null}
        <p className="store-success-note">通常3営業日以内に発送します。発送後、追跡番号をご案内します。</p>
      </> : <>
        <h1>ご注文を<br />確認しています。</h1>
        <p>決済情報を確認中です。このページを数分後に更新してください。</p>
      </>}
      <Link className="store-button store-button-primary" href="/">ストアへ戻る</Link>
    </section>
  </main>;
}
