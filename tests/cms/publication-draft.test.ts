import { describe, expect, it, vi } from "vitest";
import { buildPublicationDraft } from "../../lib/cms/publication-route";

function text(value: string) {
  return { detail: 0, format: 0, mode: "normal", style: "", text: value, type: "text", version: 1 };
}

describe("publication draft conversion", () => {
  it("resolves color media in order, deduplicates IDs and rejects retired gallery media", async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn(async ({ id }: { id: string }) => ({ id, url: `/api/cms/media/file/${id}.jpg` })),
    };
    const product = { id: 7, galleryMode: "color", variants: [{ id: "green", imageId: 2, galleryImageIds: [2, 3, 2] }] };
    const result = await buildPublicationDraft(payload as never, product);
    expect(result.galleryMode).toBe("color");
    expect(result.variants[0].images).toEqual([
      { mediaId: "2", position: 0, url: "/api/cms/media/file/2.jpg" },
      { mediaId: "3", position: 1, url: "/api/cms/media/file/3.jpg" },
    ]);
    payload.findByID.mockResolvedValueOnce({ id: "2", url: "" });
    await expect(buildPublicationDraft(payload as never, product)).rejects.toThrow(/publishable/);
  });

  it("preserves Lexical headings, lists, and links as structured HTML", async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn().mockResolvedValue({ id: 1, retiredAt: null, url: "/api/media/hero.jpg" }),
    };
    const description = {
      root: {
        children: [
          { children: [text("Gaming keyboard")], direction: null, format: "", indent: 0, tag: "h2", type: "heading", version: 1 },
          { children: [
            { children: [text("Rapid trigger")], direction: null, format: "", indent: 0, type: "listitem", value: 1, version: 1 },
          ], direction: null, format: "", indent: 0, listType: "bullet", start: 1, tag: "ul", type: "list", version: 1 },
          { children: [
            { children: [text("Driver")], direction: null, fields: { linkType: "custom", newTab: true, url: "https://www.a-jazz.com/" }, format: "", indent: 0, type: "link", version: 3 },
          ], direction: null, format: "", indent: 0, textFormat: 0, textStyle: "", type: "paragraph", version: 1 },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    };

    const result = await buildPublicationDraft(payload as never, {
      id: 7,
      category: "mechanical-keyboard",
      description,
      lifecycle: "unpublished",
      name: "AK820",
      primaryImageId: 1,
      slug: "ak820",
      sourceType: "manual",
      variants: [],
    });

    expect(result.descriptionHtml).toContain("<h2>Gaming keyboard</h2>");
    expect(result.descriptionHtml).toMatch(/<ul[^>]*>/);
    expect(result.descriptionHtml).toMatch(/<li[\s\S]*?>Rapid trigger<\/li>/);
    expect(result.descriptionHtml).toContain('href="https://www.a-jazz.com/"');
  });
});
