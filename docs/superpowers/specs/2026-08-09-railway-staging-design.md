# AJAZZ JAPAN Railway Staging Design

## Purpose

Create a non-production Railway environment where the AJAZZ JAPAN storefront,
Payload product administration, media delivery, and test checkout can be
validated through a public HTTPS URL before any production release. The staging
environment must not read or modify production orders, catalog records, media,
Stripe payments, or Rakuten RMS inventory.

## Selected Approach

Use the existing Railway project and add an environment named `staging`.
Services may share the project boundary, but staging receives its own web-service
deployment, PostgreSQL database, variables, and Cloudflare R2 bucket. The
production environment remains unchanged and continues to serve `ajazz.jp` only
after its separate release gate and acceptance process pass.

This approach is preferred over a separate Railway project because it keeps
project ownership and deployment management simple while retaining resource
isolation. Testing directly in production is excluded.

## Environment Model

### Production

- Railway environment name: `production`.
- Site URL: `https://ajazz.jp`.
- Media URL: `https://media.ajazz.jp`.
- Uses production PostgreSQL, production R2, live Stripe credentials, and RMS
  credentials only after the production release procedure authorizes them.
- Deployment remains blocked unless credential rotation and approved Git-history
  cleanup are explicitly attested.

### Staging

- Railway environment name: `staging`.
- Site URL: Railway's generated HTTPS domain during the first phase.
- Uses a new empty PostgreSQL service created inside the staging environment.
- Uses an R2 bucket named `ajazz-japan-media-staging` with independent write
  credentials and a staging-only public delivery URL.
- Uses Stripe test mode only. A live Stripe secret key must block startup.
- RMS inventory synchronization is disabled. No production RMS credentials are
  added to staging.
- Uses a staging-only Payload administrator account created after migrations.
- Does not receive `ajazz.jp` or `media.ajazz.jp` traffic.

## Deployment Classification and Gate

Introduce `CMS_DEPLOYMENT_ENV` with the allowed values `production`, `staging`,
and `local`.

The release-check command must behave as follows:

- `production`: require `RAILWAY_ENVIRONMENT_NAME=production`,
  `CMS_RELEASE_CREDENTIALS_ROTATED=confirmed`, and
  `CMS_RELEASE_HISTORY_CLEANUP_APPROVED=confirmed` before migration.
- `staging`: require `RAILWAY_ENVIRONMENT_NAME=staging`,
  `CMS_STAGING_ISOLATION_CONFIRMED=confirmed`,
  `RMS_SYNC_ENABLED=false`, an R2 bucket name ending in `-staging`, a public
  media URL different from `https://media.ajazz.jp`, and either no Stripe secret
  key or a key beginning with `sk_test_`.
- `local`: permit local development only when Railway environment variables are
  absent. Railway must reject `CMS_DEPLOYMENT_ENV=local`.
- Missing, unknown, or contradictory classifications fail closed before schema
  migration.

`CMS_STAGING_ISOLATION_CONFIRMED` is an operator attestation, not automatic proof
that the database is isolated. Before setting it, the release owner must verify
in Railway that staging's `DATABASE_URL` references the new staging PostgreSQL
service and not a shared or production variable.

## Staging Variables

Staging requires the following categories of configuration:

- Railway-generated `DATABASE_URL` from the staging PostgreSQL service.
- A newly generated staging `PAYLOAD_SECRET`.
- `CMS_DEPLOYMENT_ENV=staging`.
- `CMS_STAGING_ISOLATION_CONFIRMED=confirmed`, set only after resource review.
- `NEXT_PUBLIC_SITE_URL` set to the generated Railway HTTPS domain.
- `RMS_SYNC_ENABLED=false`; omit `RMS_SERVICE_SECRET` and `RMS_LICENSE_KEY`.
- Stripe test-mode values only when checkout testing begins.
- `R2_BUCKET=ajazz-japan-media-staging` and independent staging R2 credentials,
  endpoint, and public URL.
- Temporary `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` only while
  creating the staging administrator; remove the password immediately afterward.

No value from a production secret is copied into staging. Documentation and
screenshots may show variable names and presence status but never secret values.

## Data and Service Flow

1. GitHub branch `feat/ajazz-japan-store` deploys to Railway staging.
2. Railway runs the environment release check.
3. A passing check allows Payload migrations against the staging PostgreSQL
   service.
4. Railway starts the Next.js application and verifies `/api/health`.
5. The administrator is bootstrapped once, then the bootstrap password is
   removed.
6. Test catalog records and media are created only in staging PostgreSQL and the
   staging R2 bucket.
7. Stripe Checkout uses test mode. RMS synchronization stays disabled.
8. Browser acceptance is performed against the Railway HTTPS staging domain.

## Browser Acceptance

Acceptance uses representative test products and no customer or production
order data. Capture and inspect desktop screenshots at `1440x900` and mobile
screenshots at `390x844`.

Required checks:

- Payload administrator login and dashboard.
- Product creation, draft save, preview, publish, unpublish, archive, restore,
  and version restore.
- Multiple colors with thumbnail, swatch, image, price, comparison-price
  approval state, and inventory behavior.
- Staging R2 upload and public delivery without write access from the browser.
- Product search and all administration filters.
- Storefront listing and detail consistency with the published record.
- Stripe test-mode checkout only.
- Order export, shipment, refund, and restock controls using test orders.
- Driver redirect and external-link safety.
- No layout overlap, clipped text, missing images, or application console errors.

The staging environment is not accepted if any page loads production media,
creates a live Stripe payment, triggers RMS synchronization, or references a
production database.

## Failure Handling and Cleanup

- A release-gate or migration failure leaves the prior staging deployment active.
- Failed staging catalog or media operations must not trigger production cleanup
  jobs or production webhooks.
- Remove `BOOTSTRAP_ADMIN_PASSWORD` after administrator creation.
- Keep staging available for future pre-production validation, but rotate or
  remove unused test credentials.
- Deleting staging later requires explicit approval and a verified staging-only
  resource list. Production resources are never deleted as staging cleanup.

## Implementation and Operational Boundaries

The implementation phase may change release-gate code, tests, documentation,
and Railway staging configuration. It may create staging-only Railway and R2
resources after their destinations are visibly verified. It must not push to a
production branch, switch `ajazz.jp`, run production migrations, alter production
variables, enable RMS synchronization, or use Stripe live mode.

Success means the staging HTTPS site passes automated checks and the documented
desktop/mobile browser acceptance while production remains untouched.
