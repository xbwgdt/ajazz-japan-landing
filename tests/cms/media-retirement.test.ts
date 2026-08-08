import { describe, expect, it, vi } from "vitest";
import {
  cleanupRetiredMedia,
  findMediaReferences,
  MediaReferencedError,
  retireMedia,
} from "../../cms/hooks/protectMediaReferences";

const now = new Date("2026-08-08T03:00:00.000Z");

function emptyResult() {
  return { docs: [], hasNextPage: false };
}

describe("media retirement", () => {
  it("finds references in current products, versions, variants, and site settings", async () => {
    const payload = {
      config: { globals: [{ slug: "site-settings" }] },
      find: vi.fn().mockResolvedValue({
        docs: [{
          id: 10,
          name: "AK820",
          primaryImageId: 7,
          variants: [{ id: "variant-1", imageId: { id: 7 } }],
        }],
        hasNextPage: false,
      }),
      findGlobal: vi.fn().mockResolvedValue({ id: 1, homeHeroImageId: 7 }),
      findVersions: vi.fn().mockResolvedValue({
        docs: [{ id: 22, parent: 10, version: { galleryImageIds: [7] } }],
        hasNextPage: false,
      }),
    };

    await expect(findMediaReferences(payload as never, 7)).resolves.toEqual([
      expect.objectContaining({ path: "primaryImageId", source: "product", sourceId: "10" }),
      expect.objectContaining({ path: "variants.0.imageId", source: "product", sourceId: "10" }),
      expect.objectContaining({ path: "galleryImageIds.0", source: "product-version", sourceId: "22" }),
      expect.objectContaining({ path: "homeHeroImageId", source: "site-settings", sourceId: "site-settings" }),
    ]);
  });

  it("returns references and leaves the record untouched when retirement is blocked", async () => {
    const payload = {
      config: { globals: [] },
      create: vi.fn(),
      find: vi.fn().mockResolvedValue({
        docs: [{ id: 10, name: "AK820", seoImageId: 7 }],
        hasNextPage: false,
      }),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn(),
    };

    await expect(retireMedia({ actorId: 3, mediaId: 7, now, payload: payload as never }))
      .rejects.toBeInstanceOf(MediaReferencedError);
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("schedules unreferenced media for deletion in 24 hours and audits the action", async () => {
    const payload = {
      config: { globals: [] },
      create: vi.fn().mockResolvedValue({ id: 90 }),
      find: vi.fn().mockResolvedValue(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn().mockResolvedValue({ id: 7, filename: "products/key.webp" }),
    };

    await retireMedia({ actorId: 3, mediaId: 7, now, payload: payload as never });

    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      collection: "media",
      data: {
        deleteAfter: "2026-08-09T03:00:00.000Z",
        retiredAt: "2026-08-08T03:00:00.000Z",
        retiredBy: 3,
      },
      id: 7,
      overrideAccess: true,
    }));
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "audit-events",
      data: expect.objectContaining({
        action: "retire_media",
        actor: 3,
        subjectId: "7",
        subjectType: "media",
      }),
    }));
  });
});

describe("retired media cleanup", () => {
  it("deletes the R2 object before the CMS record and records the deletion", async () => {
    const calls: string[] = [];
    const payload = {
      config: { globals: [] },
      create: vi.fn(async () => { calls.push("audit"); }),
      delete: vi.fn(async () => { calls.push("record"); }),
      find: vi.fn()
        .mockResolvedValueOnce({
          docs: [{ filename: "products/key.webp", id: 7, retiredBy: 3 }],
          hasNextPage: false,
        })
        .mockResolvedValueOnce(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
    };
    const deleteObject = vi.fn(async () => { calls.push("object"); });

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 1, failed: 0, referenced: 0 });
    expect(calls).toEqual(["object", "record", "audit"]);
  });

  it("keeps the CMS record retryable when R2 deletion fails", async () => {
    const payload = {
      config: { globals: [] },
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn()
        .mockResolvedValueOnce({
          docs: [{ filename: "products/key.webp", id: 7, retiredBy: 3 }],
          hasNextPage: false,
        })
        .mockResolvedValueOnce(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
    };

    await expect(cleanupRetiredMedia({
      deleteObject: vi.fn().mockRejectedValue(new Error("R2 unavailable")),
      now,
      payload: payload as never,
    })).resolves.toEqual({ deleted: 0, failed: 1, referenced: 0 });
    expect(payload.delete).not.toHaveBeenCalled();
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("rechecks references and skips newly referenced media", async () => {
    const payload = {
      config: { globals: [] },
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn()
        .mockResolvedValueOnce({
          docs: [{ filename: "products/key.webp", id: 7, retiredBy: 3 }],
          hasNextPage: false,
        })
        .mockResolvedValueOnce({
          docs: [{ id: 10, primaryImageId: 7 }],
          hasNextPage: false,
        }),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
    };
    const deleteObject = vi.fn();

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 0, failed: 0, referenced: 1 });
    expect(deleteObject).not.toHaveBeenCalled();
    expect(payload.delete).not.toHaveBeenCalled();
  });
});
