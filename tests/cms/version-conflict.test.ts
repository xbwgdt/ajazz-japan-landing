import { describe, expect, it, vi } from "vitest";
import { restoreProductVersionEndpoint } from "../../cms/endpoints/restoreProductVersion";
import { Products } from "../../cms/collections/Products";
import { prepareProductVersionRestore } from "../../cms/hooks/productVersionRestore";
import { protectSourceFields } from "../../cms/hooks/protectSourceFields";
import { writeAuditEvent } from "../../cms/hooks/writeAuditEvent";

describe("product version restore", () => {
  it("registers the controlled restore endpoint before Payload defaults", () => {
    expect(Products.endpoints?.[0]).toMatchObject({
      handler: restoreProductVersionEndpoint,
      method: "post",
      path: "/versions/:id",
    });
  });

  it("rejects direct or local restore calls that are not already draft-only", async () => {
    const req = { context: {}, user: { id: 7 } };

    await expect(prepareProductVersionRestore({
      args: { draft: false, id: "version-9", req },
      operation: "restoreVersion",
    } as never)).rejects.toMatchObject({
      status: 400,
      data: { code: "product_restore_requires_draft" },
    });
    await expect(prepareProductVersionRestore({
      args: { id: "version-9", req },
      operation: "restoreVersion",
    } as never)).rejects.toMatchObject({
      status: 400,
      data: { code: "product_restore_requires_draft" },
    });
  });

  it("locks the parent product for an explicit draft restore", async () => {
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
    const args = { collection: { slug: "products" }, draft: true, id: "version-9", req };

    const result = await prepareProductVersionRestore({ args, operation: "restoreVersion" } as never);

    expect(result).toBe(args);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(req.context).toMatchObject({ productRestore: { productId: "42" } });
  });

  it("intercepts the built-in UI path and always invokes restore with draft true", async () => {
    const restore = vi.fn().mockResolvedValue({ id: 42, _status: "draft", editorialRevision: 9 });
    const req = {
      headers: new Headers({ host: "ajazz.jp", origin: "https://ajazz.jp" }),
      method: "POST",
      payload: { collections: { products: { config: { slug: "products" } } } },
      query: { draft: "false" },
      routeParams: { id: "version-9" },
      t: vi.fn(() => "Version restored successfully."),
      url: "https://ajazz.jp/api/cms/products/versions/version-9?draft=false",
      user: { id: 7 },
    };

    const response = await restoreProductVersionEndpoint(req as never, { restore: restore as never });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: 42,
      _status: "draft",
      message: "Version restored successfully.",
    });
    expect(restore).toHaveBeenCalledWith(expect.objectContaining({
      collection: expect.objectContaining({ config: { slug: "products" } }),
      draft: true,
      id: "version-9",
      overrideAccess: false,
      req,
    }));
  });

  it("rejects unauthenticated and cross-origin restore requests", async () => {
    const base = {
      headers: new Headers({ host: "ajazz.jp", origin: "https://ajazz.jp" }),
      method: "POST",
      payload: { collections: { products: { config: { slug: "products" } } } },
      routeParams: { id: "version-9" },
      t: vi.fn(),
      url: "https://ajazz.jp/api/cms/products/versions/version-9",
    };
    const restore = vi.fn();

    await expect(restoreProductVersionEndpoint(base as never, { restore: restore as never }))
      .rejects.toMatchObject({ status: 401 });
    await expect(restoreProductVersionEndpoint({
      ...base,
      headers: new Headers({ host: "ajazz.jp", origin: "https://evil.example" }),
      user: { id: 7 },
    } as never, { restore: restore as never })).rejects.toMatchObject({ status: 403 });
    expect(restore).not.toHaveBeenCalled();
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
