import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const events: string[] = [];
  return {
    events,
    lockProduct: vi.fn(async () => { events.push("lock"); }),
    publishProduct: vi.fn(async () => {
      events.push("commerce");
      return { operationalProductId: "42", slug: "ak820" };
    }),
    runPayloadTransaction: vi.fn(async (_payload: unknown, work: (req: unknown) => Promise<unknown>) => {
      events.push("begin");
      try {
        const result = await work({ transactionID: "tx-1" });
        events.push("commit");
        return result;
      } catch (error) {
        events.push("rollback");
        throw error;
      }
    }),
  };
});

vi.mock("../../cms/services/payloadTransaction", () => ({ runPayloadTransaction: mocks.runPayloadTransaction }));
vi.mock("../../cms/services/productConcurrency", () => ({ lockProduct: mocks.lockProduct }));
vi.mock("../../lib/cms/publication", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../lib/cms/publication")>(),
  publishProduct: mocks.publishProduct,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { executePublicationAction } from "../../lib/cms/publication-route";

describe("publication transaction lifecycle", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    vi.clearAllMocks();
  });

  it("locks before reading and commits commerce, CMS metadata, and CMS audit together", async () => {
    const admin = { id: 1, email: "xiet@a-jazz.com" };
    const payload = {
      create: vi.fn(async () => { mocks.events.push("cms-audit"); return { id: 1 }; }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === "media") return { id: 3, retiredAt: null, url: "/api/media/hero.jpg" };
        mocks.events.push("read");
        return {
          id: 7, editorialRevision: 3, sourceType: "manual", name: "AK820", slug: "ak820",
          category: "mechanical-keyboard", primaryImageId: 3, lifecycle: "unpublished",
          variants: [{ id: "variant-1", sku: "WEB-1", colorName: "Black", salePriceJpy: 1000, inventoryMode: "manual", active: true }],
        };
      }),
      update: vi.fn(async () => { mocks.events.push("cms-metadata"); return { id: 7 }; }),
    };

    await executePublicationAction({
      action: "publish",
      admin: admin as never,
      expectedRevision: 3,
      payload: payload as never,
      productId: "7",
    });

    expect(mocks.events).toEqual([
      "begin", "lock", "read", "commerce", "cms-metadata", "cms-audit", "commit",
    ]);
    expect(payload.findByID).toHaveBeenCalledWith(expect.objectContaining({ req: expect.any(Object) }));
    expect(payload.update).toHaveBeenCalledWith(expect.objectContaining({ req: expect.any(Object) }));
    expect(payload.create).toHaveBeenCalledWith(expect.objectContaining({ req: expect.any(Object) }));
    expect(mocks.runPayloadTransaction).toHaveBeenCalledWith(
      payload,
      expect.any(Function),
      undefined,
      { user: admin },
    );
  });

  it("rolls back commerce when CMS audit fails", async () => {
    const payload = {
      create: vi.fn(async () => { mocks.events.push("cms-audit"); throw new Error("audit failed"); }),
      find: vi.fn().mockResolvedValue({ docs: [] }),
      findByID: vi.fn(async ({ collection }: { collection: string }) => collection === "media"
        ? { id: 3, retiredAt: null, url: "/api/media/hero.jpg" }
        : { id: 7, editorialRevision: 3, sourceType: "manual", name: "AK820", slug: "ak820", category: "mechanical-keyboard", primaryImageId: 3, lifecycle: "unpublished", variants: [{ id: "variant-1", sku: "WEB-1", colorName: "Black", salePriceJpy: 1000, inventoryMode: "manual", active: true }] }),
      update: vi.fn(async () => { mocks.events.push("cms-metadata"); return { id: 7 }; }),
    };

    await expect(executePublicationAction({ action: "publish", admin: { id: 1, email: "xiet@a-jazz.com" } as never, expectedRevision: 3, payload: payload as never, productId: "7" }))
      .rejects.toThrow("audit failed");
    expect(mocks.events.at(-1)).toBe("rollback");
  });
});
