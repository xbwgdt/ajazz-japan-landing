type DeploymentEnvironment = Record<string, string | undefined>;

export function assertStripeEnvironmentSafety(environment: DeploymentEnvironment) {
  if (environment.CMS_DEPLOYMENT_ENV !== "staging") return;

  const secretKey = environment.STRIPE_SECRET_KEY;
  if (secretKey && !secretKey.startsWith("sk_test_")) {
    throw new Error("Staging permits Stripe test mode only");
  }
}

export function assertR2EnvironmentSafety(environment: DeploymentEnvironment) {
  if (environment.CMS_DEPLOYMENT_ENV !== "staging") return;

  if (environment.R2_BUCKET !== "ajazz-japan-media-staging") {
    throw new Error("Staging R2 bucket is not isolated");
  }
  if (isProductionR2MediaUrl(environment.R2_PUBLIC_URL)) {
    throw new Error("Staging R2 cannot use the production media URL");
  }
}

export function isRmsSyncEnabled(environment: DeploymentEnvironment) {
  return environment.RMS_SYNC_ENABLED !== "false";
}

function isProductionR2MediaUrl(publicUrl: string | undefined) {
  if (!publicUrl) return false;

  try {
    return new URL(publicUrl).hostname.toLowerCase().replace(/\.$/, "") === "media.ajazz.jp";
  } catch {
    return false;
  }
}
