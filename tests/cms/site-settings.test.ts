import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SITE_SETTINGS,
  normalizeSiteSettings,
} from "../../lib/cms/site-settings";
import { getPublishedSiteSettings } from "../../lib/cms/site-settings-reader";
import {
  down as downSiteSettings,
  up as upSiteSettings,
} from "../../cms/migrations/20260809_060000_task9_site_settings";

function renderMigrationSql(query: unknown): string {
  const chunks = (query as { queryChunks?: unknown[] }).queryChunks;
  if (!Array.isArray(chunks)) throw new Error("Expected a Drizzle SQL query");
  return chunks.flatMap((chunk) => {
    if (typeof chunk === "string") return [chunk];
    if (!chunk || typeof chunk !== "object" || !("value" in chunk)) return [];
    const value = (chunk as { value: unknown }).value;
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }).join("");
}

async function migrationSql(migration: typeof upSiteSettings): Promise<string> {
  const executed: string[] = [];
  await migration({
    db: { execute: async (query: unknown) => { executed.push(renderMigrationSql(query)); } },
  } as never);
  return executed.join("\n");
}

describe("site settings", () => {
  it("keeps the required legal structure and defaults when CMS values are incomplete", () => {
    const settings = normalizeSiteSettings({
      legal: { sellerName: "", responsiblePerson: "" },
      contact: { email: "invalid", phone: "" },
    });

    expect(settings.legal.sellerName).toBe("アジャズジャパン株式会社");
    expect(settings.legal.responsiblePerson).toBe("代表取締役社長 謝天");
    expect(settings.contact.email).toBe("xiet@a-jazz.com");
    expect(settings.contact.phone).toBe("070-9319-5121");
    expect(Object.keys(settings.legal)).toEqual(Object.keys(DEFAULT_SITE_SETTINGS.legal));
  });

  it("rejects arbitrary routes, unsafe links, and presentation controls", () => {
    const settings = normalizeSiteSettings({
      footer: {
        navigation: [
          { label: "会社情報", href: "/about" },
          { label: "管理画面", href: "/admin" },
          { label: "危険", href: "javascript:alert(1)" },
        ],
      },
      socialLinks: [
        { label: "AJAZZ", href: "https://example.com/ajazz" },
        { label: "メール", href: "mailto:support@a-jazz.com" },
        { label: "危険", href: "data:text/html,bad" },
      ],
      className: "replace-layout",
      fontName: "Comic Sans",
      html: "<script>alert(1)</script>",
    });

    expect(settings.footer.navigation).toEqual([{ label: "会社情報", href: "/about" }]);
    expect(settings.socialLinks).toEqual([
      { label: "AJAZZ", href: "https://example.com/ajazz" },
      { label: "メール", href: "mailto:support@a-jazz.com" },
    ]);
    expect(settings).not.toHaveProperty("className");
    expect(settings).not.toHaveProperty("fontName");
    expect(settings).not.toHaveProperty("html");
  });

  it("rejects HTML inside recognized text fields during normalization and CMS writes", async () => {
    const settings = normalizeSiteSettings({
      homepage: { title: "<script>alert(1)</script>" },
      company: { brand: { paragraphs: [{ text: "<strong>unsafe</strong>" }] } },
    });
    expect(settings.homepage.title).toBe(DEFAULT_SITE_SETTINGS.homepage.title);
    expect(settings.company.brand.paragraphs).toEqual(DEFAULT_SITE_SETTINGS.company.brand.paragraphs);

    const { SiteSettings } = await import("../../cms/globals/SiteSettings");
    const validate = SiteSettings.hooks?.beforeValidate?.[0];
    expect(validate).toBeTypeOf("function");
    expect(() => validate?.({
      data: { homepage: { title: "<script>alert(1)</script>" } },
      req: {},
    } as never)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("reads only the published global and normalizes it", async () => {
    const findGlobal = vi.fn().mockResolvedValueOnce({
      contact: { email: "support@a-jazz.com" },
      legal: { sellerName: "AJAZZ JAPAN" },
    });

    const settings = await getPublishedSiteSettings({ loadPayload: async () => ({ findGlobal }) });

    expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({
      depth: 1,
      draft: false,
      overrideAccess: true,
      slug: "site-settings",
    }));
    expect(settings.contact.email).toBe("support@a-jazz.com");
    expect(settings.legal.sellerName).toBe("AJAZZ JAPAN");
    expect(settings.legal.responsiblePerson).toBe("代表取締役社長 謝天");
  });

  it("falls back to safe defaults when Payload is unavailable", async () => {
    await expect(getPublishedSiteSettings({
      loadPayload: async () => { throw new Error("database unavailable"); },
    })).resolves.toEqual(DEFAULT_SITE_SETTINGS);
  });

  it("registers a versioned administrator-only site settings global", async () => {
    const [{ SiteSettings }, { default: configPromise }] = await Promise.all([
      import("../../cms/globals/SiteSettings"),
      import("../../payload.config"),
    ]);
    const config = await configPromise;

    expect(SiteSettings.slug).toBe("site-settings");
    expect(typeof SiteSettings.versions === "object" && SiteSettings.versions.drafts).toBeTruthy();
    expect(SiteSettings.access?.read?.({ req: {} } as never)).toBe(false);
    expect(SiteSettings.access?.read?.({ req: { user: { id: 1 } } } as never)).toBe(true);
    expect(config.globals?.map((global) => global.slug)).toContain("site-settings");
    expect(SiteSettings.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "homepage" }),
      expect.objectContaining({ name: "company" }),
      expect.objectContaining({ name: "contact" }),
      expect.objectContaining({ name: "footer" }),
      expect.objectContaining({ name: "socialLinks" }),
      expect.objectContaining({ name: "legal" }),
    ]));
  }, 15_000);

  it("migrates only the new CMS site settings objects", async () => {
    const [upSql, downSql] = await Promise.all([
      migrationSql(upSiteSettings),
      migrationSql(downSiteSettings),
    ]);

    expect(upSql).toContain('CREATE TABLE "cms"."site_settings"');
    expect(upSql).toContain('REFERENCES "cms"."media"("id")');
    expect(upSql).not.toMatch(/ALTER TABLE "cms"\."products"/);
    expect(upSql).not.toMatch(/ALTER TABLE "cms"\."_products_v"/);
    expect(downSql).not.toContain('DROP SCHEMA "cms"');
    expect(downSql).not.toMatch(/DROP TABLE "cms"\."(?:products|media|admins)"/);
  });
});
