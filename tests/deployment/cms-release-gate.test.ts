import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const script = resolve(process.cwd(), "scripts/verify-cms-release-gate.mjs");

const runGate = (environment: NodeJS.ProcessEnv) =>
  execFileSync(process.execPath, [script], {
    encoding: "utf8",
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });

const controlledEnvironment = () => {
  const environment = { ...process.env };
  for (const key of [
    "CMS_DEPLOYMENT_ENV",
    "CMS_RELEASE_CREDENTIALS_ROTATED",
    "CMS_RELEASE_HISTORY_CLEANUP_APPROVED",
    "CMS_STAGING_ISOLATION_CONFIRMED",
    "NEXT_PUBLIC_SITE_URL",
    "RAILWAY_ENVIRONMENT_NAME",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
    "RMS_SYNC_ENABLED",
    "STRIPE_SECRET_KEY",
  ]) {
    delete environment[key];
  }
  return environment;
};

describe("CMS release gate", () => {
  it("allows production only after both production attestations", () => {
    expect(() =>
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "production",
      }),
    ).toThrow();

    expect(() =>
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "production",
        CMS_RELEASE_CREDENTIALS_ROTATED: "confirmed",
      }),
    ).toThrow();

    expect(
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "production",
        RAILWAY_ENVIRONMENT_NAME: "production",
        CMS_RELEASE_CREDENTIALS_ROTATED: "confirmed",
        CMS_RELEASE_HISTORY_CLEANUP_APPROVED: "confirmed",
      }),
    ).toContain("production release gate passed");
  });

  it("allows an isolated staging environment", () => {
    expect(
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "staging",
        RAILWAY_ENVIRONMENT_NAME: "staging",
        CMS_STAGING_ISOLATION_CONFIRMED: "confirmed",
        NEXT_PUBLIC_SITE_URL: "https://ajazz-staging.up.railway.app",
        R2_BUCKET: "ajazz-japan-media-staging",
        RMS_SYNC_ENABLED: "false",
        STRIPE_SECRET_KEY: "sk_test_staging_value",
      }),
    ).toContain("staging release gate passed");
  });

  it.each([
    ["live Stripe key", { STRIPE_SECRET_KEY: "sk_live_staging_value" }],
    ["production site URL", { NEXT_PUBLIC_SITE_URL: "https://ajazz.jp" }],
    ["production media URL", { R2_PUBLIC_URL: "https://media.ajazz.jp" }],
    ["non-staging bucket", { R2_BUCKET: "ajazz-japan-media" }],
    ["enabled RMS sync", { RMS_SYNC_ENABLED: "true" }],
    ["mismatched Railway environment", { RAILWAY_ENVIRONMENT_NAME: "production" }],
  ])("rejects staging with %s", (_name, overrides) => {
    expect(() =>
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "staging",
        RAILWAY_ENVIRONMENT_NAME: "staging",
        CMS_STAGING_ISOLATION_CONFIRMED: "confirmed",
        NEXT_PUBLIC_SITE_URL: "https://ajazz-staging.up.railway.app",
        R2_BUCKET: "ajazz-japan-media-staging",
        RMS_SYNC_ENABLED: "false",
        STRIPE_SECRET_KEY: "sk_test_staging_value",
        ...overrides,
      }),
    ).toThrow();
  });

  it("rejects a Railway deployment classified as local", () => {
    expect(() =>
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "local",
        RAILWAY_ENVIRONMENT_NAME: "local",
      }),
    ).toThrow();
  });

  it("accepts a local environment without a Railway environment", () => {
    expect(
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "local",
      }),
    ).toContain("CMS local environment accepted");
  });

  it.each([undefined, "qa"]) (
    "rejects missing or unknown environment classification: %s",
    (environment) => {
      const variables = controlledEnvironment();
      if (environment !== undefined) {
        variables.CMS_DEPLOYMENT_ENV = environment;
      }
      expect(() => runGate(variables)).toThrow();
    },
  );

  it("does not expose secret values in gate errors", () => {
    const secret = "sk_live_secret_value";
    try {
      runGate({
        ...controlledEnvironment(),
        CMS_DEPLOYMENT_ENV: "staging",
        RAILWAY_ENVIRONMENT_NAME: "staging",
        CMS_STAGING_ISOLATION_CONFIRMED: "confirmed",
        R2_BUCKET: "ajazz-japan-media-staging",
        RMS_SYNC_ENABLED: "false",
        STRIPE_SECRET_KEY: secret,
      });
    } catch (error) {
      expect(String(error)).not.toContain(secret);
      return;
    }
    throw new Error("Expected the staging gate to reject the live Stripe key");
  });
});
