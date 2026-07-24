import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listAdminOrders } from "../../../lib/commerce/admin-orders";
import { CommerceDatabaseNotConfiguredError } from "../../../lib/commerce/db";
import { ADMIN_COOKIE, verifyAdminToken } from "../../../lib/survey-security";

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
        <a href="/">ストアを見る</a>
      </header>
      {unavailable ? <p className="store-admin__notice">データベース接続を設定すると、決済済みの注文が表示されます。</p> : null}
      <section className="store-admin__table-wrap">
        <table className="store-admin__table">
          <thead><tr><th>注文番号</th><th>購入者</th><th>金額</th><th>状態</th><th>追跡番号</th><th>受注日時</th></tr></thead>
          <tbody>
            {orders.map((order) => <tr key={order.id}>
              <td>{order.id}</td><td>{order.customerEmail ?? "-"}</td><td>¥{order.totalJpy.toLocaleString("ja-JP")}</td>
              <td>{statusLabels[order.status] ?? order.status}</td><td>{order.trackingNumber ?? "-"}</td>
              <td>{order.createdAt.toLocaleString("ja-JP")}</td>
            </tr>)}
            {!orders.length && !unavailable ? <tr><td colSpan={6}>現在、表示できる注文はありません。</td></tr> : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}
