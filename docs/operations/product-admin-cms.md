# Product Admin CMS Production Runbook

## Scope and production gate

This runbook documents the release procedure only. It does not authorize a
deployment, migration, credential lookup, browser acceptance session, database
operation, R2 operation, RMS operation, or Stripe operation. Production remains
blocked until credential rotation and approved Git-history cleanup are complete.

Use a release owner for each step and retain command output, backup references,
catalog JSON evidence, and acceptance evidence with the release record. Do not
put credentials, bootstrap passwords, or Stripe/RMS/R2 values in those records.

## Required production variables

Set the following values in Railway. Do not commit production credentials.

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

`POSTGRES_URL` may be used instead of `DATABASE_URL`. Configure the
Cloudflare Worker separately with the `AJAZZ_ORIGIN` and `CRON_SECRET` secrets;
the `CRON_SECRET` value must match Railway. Do not configure R2 write credentials
in the Worker, the browser, or source control.

Set these two variables only for the one-time bootstrap command, after migrations
have succeeded:

```env
BOOTSTRAP_ADMIN_EMAIL=xiet@a-jazz.com
BOOTSTRAP_ADMIN_PASSWORD=replace-only-in-railway-or-local-untracked-env
```

Do not set `ADMIN_PASSWORD` or `ADMIN_SECRET`. Remove
`BOOTSTRAP_ADMIN_PASSWORD` immediately after account creation.

## Railway migration behavior

`railway.json` declares `pnpm cms:migrate` as Railway's pre-deploy command and
`HOSTNAME=0.0.0.0 pnpm start` as the application start command. Railway must run
the migration before the candidate application starts. A nonzero migration exit
code must fail the candidate deployment and leave the previous production release
in place; do not run migrations manually as part of normal application startup.

## Release order

Perform these ten steps in order. Stop on any failure and keep traffic on the
previous Railway deployment.

1. Rotate every previously exposed Stripe, RMS, database, cron, and administrator secret.
2. Obtain explicit approval before Git history cleanup; verify the rewritten fork contains no exposed value.
3. Create `media.ajazz.jp`, private R2 write credentials, and public read-only delivery.
4. Add Payload and R2 variables to Railway; set bootstrap variables only for the bootstrap command.
5. Back up Railway PostgreSQL and rehearse Payload migrations on a disposable restored database.
6. Run `pnpm cms:migrate`, `pnpm cms:bootstrap-admin`, catalog dry run, catalog apply, and reconciliation.
7. Remove `BOOTSTRAP_ADMIN_PASSWORD` immediately after account creation.
8. Deploy the application, then the updated Cloudflare Cron Worker.
9. Verify administrator login, RMS sync, media upload, preview, publication, storefront, checkout in Stripe test mode, order export, shipment, refund, archive, and restore.
10. Switch traffic only after all acceptance checks pass; rollback by restoring the previous Railway deployment without dropping either database schema.

## Pre-production rehearsal and catalog migration

Back up Railway PostgreSQL, restore that backup to a disposable database, and
configure a disposable R2 bucket before rehearsing the migration. Point local or
one-off environment configuration only at the disposable database and bucket.
Do not use production credentials for rehearsal.

After reviewing the dry-run JSON, resolve every conflict before applying. The
apply command is resume-safe only when it reuses the same JSON checkpoint. Store
the files outside the repository and do not include secrets in their paths or
contents.

```powershell
pnpm cms:migrate
pnpm cms:bootstrap-admin

pnpm cms:migrate-catalog -- --json "C:\migration-evidence\ajazz-catalog-dry-run.json"

$env:CMS_MIGRATION_CONFIRM="AJAZZ_CATALOG_2026"
pnpm cms:migrate-catalog -- --apply --json "C:\migration-evidence\ajazz-catalog-apply.json"

pnpm cms:migrate-catalog -- --reconcile --json "C:\migration-evidence\ajazz-catalog-reconcile.json"
```

The dry run is read-only. Apply creates the CMS records and fills only missing
CMS identity links after matching records exist. Reconciliation must compare
product and variant counts, RMS and SKU links, sale and approved comparison
prices, image counts, and publication state; any mismatch blocks the release.

## R2 and delivery verification

Before traffic switching, confirm all of the following without exposing write
credentials:

- `media.ajazz.jp` resolves to the configured public read-only delivery path.
- The R2 bucket is not publicly writable or listable; `R2_ACCESS_KEY_ID` and
  `R2_SECRET_ACCESS_KEY` exist only in Railway.
- An administrator media upload creates an object in the expected private bucket
  and the published object loads through `https://media.ajazz.jp/...`.
- The admin preview and storefront use the delivered media URL, and a failed
  media resolution does not replace the current live product media.
- No response, browser bundle, log, screenshot, or catalog evidence contains an
  R2 write credential.

## Browser acceptance

Run this acceptance only after the staged release is ready. Capture and inspect
screenshots at 1440x900 in `artifacts/cms-acceptance/desktop/` and 390x844 in
`artifacts/cms-acceptance/mobile/`. Do not declare acceptance until every image
has been inspected and the browser console has no application errors.

- `/admin` login and dashboard render without overlap.
- Product list search and all five filters work.
- RMS fields are read-only and manual inventory control is conditional.
- Image upload, thumbnail/color selection, draft save, preview, publish,
  unpublish, archive, restore, and version restore work.
- Published listing and detail pages use the same selected color images and
  prices as the admin preview.
- Checkout uses the published server-side price and current operational inventory.
- `/admin/orders` export, shipment, refund, and restock controls remain usable.
- Driver links open the external AJAZZ site safely and `/drivers` redirects.
- All primary images load from `media.ajazz.jp`.

Browser acceptance: pending; no screenshots have been captured for this documentation-only task.

## Final acceptance checklist

- [ ] An administrator created as `xiet@a-jazz.com` can authenticate through Payload and open products and orders from one `/admin` surface.
- [ ] An RMS-linked product can be edited without changing locked RMS identity or inventory.
- [ ] A website-only product can be created, stocked manually with an audit reason, previewed, published, unpublished, archived, and restored.
- [ ] Multiple color variants show thumbnail, swatch, image, sale price, approved comparison price, and stock behavior correctly.
- [ ] Failed validation, media resolution, audit insertion, or database writes leave the previous live product unchanged.
- [ ] Product/version/media deletion rules preserve every order reference and live media object.
- [ ] The existing checkout, Stripe webhook, refund, restock, order export, RMS sync, reservation cleanup, legal, privacy, and terms tests all pass.
- [ ] The homepage and company/legal content can be edited only within approved slots.
- [ ] Desktop and mobile screenshots show no clipped text, overlap, missing images, or broken controls.
- [ ] Production remains blocked until credential rotation and approved Git-history cleanup are complete.

## Rollback

If the pre-deploy migration, application deployment, Worker deployment, R2
verification, catalog reconciliation, or acceptance checklist fails, stop the
release. Restore the previous Railway deployment and keep both the `public`
commerce schema and the `cms` schema intact for investigation and retry. Do not
drop database schemas, order data, CMS data, or media objects as part of rollback.
Keep the prior Cloudflare Cron Worker active unless its release is separately
known to be safe to roll back.
