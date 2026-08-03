import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "注文管理ログイン | AJAZZ JAPAN",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const error = (await searchParams).error;
  return (
    <main className="store-admin">
      <section className="store-admin__login">
        <p>AJAZZ JAPAN</p>
        <h1>注文管理</h1>
        <p>出荷、返金、注文データの管理には管理者パスワードが必要です。</p>
        {error === "password" ? <p className="store-admin__notice">パスワードが正しくありません。</p> : null}
        {error === "config" ? <p className="store-admin__notice">管理者認証が設定されていません。</p> : null}
        {error === "rate" ? <p className="store-admin__notice">ログイン試行回数が上限に達しました。15分後に再度お試しください。</p> : null}
        <form method="post" action="/api/admin/login">
          <label>
            管理者パスワード
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit">ログイン</button>
        </form>
      </section>
    </main>
  );
}
