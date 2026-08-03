import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("AJAZZ JAPAN header logo", () => {
  it("shows the complete logo artwork instead of enlarging and clipping it", () => {
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

    expect(css).not.toContain("transform:scale(1.6)");
    expect(css).toMatch(/\.store-brand\s*\{[^}]*aspect-ratio:400\/147/);
    expect(css).toMatch(/\.store-brand img\s*\{[^}]*position:absolute/);
  });
});
