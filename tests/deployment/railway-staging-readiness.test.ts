import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readDocument = (path: string) =>
  existsSync(path) ? readFileSync(path, "utf8") : "";

const stagingVariables = (document: string) =>
  document.match(/## Staging \u53d8\u91cf\u6e05\u5355\uff08\u552f\u4e00\uff09[\s\S]*?```env\n([\s\S]*?)```/)?.[1] ?? "";

const hasProductionSiteUrl = (variables: string) =>
  variables.split(/\r?\n/).some((line) => {
    const value = line.match(/^NEXT_PUBLIC_SITE_URL=(.+)$/)?.[1];
    if (!value) return false;

    try {
      return new URL(value).hostname.toLowerCase().replace(/\.$/, "") === "ajazz.jp";
    } catch {
      return false;
    }
  });

describe("Railway staging documentation readiness", () => {
  it("documents the isolated staging environment and keeps its variable list safe", () => {
    const design = readDocument(
      resolve(process.cwd(), "docs/superpowers/plans/2026-08-09-railway-staging.md"),
    );
    const stagingRunbook = readDocument(
      resolve(process.cwd(), "docs/operations/railway-staging.md"),
    );
    const readme = readDocument(resolve(process.cwd(), "README.md"));
    const environmentExample = readDocument(resolve(process.cwd(), ".env.example"));
    const railway = JSON.parse(
      readDocument(resolve(process.cwd(), "railway.json")),
    );
    const documentation = `${design}\n${stagingRunbook}\n${readme}\n${environmentExample}`;

    expect(stagingRunbook).not.toBe("");
    expect(documentation).toContain("CMS_DEPLOYMENT_ENV=staging");
    expect(documentation).toContain("CMS_STAGING_ISOLATION_CONFIRMED=confirmed");
    expect(documentation).toContain("RMS_SYNC_ENABLED=false");
    expect(documentation).toContain("ajazz-japan-media-staging");
    expect(documentation).toContain("feat/ajazz-japan-store");
    expect(documentation).toContain("BOOTSTRAP_ADMIN_PASSWORD");
    expect(documentation).toContain("Stripe 测试模式");
    expect(documentation).toContain("私有 R2 Bucket");
    expect(railway.deploy.preDeployCommand).toBe(
      "pnpm cms:release:check && pnpm cms:migrate",
    );

    const variables = stagingVariables(stagingRunbook);
    expect(variables).not.toBe("");
    expect(variables).toContain("CMS_DEPLOYMENT_ENV=staging");
    expect(variables).toContain("CMS_STAGING_ISOLATION_CONFIRMED=confirmed");
    expect(variables).toContain("RMS_SYNC_ENABLED=false");
    expect(variables).toContain("R2_BUCKET=ajazz-japan-media-staging");
    expect(hasProductionSiteUrl(variables)).toBe(false);
    expect(variables).not.toMatch(/^STRIPE_SECRET_KEY=sk_live_/m);
    expect(variables).not.toContain("BOOTSTRAP_ADMIN_PASSWORD");
    expect(variables).not.toContain("RMS_SERVICE_SECRET");
    expect(variables).not.toContain("RMS_LICENSE_KEY");
    expect(variables).not.toContain("CMS_RELEASE_CREDENTIALS_ROTATED");
    expect(variables).not.toContain("CMS_RELEASE_HISTORY_CLEANUP_APPROVED");
  });
});
