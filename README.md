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
STRIPE_SECRET_KEY=sk_live_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
NEXT_PUBLIC_SITE_URL=https://ajazz.jp
CRON_SECRET=replace-with-a-long-random-value
RMS_SERVICE_SECRET=replace-with-rms-service-secret
RMS_LICENSE_KEY=replace-with-rms-license-key
R2_BUCKET=ajazz-japan-media
R2_ACCESS_KEY_ID=replace-only-in-railway
R2_SECRET_ACCESS_KEY=replace-only-in-railway
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://media.ajazz.jp
```

`POSTGRES_URL` is accepted as an alternative to `DATABASE_URL`.

## CMS production release

Follow the gated release sequence in
[`docs/operations/product-admin-cms.md`](docs/operations/product-admin-cms.md).
It is the authoritative procedure for credential rotation, approved Git-history
cleanup, Railway backup rehearsal, catalog migration, R2 verification, browser
acceptance, traffic switching, and rollback.

Railway runs `pnpm cms:migrate` in the pre-deploy phase. A migration failure
prevents the candidate release from starting; it does not run a migration now
and does not change the current production deployment. The application starts
only after that phase succeeds, then Railway checks `GET /api/health` before
routing traffic.

Before Railway can run that migration, the release owner must attest that the
two production gates are complete by setting the following non-secret values to
the exact word `confirmed`. Missing values block the candidate deployment:

```env
CMS_RELEASE_CREDENTIALS_ROTATED=confirmed
CMS_RELEASE_HISTORY_CLEANUP_APPROVED=confirmed
```

Set these only after completing and recording the corresponding runbook steps.
Remove them after the accepted deployment so every future release requires a
fresh explicit approval.

`BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` are temporary bootstrap
inputs, not required Railway service configuration. Set them only while running
`pnpm cms:bootstrap-admin`, remove
`BOOTSTRAP_ADMIN_PASSWORD` immediately after the administrator account is
created, and never use legacy `ADMIN_PASSWORD` or `ADMIN_SECRET` variables.

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

## Existing catalog migration to Payload CMS

The catalog migration is read-only unless `--apply` is supplied. It never rewrites
storefront product, variant, image, lifecycle, publication, price, or inventory
content. Apply creates CMS records and only fills missing product and variant
identity links (`cms_product_id`, `cms_variant_id`, and their CMS-side operational
IDs) after the matching records exist.

1. Restore a current production backup into a disposable database and configure a
   disposable R2 bucket. Run the CMS schema migrations there, then rehearse the
   complete catalog migration before scheduling production work.
2. Keep the dry-run output as migration evidence. The JSON path must be absolute:

   ```powershell
   pnpm cms:migrate-catalog -- --json "C:\migration-evidence\ajazz-catalog-dry-run.json"
   ```

3. Review all creates, links, and identity conflicts. Resolve every conflict before
   apply. Apply requires the exact confirmation phrase and uses the JSON file as an
   atomic, resume-safe checkpoint with deterministic batches of 25 products:

   ```powershell
   $env:CMS_MIGRATION_CONFIRM="AJAZZ_CATALOG_2026"
   pnpm cms:migrate-catalog -- --apply --json "C:\migration-evidence\ajazz-catalog-apply.json"
   ```

   Re-running the same command resumes the recorded run. A changed plan is rejected
   instead of being applied against an incompatible checkpoint.
4. Reconcile product and variant counts, RMS and SKU links, sale/comparison prices,
   image counts, and publication state. Any mismatch returns a nonzero exit code:

   ```powershell
   pnpm cms:migrate-catalog -- --reconcile --json "C:\migration-evidence\ajazz-catalog-reconcile.json"
   ```

5. Rollback is non-destructive: deploy the prior application release and leave both
   the `public` commerce schema and `cms` schema intact for investigation and retry.
   Never drop CMS, commerce, order, or media data as part of rollback.

## Business information

- Seller: アジャズジャパン株式会社
- Address: 〒340-0043 埼玉県草加市草加2-13-21-7
- Phone: 070-9319-5121
- Contact: xiet@a-jazz.com
