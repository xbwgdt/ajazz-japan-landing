import { beforeEach, describe, expect, it, vi } from "vitest";

const transactionMocks = vi.hoisted(() => ({ runPayloadTransaction: vi.fn() }));

vi.mock("../../cms/services/payloadTransaction", () => transactionMocks);

import {
  cleanupRetiredMedia,
  findMediaReferences,
  MediaReferencedError,
  retireMedia,
} from "../../cms/hooks/protectMediaReferences";

const now = new Date("2026-08-08T03:00:00.000Z");
const objectFilename = "68613c4c-d337-4a2f-85ef-5a65f530db7c.webp";

function emptyResult() {
  return { docs: [], hasNextPage: false };
}

describe("media retirement", () => {
  beforeEach(() => {
    transactionMocks.runPayloadTransaction.mockReset();
    transactionMocks.runPayloadTransaction.mockImplementation(async (_payload, work) => (
      work({ id: "transaction-request" })
    ));
  });

  it("finds references in current products, versions, variants, and site settings", async () => {
    const req = { id: "transaction-request" };
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

    await expect(findMediaReferences(payload as never, 7, req as never)).resolves.toEqual([
      expect.objectContaining({ path: "primaryImageId", source: "product", sourceId: "10" }),
      expect.objectContaining({ path: "variants.0.imageId", source: "product", sourceId: "10" }),
      expect.objectContaining({ path: "galleryImageIds.0", source: "product-version", sourceId: "22" }),
      expect.objectContaining({ path: "homeHeroImageId", source: "site-settings", sourceId: "site-settings" }),
    ]);
    expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({ req }));
    expect(payload.findVersions).toHaveBeenCalledWith(expect.objectContaining({ req }));
    expect(payload.findGlobal).toHaveBeenCalledWith(expect.objectContaining({ req }));
  });

  it("updates first, performs the final reference check in the transaction, and rolls back", async () => {
    const events: string[] = [];
    transactionMocks.runPayloadTransaction.mockImplementation(async (_payload, work) => {
      try {
        return await work({ id: "transaction-request" });
      } catch (error) {
        events.push("rollback");
        throw error;
      }
    });
    const payload = {
      config: { globals: [] },
      create: vi.fn(),
      find: vi.fn(async () => {
        events.push("reference-check");
        return { docs: [{ id: 10, name: "AK820", seoImageId: 7 }] };
      }),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn(async () => {
        events.push("retire-update");
        return { id: 7 };
      }),
    };

    await expect(retireMedia({ actorId: 3, mediaId: 7, now, payload: payload as never }))
      .rejects.toBeInstanceOf(MediaReferencedError);
    expect(events).toEqual(["retire-update", "reference-check", "rollback"]);
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("commits retirement metadata and its audit through one request", async () => {
    const req = { id: "transaction-request" };
    transactionMocks.runPayloadTransaction.mockImplementation(async (_payload, work) => work(req));
    const payload = {
      config: { globals: [] },
      create: vi.fn().mockResolvedValue({ id: 90 }),
      find: vi.fn().mockResolvedValue(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn().mockResolvedValue({ id: 7, filename: objectFilename, prefix: "products" }),
    };

    await retireMedia({ actorId: 3, mediaId: 7, now, payload: payload as never });

    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      collection: "media",
      data: {
        deleteAfter: "2026-08-09T03:00:00.000Z",
        deletionStartedAt: null,
        retiredAt: "2026-08-08T03:00:00.000Z",
        retiredBy: 3,
      },
      id: 7,
      overrideAccess: true,
      req,
    }));
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "audit-events",
      data: expect.objectContaining({
        action: "retire_media",
        actor: 3,
        subjectId: "7",
        subjectType: "media",
      }),
      req,
    }));
  });

  it("rolls retirement back when its audit cannot be written", async () => {
    const events: string[] = [];
    transactionMocks.runPayloadTransaction.mockImplementation(async (_payload, work) => {
      try {
        return await work({ id: "transaction-request" });
      } catch (error) {
        events.push("rollback");
        throw error;
      }
    });
    const payload = {
      config: { globals: [] },
      create: vi.fn(async () => { throw new Error("audit unavailable"); }),
      find: vi.fn().mockResolvedValue(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn(async () => { events.push("retire-update"); return { id: 7 }; }),
    };

    await expect(retireMedia({ actorId: 3, mediaId: 7, now, payload: payload as never }))
      .rejects.toThrow("audit unavailable");
    expect(events).toEqual(["retire-update", "rollback"]);
  });
});

describe("retired media cleanup", () => {
  beforeEach(() => {
    transactionMocks.runPayloadTransaction.mockReset();
    transactionMocks.runPayloadTransaction.mockImplementation(async (_payload, work) => (
      work({ id: "transaction-request" })
    ));
  });

  function dueMedia(overrides: Record<string, unknown> = {}) {
    return {
      deleteAfter: "2026-08-08T02:00:00.000Z",
      filename: objectFilename,
      id: 7,
      prefix: "products",
      retiredAt: "2026-08-07T03:00:00.000Z",
      retiredBy: 3,
      ...overrides,
    };
  }

  it("durably records deletion start before R2 deletion and finalizes atomically", async () => {
    const calls: string[] = [];
    const deleteObject = vi.fn(async (key: string) => { calls.push(`object:${key}`); });
    const payload = {
      config: { globals: [] },
      create: vi.fn(async ({ data }: { data: { details: { phase: string } } }) => {
        calls.push(`audit:${data.details.phase}`);
      }),
      delete: vi.fn(async () => {
        calls.push("record");
        await deleteObject(`products/${objectFilename}`);
        calls.push("plugin-after-delete");
      }),
      find: vi.fn()
        .mockResolvedValueOnce({ docs: [dueMedia()] })
        .mockResolvedValueOnce(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn(async () => {
        calls.push("start-state");
        return { docs: [dueMedia({ deletionStartedAt: now.toISOString() })] };
      }),
    };

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 1, failed: 0, referenced: 0 });
    expect(calls).toEqual([
      "start-state",
      "audit:deletion_started",
      `object:products/${objectFilename}`,
      "record",
      `object:products/${objectFilename}`,
      "plugin-after-delete",
      "audit:deleted",
    ]);
    expect(transactionMocks.runPayloadTransaction).toHaveBeenCalledTimes(2);
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        and: [
          { id: { equals: 7 } },
          { deletionStartedAt: { exists: false } },
        ],
      },
    }));
  });

  it("does not duplicate the start audit after losing a conditional-start race", async () => {
    const deleteObject = vi.fn().mockResolvedValue(undefined);
    const payload = {
      config: { globals: [] },
      create: vi.fn().mockResolvedValue({ id: 90 }),
      delete: vi.fn().mockResolvedValue(dueMedia()),
      find: vi.fn()
        .mockResolvedValueOnce({ docs: [dueMedia()] })
        .mockResolvedValueOnce(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn().mockResolvedValue({ docs: [] }),
    };

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 1, failed: 0, referenced: 0 });
    expect(payload.create).toHaveBeenCalledTimes(1);
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ details: expect.objectContaining({ phase: "deleted" }) }),
    }));
  });

  it("does not touch R2 when deletion-start persistence fails", async () => {
    const deleteObject = vi.fn();
    const payload = {
      config: { globals: [] },
      create: vi.fn().mockRejectedValue(new Error("start audit unavailable")),
      delete: vi.fn(),
      find: vi.fn()
        .mockResolvedValueOnce({ docs: [dueMedia()] })
        .mockResolvedValueOnce(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn().mockResolvedValue({ docs: [dueMedia()] }),
    };

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 0, failed: 1, referenced: 0 });
    expect(deleteObject).not.toHaveBeenCalled();
    expect(payload.delete).not.toHaveBeenCalled();
  });

  it("keeps finalization retryable and repeats idempotent R2 deletion", async () => {
    const media = dueMedia({ deletionStartedAt: "2026-08-08T03:00:00.000Z" });
    const deleteObject = vi.fn().mockResolvedValue(undefined);
    let finalAuditAttempts = 0;
    const payload = {
      config: { globals: [] },
      create: vi.fn(async ({ data }: { data: { details: { phase: string } } }) => {
        if (data.details.phase === "deleted" && finalAuditAttempts++ === 0) {
          throw new Error("final audit unavailable");
        }
      }),
      delete: vi.fn().mockResolvedValue(media),
      find: vi.fn()
        .mockResolvedValueOnce({ docs: [media] })
        .mockResolvedValueOnce(emptyResult())
        .mockResolvedValueOnce({ docs: [media] })
        .mockResolvedValueOnce(emptyResult()),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn(),
    };

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 0, failed: 1, referenced: 0 });
    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 1, failed: 0, referenced: 0 });

    expect(deleteObject).toHaveBeenCalledTimes(2);
    expect(deleteObject).toHaveBeenNthCalledWith(1, `products/${objectFilename}`);
    expect(deleteObject).toHaveBeenNthCalledWith(2, `products/${objectFilename}`);
    expect(payload.delete).toHaveBeenCalledTimes(2);
    expect(payload.update).not.toHaveBeenCalled();
  });

  it("rechecks references before starting deletion", async () => {
    const payload = {
      config: { globals: [] },
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn()
        .mockResolvedValueOnce({ docs: [dueMedia()] })
        .mockResolvedValueOnce({ docs: [{ id: 10, primaryImageId: 7 }] }),
      findVersions: vi.fn().mockResolvedValue(emptyResult()),
      update: vi.fn(),
    };
    const deleteObject = vi.fn();

    await expect(cleanupRetiredMedia({ deleteObject, now, payload: payload as never }))
      .resolves.toEqual({ deleted: 0, failed: 0, referenced: 1 });
    expect(deleteObject).not.toHaveBeenCalled();
    expect(payload.update).not.toHaveBeenCalled();
    expect(payload.delete).not.toHaveBeenCalled();
  });
});
