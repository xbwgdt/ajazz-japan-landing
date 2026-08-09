import { getAdminDashboardSnapshot } from "../../lib/cms/admin-dashboard";

export async function Dashboard() {
  const snapshot = await getAdminDashboardSnapshot();
  return (
    <section className="store-admin-dashboard">
      <h2>AJAZZ JAPAN operations</h2>
      <dl>
        <div><dt>Total products</dt><dd>{snapshot.totalCount}</dd></div>
        <div><dt>Drafts</dt><dd>{snapshot.draftCount}</dd></div>
        <div><dt>Published</dt><dd>{snapshot.publishedCount}</dd></div>
        <div><dt>Out of stock</dt><dd>{snapshot.outOfStockCount}</dd></div>
        <div><dt>Archived</dt><dd>{snapshot.archivedCount}</dd></div>
      </dl>
      <h3>Pending publication</h3>
      <ul>{snapshot.pendingPublicationProducts.map((product) => <li key={product.id}>{product.name}</li>)}</ul>
      <h3>Recent activity</h3>
      <ul>{snapshot.recentAuditEvents.map((event, index) => <li key={`${event.subjectId}-${index}`}>{event.action}</li>)}</ul>
      <a href="/admin/orders">Order management</a>
    </section>
  );
}
