# Remove Survey From The Storefront

## Goal

Remove the survey feature from the new AJAZZ JAPAN storefront while preserving
the order administration workflows needed for manual fulfillment, refunds, and
order exports. The legacy survey deployment and its database are out of scope.

## Scope

- Delete public survey pages, survey API routes, survey exports, survey data
  helpers, and survey-only styling.
- Remove survey links from storefront navigation and remove survey URLs from
  the sitemap and robots configuration.
- Replace the order-admin dependency on survey authentication with a dedicated
  admin-auth module.
- Rename production configuration from `SURVEY_ADMIN_PASSWORD` and
  `SURVEY_ADMIN_SECRET` to `ADMIN_PASSWORD` and `ADMIN_SECRET`.
- Update environment documentation and tests.

## Behaviour

- `/survey`, `/survey/thanks`, `/survey/admin`, and all `/api/survey/*` routes
  no longer exist and return Next.js 404 responses.
- `/admin/orders` and its order-management APIs remain password protected.
- A valid admin session is created only with `ADMIN_PASSWORD` and signed with
  `ADMIN_SECRET`, which must be at least 32 characters.
- Existing survey cookies are not accepted by the new order administration
  authentication.

## Verification

- Add tests proving survey routes are absent from application route files and
  sitemap data.
- Add tests proving order administration uses the new admin configuration and
  rejects absent or invalid credentials.
- Run the full test suite and production build before deployment.
