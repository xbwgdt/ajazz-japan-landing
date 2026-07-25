import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listAdminOrders } from "../../../lib/commerce/admin-orders";
import { CommerceDatabaseNotConfiguredError } from "../../../lib/commerce/db";
import { ADMIN_COOKIE, verifyAdminToken } from "../../../lib/survey-security";
import { OrderShipmentForm } from "../../../components/store/OrderShipmentForm";
import { OrderRefundButton } from "../../../components/store/OrderRefundButton";
import { OrderRestockButton } from "../../../components/store/OrderRestockButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "注文管理 | AJAZZ JAPAN", robots: { index: false, follow: false } };

const statusLabels: Record<string, string> = {
  paid: "決済済み",
  awaiting_fulfillment: "出荷準備中",
  shipped: "発送済み",
  cancelled: "キャンセル",
  refund_pending: "返金処理中",
  refunded: "返金済み",
};

export default async function AdminOrdersPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) redirect("/survey/admin/login");

  let unavailable = false;
  const orders = await listAdminOrders().catch((error) => {
    if (error instanceof CommerceDatabaseNotConfiguredError) {
      unavailable = true;
      return [];
    }
    throw error;
  });

  return (
    <main className="store-admin">
      <header className="store-admin__header">
        <div><p>AJAZZ JAPAN</p><h1>注文管理</h1></div>
        <div className="store-admin__links"><a href="/api/admin/orders/export.csv">CSV出力</a><a href="/">ストアを見る</a></div>
      </header>
      {unavailable ? <p className="store-admin__notice">データベース接続を設定すると、決済済みの注文が表示されます。</p> : null}
      <section className="store-admin__table-wrap">
        <table className="store-admin__table">
          <thead><tr><th>注文番号</th><th>購入者・配送先</th><th>金額</th><th>状態</th><th>発送処理</th><th>返金</th><th>返品入庫</th><th>受注日時</th></tr></thead>
          <tbody>
            {orders.map((order) => <tr key={order.id}>
              <td>{order.id}</td><td>{order.customerEmail ?? "-"}<br />{formatShippingAddress(order.shippingAddress)}</td><td>¥{order.totalJpy.toLocaleString("ja-JP")}</td>
              <td>{statusLabels[order.status] ?? order.status}</td><td><OrderShipmentForm orderId={order.id} status={order.status} trackingNumber={order.trackingNumber} /></td>
              <td><OrderRefundButton orderId={order.id} status={order.status} /></td>
              <td><OrderRestockButton orderId={order.id} status={order.status} /></td>
              <td>{order.createdAt.toLocaleString("ja-JP")}</td>
            </tr>)}
            {!orders.length && !unavailable ? <tr><td colSpan={8}>現在、表示できる注文はありません。</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function formatShippingAddress(value: Record<string, unknown> | null) {
  if (!value) return "配送先未取得";
  const address = (value.address ?? value) as Record<string, unknown>;
  const fragments = [value.name, address.postal_code, address.state, address.city, address.line1, address.line2]
    .filter((fragment): fragment is string => typeof fragment === "string" && Boolean(fragment));
  return fragments.join(" ") || "配送先未取得";
}
