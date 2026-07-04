# AJAZZ Japan Landing

AJAZZ Japanの製品紹介サイトです。Next.js App Routerで構築し、Vercelへのデプロイを前提としています。

## ページ

- `/` — 製品一覧、購入リンク、ドライバー、FAQ
- `/survey` — 記名式ゲーミングデバイス調査
- `/survey/admin` — 回答集計、CSV/Excel出力（パスワード保護）

## ローカル起動

```bash
npm install
npm run dev
```

http://localhost:3007 で確認できます。

## アンケート用環境変数

`.env.example` を `.env.local` にコピーして設定してください。

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
SURVEY_ADMIN_PASSWORD=十分に長い管理者パスワード
SURVEY_ADMIN_SECRET=32文字以上のランダムな秘密文字列
```

`POSTGRES_URL` も `DATABASE_URL` の代わりに使用できます。テーブルは初回アクセス時に自動作成されます。SQLを先に適用する場合は `db/schema.sql` を使用してください。

## Vercelへの公開

1. VercelプロジェクトのMarketplaceからNeonを接続する
2. `DATABASE_URL` または `POSTGRES_URL` が設定されたことを確認する
3. `SURVEY_ADMIN_PASSWORD` と `SURVEY_ADMIN_SECRET` をProduction環境に設定する
4. mainブランチへ反映してデプロイする

永続データベースが未設定の場合、アンケートページは表示されますが送信は `503` で拒否され、回答が消失しないように明示的なエラーを表示します。

## 確認コマンド

```bash
npm run lint
npm run build
npm audit
```
