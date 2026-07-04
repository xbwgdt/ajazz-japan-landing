import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "アンケート管理 | AJAZZ Japan",
  robots: { index: false, follow: false },
};

export default async function SurveyAdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;
  return (
    <main className="survey-page survey-admin-login-page">
      <section className="survey-admin-login">
        <a className="survey-logo" href="/"><strong>AJAZZ</strong><span>JAPAN</span></a>
        <p className="survey-kicker">SURVEY ADMIN</p>
        <h1>集計管理</h1>
        <p>回答結果の閲覧とデータ出力には管理者パスワードが必要です。</p>
        {error === "password" && <div className="survey-alert">パスワードが正しくありません。</div>}
        {error === "config" && <div className="survey-alert">管理者環境変数が設定されていません。</div>}
        <form method="post" action="/api/survey/admin/login">
          <label><span>管理者パスワード</span><input type="password" name="password" autoComplete="current-password" required /></label>
          <button type="submit">ログイン <span>↗</span></button>
        </form>
      </section>
    </main>
  );
}
