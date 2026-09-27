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
  it("refuses uploads when all product images are ranking posters", async () => {
    const client = payload({ sourceSnapshot: { images: ["https://image.rakuten.co.jp/ajazz/cabinet/tj/r-img_rr/1/model.jpg"], variants: [] } });
    const uploadImage = vi.fn();
    await expect(hydrateRmsProductMedia({ apply: true, confirmation: "AJAZZ_RMS_MEDIA_2026",
      draftSaveContext: {}, sourceIngestionContext: {}, payload: client,
      rmsManageNumber: "model", uploadImage })).rejects.toThrow("no eligible product images");
    expect(uploadImage).not.toHaveBeenCalled();
    expect(client.update).not.toHaveBeenCalled();
  });

  it.each([false, true])("excludes ranking images from every image role (apply=%s)", async (apply) => {
    const ranking = "https://image.rakuten.co.jp/ajazz/cabinet/tj/r-img_rr/1/model.jpg";
    const client = payload({ sourceSnapshot: {
      images: [ranking, "https://example.test/main.jpg"],
      variants: [{ operationalVariantId: 11, rmsSkuNumber: "BLUE", imageUrl: ranking }],
    } });
    const uploadImage = vi.fn(async () => "safe-media");
    const result = await hydrateRmsProductMedia({ apply, confirmation: "AJAZZ_RMS_MEDIA_2026",
      draftSaveContext: {}, sourceIngestionContext: {}, payload: client,
      rmsManageNumber: "model", uploadImage });
    expect(result.urls).toEqual(["https://example.test/main.jpg"]);
    expect(result.excludedUrls).toEqual([ranking]);
    if (apply) {
      expect(uploadImage).toHaveBeenCalledTimes(1);
      expect(client.update).toHaveBeenCalledWith(expect.objectContaining({ data: {
        primaryImageId: "safe-media", galleryImageIds: [],
        variants: [expect.not.objectContaining({ imageId: expect.anything() })],
      } }));
    }
  });

  it("is read-only by default and reports unique source images", async () => {
    const client = payload();
    const uploadImage = vi.fn();
    const result = await hydrateRmsProductMedia({
      apply: false,
      draftSaveContext: {},
      sourceIngestionContext: {},
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
      sourceIngestionContext: { sourceIngestion: true },
      payload: client,
      rmsManageNumber: "ak820v2-rt",
      uploadImage,
    });
    expect(result.applied).toBe(true);
    expect(client.update).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({ expectedRevision: 2, draftSave: true, sourceIngestion: true }),
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
      sourceIngestionContext: {},
      payload: client,
      rmsManageNumber: "ak820v2-rt",
      uploadImage: vi.fn(),
    })).rejects.toThrow("Refusing to overwrite");
  });
});
