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

describe("AJAZZ JAPAN catalogue discovery controls", () => {
  it("keeps the responsive control strip contained and exposes selected and focus states", () => {
    const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

    expect(css).toMatch(/\.store-catalogue-controls\s*\{[^}]*grid-template-areas:/);
    expect(css).toMatch(/\.store-catalogue-controls\s*\[role="group"\]\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.store-catalogue-controls\s*\[role="group"\]\s*button\[aria-pressed="true"\]\s*\{[^}]*background:\s*var\(--aj-red\)/);
    expect(css).toMatch(/\.store-catalogue-controls\s*button:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--aj-red\)/);
    expect(css).toMatch(/@media \(max-width:760px\)\s*\{[\s\S]*?\.store-catalogue-controls\s*\{[^}]*grid-template-areas:/);
  });
});
