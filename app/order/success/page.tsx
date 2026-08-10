import Link from "next/link";
import { StoreShell } from "../../../components/store/StoreShell";
import { getPublishedSiteSettings } from "../../../lib/cms/site-settings-reader";
import { CommerceDatabaseNotConfiguredError } from "../../../lib/commerce/db";
import { findOrderConfirmation, getOrderStatusDisplay } from "../../../lib/commerce/order-confirmation";

export const dynamic = "force-dynamic";
export const metadata = { title: "ご注文を受け付けました", robots: { index: false, follow: false } };

export default async function OrderSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const confirmation = searchParams.then(({ session_id: sessionId }) => sessionId
    ? findOrderConfirmation(sessionId).catch((error) => {
      if (error instanceof CommerceDatabaseNotConfiguredError) return undefined;
      throw error;
    })
    : undefined);
  const [settings, order] = await Promise.all([
    getPublishedSiteSettings(),
    confirmation,
  ]);
  const statusDisplay = order ? getOrderStatusDisplay(order.status) : undefined;

  return <StoreShell settings={settings} className="store-order-success-route">
    <section className="store-success-content">
      <p className="store-eyebrow">ORDER STATUS</p>
      {order && statusDisplay ? <>
        <h1>{statusDisplay.heading}</h1>
        <p className="store-order-status">{statusDisplay.payment}</p>
        <dl className="store-order-details">
          <div className="store-order-reference"><dt>ご注文番号</dt><dd>{order.id}</dd></div>
          <div className="store-order-amount"><dt>お支払い金額</dt><dd>¥{order.totalJpy.toLocaleString("ja-JP")}</dd></div>
          {order.customerEmail ? <div className="store-order-contact"><dt>確認メール送信先</dt><dd>{order.customerEmail}</dd></div> : null}
        </dl>
        <p className="store-order-shipment">{statusDisplay.shipment}</p>
      </> : <>
        <h1>ご注文を<br />確認しています。</h1>
        <p className="store-order-status is-pending">確認中</p>
        <p className="store-order-pending">決済情報を確認中です。このページを数分後に更新してください。</p>
      </>}
      <p className="store-order-support">ご注文についてのお問い合わせ: <a href={`mailto:${settings.contact.email}`}>{settings.contact.email}</a></p>
      <Link className="store-button store-button-primary" href="/">ストアへ戻る</Link>
    </section>
  </StoreShell>;
}
