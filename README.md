# AJAZZ JAPAN Official Store

Japanese direct-to-consumer storefront for AJAZZ JAPAN. The application keeps
the existing survey at `/survey` and adds catalog, cart, Stripe Checkout,
manual fulfillment, driver downloads, and legal pages for `https://ajazz.jp`.

## Local development

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3007`.

## Verification

```powershell
pnpm test
pnpm build
```

## Required production configuration

Set these values in the Vercel project. Do not commit production credentials.

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
SURVEY_ADMIN_PASSWORD=replace-with-a-strong-password
SURVEY_ADMIN_SECRET=replace-with-at-least-32-random-characters
STRIPE_SECRET_KEY=sk_live_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
NEXT_PUBLIC_SITE_URL=https://ajazz.jp
CRON_SECRET=replace-with-a-long-random-value
```

`POSTGRES_URL` is accepted as an alternative to `DATABASE_URL`.

## First deployment checklist

1. Deploy this branch through the repository owner that controls the Vercel project.
2. Add `ajazz.jp` and `www.ajazz.jp` to the Vercel project, then update DNS as instructed by Vercel.
3. Configure the environment variables above for Production and redeploy.
4. In Stripe Dashboard, set the public terms-of-service URL to `https://ajazz.jp/terms`. Checkout requires this URL because customers must accept the terms before payment.
5. In Stripe Dashboard, add `https://ajazz.jp/api/stripe/webhook` as a webhook endpoint and subscribe to `checkout.session.completed`. Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.
6. Import the current RMS catalog after the database is configured:

   ```powershell
   pnpm import:rms "C:\path\to\dl-normal-item.xlsx"
   ```

   Run `pnpm import:rms --dry-run "C:\path\to\dl-normal-item.xlsx"` first to review product and SKU totals without writing data.

7. Configure a protected scheduler to request `GET /api/cron/release-reservations` with `Authorization: Bearer <CRON_SECRET>`. This releases stock reservations left behind by abandoned checkout sessions.
8. Complete a Stripe test-mode purchase, confirm the webhook creates an order, check the order in `/admin/orders`, and test manual fulfillment and refund handling before switching to live keys.

## Operational limits before launch

- The supplied RMS workbook imports the initial catalog, prices, variants, and product image URLs.
- The live RMS inventory HTTP adapter still needs the merchant-specific API endpoint, request schema, and credentials. Do not claim real-time RMS inventory synchronization until it has been connected and tested.
- Customer confirmation and shipment emails require a transactional email provider. No email provider is configured in this repository.
- Fulfillment remains manual through `/admin/orders` for the first release.

## Business information

- Seller: アジャズジャパン株式会社
- Address: 〒340-0043 埼玉県草加市草加2-13-21-7
- Phone: 070-9319-5121
- Contact: xiet@a-jazz.com
