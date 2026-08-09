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

const environmentWithoutAttestations = () => {
  const environment = { ...process.env };
  delete environment.CMS_RELEASE_CREDENTIALS_ROTATED;
  delete environment.CMS_RELEASE_HISTORY_CLEANUP_APPROVED;
  return environment;
};

describe("CMS production release gate", () => {
  it("rejects a release without both owner attestations", () => {
    expect(() => runGate(environmentWithoutAttestations())).toThrow();
    expect(() =>
      runGate({
        ...environmentWithoutAttestations(),
        CMS_RELEASE_CREDENTIALS_ROTATED: "confirmed",
      }),
    ).toThrow();
  });

  it("allows migration only after both owner attestations", () => {
    expect(
      runGate({
        ...process.env,
        CMS_RELEASE_CREDENTIALS_ROTATED: "confirmed",
        CMS_RELEASE_HISTORY_CLEANUP_APPROVED: "confirmed",
      }),
    ).toContain("CMS release gate passed");
  });
});
