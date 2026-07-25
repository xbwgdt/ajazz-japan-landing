import { describe, expect, it } from "vitest";
import { resolveRmsImportArguments } from "../../scripts/import-rms-catalog-cli";

describe("RMS import CLI", () => {
  it("accepts one workbook path and an optional dry-run flag", () => {
    expect(resolveRmsImportArguments(["C:/exports/catalog.xlsx"])).toEqual({ filePath: "C:/exports/catalog.xlsx", dryRun: false });
    expect(resolveRmsImportArguments(["--dry-run", "C:/exports/catalog.xlsx"])).toEqual({ filePath: "C:/exports/catalog.xlsx", dryRun: true });
    expect(() => resolveRmsImportArguments([])).toThrow("Usage");
    expect(() => resolveRmsImportArguments(["one.xlsx", "two.xlsx"])).toThrow("Usage");
  });
});
