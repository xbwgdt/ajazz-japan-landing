import { describe, expect, it, vi } from "vitest";
import {
  archiveProduct,
  createProductLifecycleRouteHandler,
  deleteUnreferencedDraft,
  restoreProductAsDraft,
  ProductLifecycleError,
  type ProductLifecycleStore,
} from "../../lib/cms/product-lifecycle";

const admin = { id: 1, email: "xiet@a-jazz.com" };

function fakeLifecycleStore(overrides: Partial<{
  lifecycle: "active" | "unpublished" | "archived";
  referencedByOrder: boolean;
}> = {}) {
  const state = {
    deleted: false,
    lifecycle: overrides.lifecycle ?? "unpublished",
    referencedByOrder: overrides.referencedByOrder ?? false,
    status: "draft" as const,
  };

  const store: ProductLifecycleStore = {
    async transaction(_actor, work) {
      return work({
        async deleteProduct() {
          state.deleted = true;
        },
        async getProduct() {
          return {
            hasPublicationHistory: false,
            id: "product-1",
            lifecycle: state.lifecycle,
            mediaOwnedOnlyByProduct: [] as string[],
            referencedByOrder: state.referencedByOrder,
            slug: "ak820",
            status: state.status,
          };
        },
        async recordAuditEvent() {},
        async unpublishOperationalProduct() {},
        async updateProduct(_id, data) {
          if (data.lifecycle) state.lifecycle = data.lifecycle;
          if (data.status) state.status = data.status;
        },
      });
    },
  };

  return { ...state, ...store, state, store };
}

describe("product lifecycle", () => {
  it("archives an ordered product instead of deleting it", async () => {
    const { state, store } = fakeLifecycleStore({ referencedByOrder: true });

    await expect(deleteUnreferencedDraft("product-1", admin, "DELETE ak820", store)).rejects.toMatchObject({
      code: "product_has_order_history",
    });
    expect(state.deleted).toBe(false);
  });

  it("restores an archived product as a draft", async () => {
    const { state, store } = fakeLifecycleStore({ lifecycle: "archived" });

    await restoreProductAsDraft("product-1", admin, store);

    expect(state.lifecycle).toBe("unpublished");
    expect(state.status).toBe("draft");
  });

  it("unpublishes before archiving and records both CMS audit events", async () => {
    const calls: string[] = [];
    const product = {
      hasPublicationHistory: true,
      id: "product-1",
      lifecycle: "active" as const,
      mediaOwnedOnlyByProduct: [],
      referencedByOrder: false,
      slug: "ak820",
      status: "published" as const,
    };
    const store: ProductLifecycleStore = {
      async transaction(_actor, work) {
        return work({
          async deleteProduct() {},
          async getProduct() { calls.push("read"); return product; },
          async recordAuditEvent({ action }) { calls.push(`audit:${action}`); },
          async unpublishOperationalProduct() { calls.push("unpublish"); },
          async updateProduct(_id, data) { calls.push(`update:${data.lifecycle}:${data.status}`); },
        });
      },
    };

    await archiveProduct("product-1", admin, "ARCHIVE ak820", store);

    expect(calls).toEqual([
      "read",
      "unpublish",
      "audit:unpublish",
      "update:archived:draft",
      "audit:archive",
    ]);
  });

  it.each([
    [{ lifecycle: "active" }, "product_lifecycle_must_be_unpublished"],
    [{ hasPublicationHistory: true }, "product_has_publication_history"],
    [{ mediaOwnedOnlyByProduct: ["media-1"] }, "product_has_product_media"],
  ])("blocks permanent deletion when %o", async (overrides, code) => {
    const { store } = fakeLifecycleStore();
    const blockedStore: ProductLifecycleStore = {
      async transaction(actor, work) {
        return store.transaction(actor, async (tx) => work({
          ...tx,
          async getProduct(id) {
            const product = await tx.getProduct(id);
            return product ? { ...product, ...overrides } as typeof product : product;
          },
        }));
      },
    };

    await expect(deleteUnreferencedDraft("product-1", admin, "DELETE ak820", blockedStore))
      .rejects.toMatchObject({ code });
  });

  it("requires exact archive and deletion confirmations", async () => {
    const { store } = fakeLifecycleStore();

    await expect(archiveProduct("product-1", admin, "ARCHIVE AK820", store))
      .rejects.toMatchObject({ code: "archive_confirmation_required" });
    await expect(deleteUnreferencedDraft("product-1", admin, "delete ak820", store))
      .rejects.toMatchObject({ code: "delete_confirmation_required" });
  });
});

function lifecycleRequest(body: unknown, origin = "https://ajazz.jp") {
  return new Request("https://ajazz.jp/api/cms/products/product-1/archive", {
    method: "POST",
    headers: { "content-type": "application/json", host: "ajazz.jp", origin },
    body: JSON.stringify(body),
  });
}

describe("product lifecycle routes", () => {
  const authenticate = async () => admin;
  const archive = async () => undefined;
  const restore = async () => undefined;
  const remove = async () => undefined;

  it("requires same-origin administrator requests and strict action bodies", async () => {
    const POST = createProductLifecycleRouteHandler({ authenticate, archive, remove, restore }, "archive");
    expect((await POST(lifecycleRequest({ confirmation: "ARCHIVE ak820" }, "https://evil.example"), {
      params: Promise.resolve({ id: "product-1" }),
    })).status).toBe(403);
    expect((await POST(lifecycleRequest({ confirmation: "ARCHIVE ak820", extra: true }), {
      params: Promise.resolve({ id: "product-1" }),
    })).status).toBe(400);
  });

  it("maps lifecycle errors and only invokes the requested action", async () => {
    const archiveSpy = vi.fn(async () => { throw new ProductLifecycleError("product_has_order_history", 409); });
    const POST = createProductLifecycleRouteHandler({ authenticate, archive: archiveSpy, remove, restore }, "archive");
    const response = await POST(lifecycleRequest({ confirmation: "ARCHIVE ak820" }), {
      params: Promise.resolve({ id: "product-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ code: "product_has_order_history" });
    expect(archiveSpy).toHaveBeenCalledWith("product-1", admin, "ARCHIVE ak820");
  });
});
