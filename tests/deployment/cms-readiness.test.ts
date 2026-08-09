import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readDocument = (path: string) =>
  existsSync(path) ? readFileSync(path, "utf8") : "";

describe("CMS production readiness", () => {
  it("documents CMS and R2 production variables without legacy admin secrets", () => {
    const readme = readDocument(resolve(process.cwd(), "README.md"));
    const runbook = readDocument(
      resolve(process.cwd(), "docs/operations/product-admin-cms.md"),
    );
    const documentedVariables = `${readme}\n${runbook}`;

    expect(documentedVariables).toContain("PAYLOAD_SECRET");
    expect(documentedVariables).toContain("R2_BUCKET");
    expect(documentedVariables).toContain("R2_ACCESS_KEY_ID");
    expect(documentedVariables).toContain("R2_SECRET_ACCESS_KEY");
    expect(documentedVariables).toContain("R2_ENDPOINT");
    expect(documentedVariables).toContain("R2_PUBLIC_URL");
    expect(documentedVariables).not.toMatch(/^ADMIN_PASSWORD=/m);
    expect(documentedVariables).not.toMatch(/^ADMIN_SECRET=/m);

    const requiredConfiguration = readme.split("## CMS production release")[0];
    expect(requiredConfiguration).not.toContain("BOOTSTRAP_ADMIN_PASSWORD=");
  });

  it("blocks deployment until the documented release gate is complete", () => {
    const runbook = readDocument(
      resolve(process.cwd(), "docs/operations/product-admin-cms.md"),
    );
    const railway = JSON.parse(
      readDocument(resolve(process.cwd(), "railway.json")),
    );

    expect(runbook).toContain("Rotate every previously exposed Stripe, RMS, database, cron, and administrator secret.");
    expect(runbook).toContain("Obtain explicit approval before Git history cleanup; verify the rewritten fork contains no exposed value.");
    expect(runbook).toContain("Remove `BOOTSTRAP_ADMIN_PASSWORD` immediately after account creation.");
    expect(runbook).toContain("Production remains blocked until credential rotation and approved Git-history cleanup are complete.");
    expect(railway.deploy.preDeployCommand).toBe(
      "pnpm cms:release:check && pnpm cms:migrate",
    );
    expect(railway.deploy.startCommand).toBe("HOSTNAME=0.0.0.0 pnpm start");
  });

  it("prescribes the complete release sequence, reconciliation, R2 verification, and rollback", () => {
    const runbook = readDocument(
      resolve(process.cwd(), "docs/operations/product-admin-cms.md"),
    );

    for (const expected of [
      "Create `media.ajazz.jp`, private R2 write credentials, and public read-only delivery.",
      "Back up Railway PostgreSQL and rehearse Payload migrations on a disposable restored database.",
      "pnpm cms:migrate",
      "pnpm cms:bootstrap-admin",
      "pnpm cms:migrate-catalog -- --json",
      "pnpm cms:migrate-catalog -- --apply --json",
      "pnpm cms:migrate-catalog -- --reconcile --json",
      "Deploy the application, then the updated Cloudflare Cron Worker.",
      "Switch traffic only after all acceptance checks pass; rollback by restoring the previous Railway deployment without dropping either database schema.",
      "Browser acceptance: pending; no screenshots have been captured for this documentation-only task.",
      "media.ajazz.jp",
    ]) {
      expect(runbook).toContain(expected);
    }

    const releaseOrder = runbook.match(
      /## Release order[\s\S]*?(?=\n## Pre-production rehearsal)/,
    )?.[0];
    expect(releaseOrder).toBeTruthy();

    const numberedSteps = [...(releaseOrder ?? "").matchAll(/^(\d+)\. (.+)$/gm)];
    expect(numberedSteps.map((match) => Number(match[1]))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    expect(numberedSteps.map((match) => match[2])).toEqual([
      "Rotate every previously exposed Stripe, RMS, database, cron, and administrator secret.",
      "Obtain explicit approval before Git history cleanup; verify the rewritten fork contains no exposed value.",
      "Create `media.ajazz.jp`, private R2 write credentials, and public read-only delivery.",
      "Add Payload and R2 variables to Railway; set bootstrap variables only for the bootstrap command.",
      "Back up Railway PostgreSQL and rehearse Payload migrations on a disposable restored database.",
      "Run `pnpm cms:migrate`, `pnpm cms:bootstrap-admin`, catalog dry run, catalog apply, and reconciliation.",
      "Remove `BOOTSTRAP_ADMIN_PASSWORD` immediately after account creation.",
      "Deploy the application, then the updated Cloudflare Cron Worker.",
      "Verify administrator login, RMS sync, media upload, preview, publication, storefront, checkout in Stripe test mode, order export, shipment, refund, archive, and restore.",
      "Switch traffic only after all acceptance checks pass; rollback by restoring the previous Railway deployment without dropping either database schema.",
    ]);
  });
});
