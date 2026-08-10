import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/storefront.css", import.meta.url), "utf8");

describe("storefront visual system", () => {
  it("defines the approved dark tokens", () => {
    expect(css).toContain("--store-bg:#07080c");
    expect(css).toContain("--store-surface:#111318");
    expect(css).toContain("--store-accent:#e93b43");
    expect(css).toContain("--store-text:#f7f7f8");
  });

  it("keeps controls accessible and motion optional", () => {
    expect(css).toMatch(/min-(?:height|width):44px/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (max-width:1024px)");
    expect(css).toContain("@media (max-width:760px)");
    expect(css).toContain("@media (prefers-reduced-motion:reduce)");
  });
});
