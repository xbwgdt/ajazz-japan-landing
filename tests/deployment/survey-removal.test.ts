import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "../../app/sitemap";

describe("survey removal", () => {
  it("does not expose survey pages, APIs, or sitemap entries", () => {
    expect(existsSync(resolve(process.cwd(), "app/survey/page.tsx"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "app/api/survey/route.ts"))).toBe(false);
    expect(sitemap().some((entry) => entry.url.includes("/survey"))).toBe(false);
    expect(readFileSync(resolve(process.cwd(), "components/store/Storefront.tsx"), "utf8")).not.toContain('href="/survey"');
    expect(existsSync(resolve(process.cwd(), "proxy.ts"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "AjazzJapan_Survey_Sky开发指南.md"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "AjazzJapan_Survey_Sky开发指南.docx"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "AjazzJapan_Survey_合作开发文档.md"))).toBe(false);
    expect(existsSync(resolve(process.cwd(), "AjazzJapan_Survey_合作开发文档.docx"))).toBe(false);
  });
});
