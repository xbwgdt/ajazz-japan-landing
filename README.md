# AJAZZ JAPAN Official Store

Japanese direct-to-consumer storefront for AJAZZ JAPAN with catalog, cart,
Stripe Checkout, manual fulfillment, driver downloads, and legal pages for
`https://ajazz.jp`.

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

Set these values in the Railway service. Do not commit production credentials.

```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
PAYLOAD_SECRET=replace-with-at-least-32-random-characters
BOOTSTRAP_ADMIN_EMAIL=xiet@a-jazz.com
BOOTSTRAP_ADMIN_PASSWORD=replace-only-in-railway-or-local-untracked-env
STRIPE_SECRET_KEY=sk_live_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
NEXT_PUBLIC_SITE_URL=https://ajazz.jp
CRON_SECRET=replace-with-a-long-random-value
RMS_SERVICE_SECRET=replace-with-rms-service-secret
RMS_LICENSE_KEY=replace-with-rms-license-key
```

`POSTGRES_URL` is accepted as an alternative to `DATABASE_URL`.

## First deployment checklist

1. In Railway, create a project from `xbwgdt/ajazz-japan-landing` and select the production branch after it is merged.
2. Add the environment variables above to the Railway service and deploy. Railway uses `railway.json` to build the application, start it, and check `GET /api/health` before routing production traffic.
3. Generate the temporary `*.up.railway.app` domain and complete the Stripe and database checks there before adding `ajazz.jp`.
4. Add `ajazz.jp` as a Railway custom domain. Railway will provide a CNAME and a TXT record; add both records to Cloudflare. Add `www.ajazz.jp` as a CNAME to `ajazz.jp`, then configure the redirect in Cloudflare.

When Cloudflare proxying is enabled for the Railway domain, set Cloudflare SSL/TLS encryption mode to **Full**. Railway verifies the custom domain with the required CNAME and TXT records before it serves traffic.
5. In Stripe Dashboard, set the public terms-of-service URL to `https://ajazz.jp/terms`. Checkout requires this URL because customers must accept the terms before payment.
6. In Stripe Dashboard, add `https://ajazz.jp/api/stripe/webhook` as a webhook endpoint and subscribe to `checkout.session.completed`, `checkout.session.expired`, `refund.created`, `refund.updated`, and `refund.failed`. Copy the endpoint signing secret to `STRIPE_WEBHOOK_SECRET`.
7. Import the current RMS catalog after the database is configured:

   ```powershell
   pnpm import:rms "C:\path\to\dl-normal-item.xlsx"
   ```

   Run `pnpm import:rms --dry-run "C:\path\to\dl-normal-item.xlsx"` first to review product and SKU totals without writing data.

8. Deploy the Cloudflare Worker described below, then configure protected schedules to request `GET /api/cron/release-reservations` and `GET /api/cron/rms-inventory` with `Authorization: Bearer <CRON_SECRET>`. Stripe normally releases abandoned checkout reservations through `checkout.session.expired`; the first schedule is a four-day fallback for missed events, and the second reads current stock from RMS InventoryAPI 2.1.
9. Run `pnpm cms:migrate` and `pnpm cms:bootstrap-admin`, then remove `BOOTSTRAP_ADMIN_PASSWORD` from the Railway service after the account exists.
10. Complete a Stripe test-mode purchase, confirm the webhook creates an order, sign in at `/admin`, check the order in `/admin/orders`, and test manual fulfillment and refund handling before switching to live keys.

## Operational limits before launch

- The supplied RMS workbook imports the initial catalog, prices, variants, and product image URLs.
- RMS InventoryAPI 2.1 uses `RMS_SERVICE_SECRET` and `RMS_LICENSE_KEY`. Configure them only in Railway, then confirm a real cron run updates `inventory_sync_logs` before claiming real-time synchronization is live.

## Cloudflare scheduled operations

The included Cloudflare Worker handles scheduled operations independently of the Railway web service, using these UTC schedules:

- Every 10 minutes: releases checkout reservations only when Stripe expiration events have remained unavailable for four days.
- Every 15 minutes: synchronizes published SKU stock from RMS.

Deploy it separately after the Railway production deployment is live:

```bash
cd cloudflare/ajazz-operations-cron
npx wrangler login
npx wrangler secret put AJAZZ_ORIGIN
# Enter https://ajazz.jp
npx wrangler secret put CRON_SECRET
# Enter the exact same value configured in Railway.
npx wrangler deploy
```

Cloudflare stores both values as Worker secrets. Do not add either value to `wrangler.json` or commit it. Confirm both schedules appear under **Workers & Pages > ajazz-operations-cron > Settings > Triggers**, then inspect Worker logs after the first execution. RMS credentials remain only in Railway.
- Customer confirmation and shipment emails require a transactional email provider. No email provider is configured in this repository.
- Fulfillment remains manual through `/admin/orders` for the first release.
- Payload protects `/admin` and the order administration APIs with the administrator account `xiet@a-jazz.com`. The bootstrap password is read only by `pnpm cms:bootstrap-admin` and should be removed from the service after the account exists.

## Business information

- Seller: アジャズジャパン株式会社
- Address: 〒340-0043 埼玉県草加市草加2-13-21-7
- Phone: 070-9319-5121
- Contact: xiet@a-jazz.com
