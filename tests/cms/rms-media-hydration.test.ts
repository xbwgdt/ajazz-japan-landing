import { describe, expect, it, vi } from "vitest";
import { hydrateRmsProductMedia } from "../../scripts/hydrate-rms-product-media";

function payload(productOverrides: Record<string, unknown> = {}) {
  const product = {
    id: 28,
    _status: "draft",
    editorialRevision: 2,
    sourceType: "rms",
    name: "AK820 V2 RT",
    sourceSnapshot: {
      images: ["https://example.test/main.jpg", "https://example.test/gallery.jpg"],
      variants: [{ operationalVariantId: 11, rmsSkuNumber: "BLUE", imageUrl: "https://example.test/blue.jpg" }],
    },
    variants: [{ id: "variant-1", operationalVariantId: "11", rmsSkuNumber: "BLUE", sku: "BLUE" }],
    ...productOverrides,
  };
  const find = vi.fn(async (args: Record<string, unknown>) => (
    args.collection === "admins" ? { docs: [{ id: 1, email: "xiet@a-jazz.com" }] } : { docs: [product] }
  ));
  return { create: vi.fn(), find, update: vi.fn(async () => product) };
}

describe("RMS product media hydration", () => {
  it("is read-only by default and reports unique source images", async () => {
    const client = payload();
    const uploadImage = vi.fn();
    const result = await hydrateRmsProductMedia({
      apply: false,
      draftSaveContext: {},
      payload: client,
      rmsManageNumber: "ak820v2-rt",
      uploadImage,
    });
    expect(result).toMatchObject({ applied: false, cmsProductId: "28", imageCount: 3 });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(client.update).not.toHaveBeenCalled();
  });

  it("uploads and links product and variant images only with confirmation", async () => {
    const client = payload();
    const uploadImage = vi.fn(async (url: string) => `media:${url.split("/").at(-1)}`);
    const result = await hydrateRmsProductMedia({
      apply: true,
      confirmation: "AJAZZ_RMS_MEDIA_2026",
      draftSaveContext: { draftSave: true },
      payload: client,
      rmsManageNumber: "ak820v2-rt",
      uploadImage,
    });
    expect(result.applied).toBe(true);
    expect(client.update).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ expectedRevision: 2, draftSave: true }),
      data: expect.objectContaining({
        primaryImageId: "media:main.jpg",
        galleryImageIds: ["media:gallery.jpg"],
        variants: [expect.objectContaining({ thumbnailId: "media:blue.jpg", imageId: "media:blue.jpg" })],
      }),
    }));
  });

  it("refuses to overwrite any existing editorial media", async () => {
    const client = payload({ primaryImageId: 99 });
    await expect(hydrateRmsProductMedia({
      apply: false,
      draftSaveContext: {},
      payload: client,
      rmsManageNumber: "ak820v2-rt",
      uploadImage: vi.fn(),
    })).rejects.toThrow("Refusing to overwrite");
  });
});
