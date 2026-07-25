import { describe, expect, it } from "vitest";
import { resolveRmsWorkbookPath } from "../../scripts/import-rms-catalog-cli";

describe("RMS import CLI", () => {
  it("accepts exactly one workbook path", () => {
    expect(resolveRmsWorkbookPath(["C:/exports/catalog.xlsx"])).toBe("C:/exports/catalog.xlsx");
    expect(() => resolveRmsWorkbookPath([])).toThrow("Usage");
    expect(() => resolveRmsWorkbookPath(["one.xlsx", "two.xlsx"])).toThrow("Usage");
  });
});
