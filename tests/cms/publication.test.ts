import { describe, expect, it } from "vitest";
import {
  PublicationConflictError,
  PublicationValidationError,
  publishProduct,
  unpublishProduct,
  type PublicationStore,
  type PublicationTransaction,
  type PublishProductInput,
} from "../../lib/cms/publication";

function validInput(overrides: Partial<PublishProductInput> = {}): PublishProductInput {
  return {
    actor: { id: "admin-1", email: "xiet@a-jazz.com" },
    correlationId: "11111111-1111-4111-8111-111111111111",
    currentRevision: 3,
    expectedRevision: 3,
    draft: {
      sourceType: "manual",
      name: "AK820 Web Edition",
      slug: "ak820-web-edition",
      slugIsUnique: true,
      shortStatement: "75% gaming keyboard",
      descriptionHtml: "<p>Fast and compact.</p>",
      category: "mechanical-keyboard",
      primaryImageId: "media-1",
      images: [{ mediaId: "media-1", url: "/api/media/file.jpg", position: 0 }],
      featured: false,
      merchandisingOrder: 0,
      variants: [
        {
          cmsVariantId: "variant-1",
          sku: "WEB-1",
          colorName: "Black",
          salePriceJpy: 1000,
          inventoryMode: "manual",
          active: true,
        },
      ],
    },
    cmsProductId: "product-1",
    ...overrides,
  };
}

function fakePublicationStore(options: { failAtVariant?: number } = {}) {
  const state = {
    auditEvents: [] as unknown[],
    disabledVariants: [] as string[],
    liveProduct: { name: "Live name", published: true },
  };

  const store: PublicationStore = {
    async transaction(work) {
      const draft = structuredClone(state);
      let variantWrites = 0;
      const tx: PublicationTransaction = {
        async appendPublicationAudit(event) {
          draft.auditEvents.push(event);
        },
        async assertSlugAvailable() {},
        async disableMissingVariants(_productId, ids) {
          draft.disabledVariants = ids;
        },
        async replaceImages() {},
        async setPublished(_cmsProductId, _expectedRevision, published) {
          draft.liveProduct.published = published;
          return { operationalProductId: "42", slug: "ak820-web-edition" };
        },
        async upsertProduct(snapshot) {
          draft.liveProduct.name = snapshot.name;
          draft.liveProduct.published = true;
          return { operationalProductId: "42" };
        },
        async upsertVariants(_productId, variants) {
          variantWrites += 1;
          if (variantWrites === options.failAtVariant) throw new Error("variant write failed");
          return variants.map((_variant, index) => String(100 + index));
        },
      };
      const result = await work(tx);
      Object.assign(state, draft);
      return result;
    },
  };
  return { state, store };
}

describe("atomic product publication", () => {
  it("does not alter live data or audit state when a variant write fails", async () => {
    const { state, store } = fakePublicationStore({ failAtVariant: 1 });
    await expect(publishProduct(validInput(), store)).rejects.toThrow("variant write failed");
    expect(state.liveProduct.name).toBe("Live name");
    expect(state.auditEvents).toHaveLength(0);
  });

  it("rejects an unapproved comparison price before opening a transaction", async () => {
    const base = validInput();
    const input = validInput({
      draft: {
        ...base.draft,
        variants: [{ ...base.draft.variants[0], compareAtPriceJpy: 1500 }],
      },
    });
    const { store } = fakePublicationStore();
    let transactions = 0;
    const guardedStore: PublicationStore = {
      transaction(work) {
        transactions += 1;
        return store.transaction(work);
      },
    };

    await expect(publishProduct(input, guardedStore)).rejects.toBeInstanceOf(PublicationValidationError);
    await expect(publishProduct(input, guardedStore)).rejects.toMatchObject({
      issues: expect.arrayContaining([
        expect.objectContaining({ code: "comparison_price_unapproved" }),
      ]),
    });
    expect(transactions).toBe(0);
  });

  it("rejects stale CMS revisions before opening a transaction", async () => {
    const { store } = fakePublicationStore();
    let transactions = 0;
    const guardedStore: PublicationStore = {
      transaction(work) {
        transactions += 1;
        return store.transaction(work);
      },
    };
    await expect(publishProduct(validInput({ currentRevision: 4 }), guardedStore))
      .rejects.toBeInstanceOf(PublicationConflictError);
    expect(transactions).toBe(0);
  });

  it("publishes all variant IDs and writes the authoritative audit in the transaction", async () => {
    const { state, store } = fakePublicationStore();
    const result = await publishProduct(validInput(), store);
    expect(result).toMatchObject({
      correlationId: "11111111-1111-4111-8111-111111111111",
      operationalProductId: "42",
      slug: "ak820-web-edition",
    });
    expect(state.disabledVariants).toEqual(["100"]);
    expect(state.auditEvents).toEqual([
      expect.objectContaining({ action: "publish", revision: 3 }),
    ]);
  });

  it("carries the existing operational product ID into the public snapshot", async () => {
    const base = validInput();
    const snapshots: Array<{ operationalProductId: string | null }> = [];
    const { store } = fakePublicationStore();
    const observingStore: PublicationStore = {
      transaction: (work) => store.transaction((tx) => work({
        ...tx,
        async upsertProduct(snapshot) {
          snapshots.push({ operationalProductId: snapshot.operationalProductId });
          return tx.upsertProduct(snapshot);
        },
      })),
    };

    await publishProduct(validInput({
      draft: { ...base.draft, operationalProductId: "42" },
    }), observingStore);

    expect(snapshots).toEqual([{ operationalProductId: "42" }]);
  });

  it("does not insert inactive CMS variants and disables them in the live snapshot", async () => {
    const base = validInput();
    const input = validInput({
      draft: {
        ...base.draft,
        variants: [
          base.draft.variants[0],
          { ...base.draft.variants[0], cmsVariantId: "variant-2", sku: "WEB-2", active: false },
        ],
      },
    });
    const written: string[][] = [];
    const { state, store } = fakePublicationStore();
    const observingStore: PublicationStore = {
      transaction: (work) => store.transaction(async (tx) => work({
        ...tx,
        async upsertVariants(productId, variants) {
          written.push(variants.map(({ cmsVariantId }) => cmsVariantId));
          return tx.upsertVariants(productId, variants);
        },
      })),
    };
    await publishProduct(input, observingStore);
    expect(written).toEqual([["variant-1"]]);
    expect(state.disabledVariants).toEqual(["100"]);
  });

  it("unpublishes with the expected revision and records the same correlation ID", async () => {
    const { state, store } = fakePublicationStore();
    await unpublishProduct({
      actor: { id: "admin-1", email: "xiet@a-jazz.com" },
      cmsProductId: "product-1",
      correlationId: "22222222-2222-4222-8222-222222222222",
      currentRevision: 3,
      expectedRevision: 3,
    }, store);
    expect(state.liveProduct.published).toBe(false);
    expect(state.auditEvents).toEqual([
      expect.objectContaining({ action: "unpublish", correlationId: "22222222-2222-4222-8222-222222222222" }),
    ]);
  });

  it("allows unpublication after newer draft edits", async () => {
    const calls: number[] = [];
    const { store } = fakePublicationStore();
    const observingStore: PublicationStore = {
      transaction: (work) => store.transaction((tx) => work({
        ...tx,
        async setPublished(cmsProductId, revision, published) {
          calls.push(revision);
          return tx.setPublished(cmsProductId, revision, published, "observed-correlation");
        },
      })),
    };

    await unpublishProduct({
      actor: { id: "admin-1", email: "xiet@a-jazz.com" },
      cmsProductId: "product-1",
      correlationId: "33333333-3333-4333-8333-333333333333",
      currentRevision: 5,
      expectedRevision: 5,
    }, observingStore);

    expect(calls).toEqual([5]);
  });
});
