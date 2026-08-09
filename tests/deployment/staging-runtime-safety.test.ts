import { describe, expect, it } from "vitest";
import {
  assertR2EnvironmentSafety,
  assertStripeEnvironmentSafety,
  isRmsSyncEnabled,
} from "../../lib/deployment/staging-safety";

describe("staging runtime safety", () => {
  it("rejects live Stripe and production R2 in staging without exposing credentials", () => {
    const liveKey = "sk_live_forbidden";

    expect(() => assertStripeEnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      STRIPE_SECRET_KEY: liveKey,
    })).toThrow("Stripe test mode");

    try {
      assertStripeEnvironmentSafety({
        CMS_DEPLOYMENT_ENV: "staging",
        STRIPE_SECRET_KEY: liveKey,
      });
    } catch (error) {
      expect(String(error)).not.toContain(liveKey);
    }

    expect(() => assertR2EnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      R2_BUCKET: "ajazz-japan-media",
      R2_PUBLIC_URL: "https://media.ajazz.jp",
    })).toThrow("Staging R2");
  });

  it("accepts staging test resources and disables RMS only on exact false", () => {
    expect(() => assertStripeEnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      STRIPE_SECRET_KEY: "sk_test_allowed",
    })).not.toThrow();
    expect(() => assertStripeEnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
    })).not.toThrow();
    expect(() => assertR2EnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      R2_BUCKET: "ajazz-japan-media-staging",
    })).not.toThrow();
    expect(isRmsSyncEnabled({ RMS_SYNC_ENABLED: "false" })).toBe(false);
    expect(isRmsSyncEnabled({ RMS_SYNC_ENABLED: "true" })).toBe(true);
    expect(isRmsSyncEnabled({ RMS_SYNC_ENABLED: "False" })).toBe(true);
  });

  it("rejects normalized production R2 media hostnames in staging", () => {
    for (const publicUrl of [
      "https://media.ajazz.jp/",
      "https://MEDIA.AJAZZ.JP/path?preview=1",
      "https://media.ajazz.jp.",
    ]) {
      expect(() => assertR2EnvironmentSafety({
        CMS_DEPLOYMENT_ENV: "staging",
        R2_BUCKET: "ajazz-japan-media-staging",
        R2_PUBLIC_URL: publicUrl,
      })).toThrow("Staging R2");
    }

    expect(() => assertR2EnvironmentSafety({
      CMS_DEPLOYMENT_ENV: "staging",
      R2_BUCKET: "ajazz-japan-media-staging",
      R2_PUBLIC_URL: "not a production URL",
    })).not.toThrow();
  });
});
