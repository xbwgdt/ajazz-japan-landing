import { APIError } from "payload";
import { describe, expect, it, vi } from "vitest";
import { rejectRetiredMediaReferences } from "../../cms/hooks/rejectRetiredMediaReferences";

describe("retired media product reference protection", () => {
  it("inspects every current product and variant media field", async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 6, retiredAt: "2026-08-08T03:00:00.000Z" }],
    });

    await expect(rejectRetiredMediaReferences({
      context: {},
      data: {
        galleryImageIds: [2],
        primaryImageId: 1,
        sceneImageIds: [{ id: 3 }],
        seoImageId: 4,
        variants: [{ imageId: { id: 6 }, thumbnailId: 5 }],
      },
      operation: "create",
      originalDoc: undefined,
      req: { payload: { find } },
    } as never)).rejects.toMatchObject({
      status: 400,
    });

    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      collection: "media",
      depth: 0,
      overrideAccess: true,
      where: {
        and: [
          { id: { in: [1, 2, 3, 4, 5, 6] } },
          { retiredAt: { exists: true } },
        ],
      },
    }));
  });

  it("checks retained media values during a partial product update", async () => {
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 7, retiredAt: "2026-08-08T03:00:00.000Z" }] });

    try {
      await rejectRetiredMediaReferences({
        context: {},
        data: { name: "Metadata only" },
        operation: "update",
        originalDoc: { id: 10, primaryImageId: 7 },
        req: { payload: { find } },
      } as never);
      throw new Error("Expected retired media rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(APIError);
      expect((error as APIError).data).toMatchObject({
        code: "retired_media_reference",
        mediaIds: [7],
      });
    }
  });

  it("allows a partial update to clear a retired media relationship", async () => {
    const find = vi.fn();

    await expect(rejectRetiredMediaReferences({
      context: {},
      data: { primaryImageId: null },
      operation: "update",
      originalDoc: { id: 10, primaryImageId: 7 },
      req: { payload: { find } },
    } as never)).resolves.toMatchObject({ primaryImageId: null });

    expect(find).not.toHaveBeenCalled();
  });

  it("is wired immediately after source protection in Products", async () => {
    const { Products } = await import("../../cms/collections/Products");
    expect(Products.hooks?.beforeChange?.[1]).toBe(rejectRetiredMediaReferences);
  });
});
