import { describe, expect, it } from "vitest";
import { resolveRmsImportArguments } from "../../scripts/import-rms-catalog-cli";
import { destroyPayload, withPayloadCleanup } from "../../scripts/import-rms-catalog";

describe("RMS import CLI", () => {
  it("accepts one workbook path and an optional dry-run flag", () => {
    expect(resolveRmsImportArguments(["C:/exports/catalog.xlsx"])).toEqual({ filePath: "C:/exports/catalog.xlsx", dryRun: false });
    expect(resolveRmsImportArguments(["--dry-run", "C:/exports/catalog.xlsx"])).toEqual({ filePath: "C:/exports/catalog.xlsx", dryRun: true });
    expect(() => resolveRmsImportArguments([])).toThrow("Usage");
    expect(() => resolveRmsImportArguments(["one.xlsx", "two.xlsx"])).toThrow("Usage");
  });

  it("closes Payload after a completed import", async () => {
    let destroyed = false;

    await expect(withPayloadCleanup(
      async () => 43,
      async () => { destroyed = true; },
    )).resolves.toBe(43);
    expect(destroyed).toBe(true);
  });

  it("closes Payload after a failed import", async () => {
    let destroyed = false;

    await expect(withPayloadCleanup(
      async () => { throw new Error("import failed"); },
      async () => { destroyed = true; },
    )).rejects.toThrow("import failed");
    expect(destroyed).toBe(true);
  });

  it("closes the PostgreSQL pool after destroying Payload", async () => {
    const calls: string[] = [];

    await destroyPayload({
      destroy: async () => { calls.push("payload"); },
      db: { pool: { end: async () => { calls.push("pool"); } } },
    });

    expect(calls).toEqual(["payload", "pool"]);
  });
});
