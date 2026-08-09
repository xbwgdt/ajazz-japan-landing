const environment = process.env.CMS_DEPLOYMENT_ENV;
const railwayEnvironment = process.env.RAILWAY_ENVIRONMENT_NAME;

const fail = (message) => {
  console.error(`CMS release blocked: ${message}`);
  process.exit(1);
};

const requireExact = (name, expected) => {
  if (process.env[name] !== expected) {
    fail(`${name} must equal ${expected}`);
  }
};

if (environment === "production") {
  requireExact("RAILWAY_ENVIRONMENT_NAME", "production");
  requireExact("CMS_RELEASE_CREDENTIALS_ROTATED", "confirmed");
  requireExact("CMS_RELEASE_HISTORY_CLEANUP_APPROVED", "confirmed");
  console.log("CMS production release gate passed; schema migration may proceed.");
} else if (environment === "staging") {
  requireExact("RAILWAY_ENVIRONMENT_NAME", "staging");
  requireExact("CMS_STAGING_ISOLATION_CONFIRMED", "confirmed");
  requireExact("RMS_SYNC_ENABLED", "false");

  if (process.env.R2_BUCKET !== "ajazz-japan-media-staging") {
    fail("R2_BUCKET must identify a staging bucket");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL === "https://ajazz.jp") {
    fail("staging cannot use the production site URL");
  }
  if (process.env.R2_PUBLIC_URL === "https://media.ajazz.jp") {
    fail("staging cannot use the production media URL");
  }
  if (
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")
  ) {
    fail("staging accepts Stripe test mode only");
  }
  console.log("CMS staging release gate passed; schema migration may proceed.");
} else if (environment === "local") {
  if (railwayEnvironment) {
    fail("Railway cannot deploy with CMS_DEPLOYMENT_ENV=local");
  }
  console.log("CMS local environment accepted.");
} else {
  fail("CMS_DEPLOYMENT_ENV must be production, staging, or local");
}
