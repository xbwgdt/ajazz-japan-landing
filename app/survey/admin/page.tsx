import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildSurveyStats, formatJst } from "../../../lib/survey";
import { DatabaseNotConfiguredError, listSurveyResponses } from "../../../lib/survey-db";
import { ADMIN_COOKIE, verifyAdminToken } from "../../../lib/survey-security";

export const metadata: Metadata = {
  title: "集計ダッシュボード | AJAZZ Japan",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function SurveyAdminPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!verifyAdminToken(token)) redirect("/survey/admin/login");

  let databaseError = false;
  const rows = await listSurveyResponses().catch((error) => {
    if (error instanceof DatabaseNotConfiguredError) {
      databaseError = true;
      return [];
    }
    throw error;
  });
  const stats = buildSurveyStats(rows);

  return (
    <main className="survey-page survey-admin-page">
      <header className="survey-admin-head">
        <div><p className="survey-kicker">LIVE RESULTS</p><h1>集計ダッシュボード</h1></div>
        <div className="survey-admin-actions">
          <a href="/api/survey/admin/export.csv">CSV</a>
          <a className="primary" href="/api/survey/admin/export.xlsx">Excel</a>
          <form method="post" action="/api/survey/admin/logout"><button type="submit">ログアウト</button></form>
        </div>
      </header>

      {databaseError && (
        <div className="survey-config-alert">
          <strong>データベース未設定</strong>
          <span>VercelでNeonを接続し、DATABASE_URLまたはPOSTGRES_URLを設定してください。</span>
        </div>
      )}

      <section className="survey-metrics">
        <article><span>総回答数</span><strong>{rows.length}</strong><small>RESPONSES</small></article>
        <article><span>質問数</span><strong>10</strong><small>QUESTIONS</small></article>
        <article><span>回答形式</span><strong className="word">記名</strong><small>IDENTIFIED</small></article>
      </section>

      <section className="survey-results-grid">
        {stats.map((question, index) => (
          <article className="survey-result-card" key={question.title}>
            <header><span>Q{String(index + 1).padStart(2, "0")}</span><h2>{question.title}</h2></header>
            {question.options.map((option) => (
              <div className="survey-chart-row" key={option.label}>
                <div><span>{option.label}</span><b>{option.count}人 · {option.percent}%</b></div>
                <progress value={option.percent} max="100" aria-label={`${option.label} ${option.percent}%`} />
              </div>
            ))}
          </article>
        ))}
      </section>

      <section className="survey-recent">
        <div><p className="survey-kicker">LATEST ENTRIES</p><h2>最近の回答</h2></div>
        <div className="survey-table-wrap">
          <table>
            <thead><tr><th>ID</th><th>氏名</th><th>回答日時（JST）</th></tr></thead>
            <tbody>
              {rows.slice(0, 10).map((row) => <tr key={row.id}><td>#{String(row.id).padStart(4, "0")}</td><td>{row.name}</td><td>{formatJst(row.submittedAt)}</td></tr>)}
              {!rows.length && <tr><td colSpan={3}>まだ回答はありません。</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
