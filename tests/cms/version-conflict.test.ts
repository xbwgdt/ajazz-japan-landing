import { describe, expect, it, vi } from "vitest";
import { prepareProductVersionRestore } from "../../cms/hooks/productVersionRestore";
import { protectSourceFields } from "../../cms/hooks/protectSourceFields";
import { writeAuditEvent } from "../../cms/hooks/writeAuditEvent";

describe("product version restore", () => {
  it("forces restore-as-draft and locks the parent product", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const req = {
      context: {},
      payload: {
        db: {
          findVersions: vi.fn().mockResolvedValue({ docs: [{ parent: 42 }] }),
          sessions: { tx: { db: { execute } } },
        },
      },
      transactionID: Promise.resolve("tx"),
      user: { id: 7 },
    };
    const args = { collection: { slug: "products" }, draft: false, id: "version-9", req };

    const result = await prepareProductVersionRestore({ args, operation: "restoreVersion" } as never);

    expect(result).toMatchObject({ draft: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(req.context).toMatchObject({ productRestore: { productId: "42" } });
  });

  it("increments the current revision, remains draft, and preserves source identity", async () => {
    const result = await protectSourceFields({
      context: {},
      data: {
        _status: "published",
        editorialRevision: 2,
        operationalProductId: "old-link",
        rmsManageNumber: "old-rms",
        sourceType: "manual",
        variants: [{ id: "v1", operationalVariantId: "old-v", rmsSkuNumber: "old-sku", sku: "SKU-1" }],
      },
      operation: "update",
      originalDoc: {
        id: 42,
        _status: "published",
        editorialRevision: 8,
        operationalProductId: "100",
        rmsManageNumber: "rms-100",
        sourceType: "rms",
        variants: [{ id: "v1", operationalVariantId: "200", rmsSkuNumber: "rms-sku", sku: "SKU-1", inventoryMode: "rms" }],
      },
      req: { context: { isRestoringVersion: true } },
    } as never);

    expect(result).toMatchObject({
      _status: "draft",
      editorialRevision: 9,
      operationalProductId: "100",
      rmsManageNumber: "rms-100",
      sourceType: "rms",
      variants: [expect.objectContaining({ operationalVariantId: "200", rmsSkuNumber: "rms-sku", inventoryMode: "rms" })],
    });
  });

  it("does not reintroduce historical RMS variant identities during restore", async () => {
    const result = await protectSourceFields({
      context: {},
      data: {
        sourceType: "rms",
        variants: [
          { id: "v1", operationalVariantId: "200", rmsSkuNumber: "rms-1", sku: "SKU-1" },
          { id: "old", operationalVariantId: "999", rmsSkuNumber: "retired-rms", sku: "OLD" },
        ],
      },
      operation: "update",
      originalDoc: {
        id: 42,
        editorialRevision: 8,
        operationalProductId: "100",
        rmsManageNumber: "rms-100",
        sourceType: "rms",
        variants: [
          { id: "v1", operationalVariantId: "200", rmsSkuNumber: "rms-1", sku: "SKU-1", inventoryMode: "rms" },
          { id: "v2", operationalVariantId: "201", rmsSkuNumber: "rms-2", sku: "SKU-2", inventoryMode: "rms" },
        ],
      },
      req: { context: { isRestoringVersion: true } },
    } as never);

    expect(result.variants).toHaveLength(2);
    expect(result.variants).toEqual([
      expect.objectContaining({ operationalVariantId: "200", rmsSkuNumber: "rms-1", sku: "SKU-1" }),
      expect.objectContaining({ operationalVariantId: "201", rmsSkuNumber: "rms-2", sku: "SKU-2" }),
    ]);
  });

  it("writes one restore audit event with the authenticated actor", async () => {
    const create = vi.fn().mockResolvedValue({});
    await writeAuditEvent({
      data: { editorialRevision: 9 },
      doc: { id: 42 },
      operation: "update",
      previousDoc: { editorialRevision: 8 },
      req: {
        context: { isRestoringVersion: true },
        payload: { create },
        user: { id: 7 },
      },
    } as never);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "restore", actor: 7, subjectId: "42" }),
    }));
  });
});
