# Cloudflare Operations Cron Design

## Goal

Run RMS inventory synchronization and abandoned-checkout reservation cleanup independently of the Vercel plan.

## Architecture

Cloudflare Workers Cron invokes a small standalone Worker on two UTC schedules. The Worker sends authenticated `GET` requests to the existing AJAZZ production endpoints. It does not access RMS, Stripe, or the commerce database directly.

## Schedules

- `*/10 * * * *`: `GET /api/cron/release-reservations`
- `*/15 * * * *`: `GET /api/cron/rms-inventory`

At times when both expressions match, Cloudflare may invoke two separate Worker events. Both website endpoints are safe to call independently.

## Secrets and Deployment

The Worker stores only `AJAZZ_ORIGIN` (for example `https://ajazz.jp`) and `CRON_SECRET` as Cloudflare Worker secrets. It sends `Authorization: Bearer <CRON_SECRET>` to the website. The same `CRON_SECRET` must be configured in Vercel. RMS credentials remain only in Vercel.

The Worker deploys independently using Wrangler. No DNS route, custom domain, Vercel configuration, or website source deployment is required.

## Failure Handling

Each scheduled invocation makes one request. A non-2xx website response throws so the Cloudflare Worker execution is visible in Worker logs. The website endpoints retain their existing structured error handling and database sync logs.

## Testing

Unit tests verify that each configured cron expression selects the intended endpoint, requests use the secret bearer header, and failed responses surface an error. Project-wide tests and `pnpm build` remain required before commit.
