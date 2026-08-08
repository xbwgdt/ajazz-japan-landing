import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CartProvider } from "../../components/store/CartProvider";
import { ProductDetail } from "../../components/store/ProductDetail";
import {
  authorizeProductPreview,
  createPreviewToken,
  verifyPreviewToken,
} from "../../lib/cms/preview";
import {
  adaptDraftProduct,
  loadProductPageData,
} from "../../app/products/[slug]/preview-adapter";

const SECRET = "test-preview-secret-with-enough-entropy";

const routeMocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  createLocalReq: vi.fn(),
  disable: vi.fn(),
  enable: vi.fn(),
  find: vi.fn(),
  getPayload: vi.fn(),
}));

vi.mock("next/headers", () => ({
  draftMode: vi.fn(async () => ({
    disable: routeMocks.disable,
    enable: routeMocks.enable,
    isEnabled: false,
  })),
}));
vi.mock("payload", async (importOriginal) => ({
  ...await importOriginal<typeof import("payload")>(),
  createLocalReq: routeMocks.createLocalReq,
  getPayload: routeMocks.getPayload,
}));
vi.mock("../../lib/cms/auth", () => ({ authenticateAdmin: routeMocks.authenticate }));
vi.mock("@payload-config", () => ({ default: {} }));

describe("product preview tokens", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("signs strict product and revision claims for at most ten minutes", () => {
    vi.stubEnv("PAYLOAD_SECRET", SECRET);
    const token = createPreviewToken(
      { productId: "10", revision: 4, expiresAt: 1_600 },
      { now: 1_000 },
    );

    expect(verifyPreviewToken(token, { now: 1_200 })).toEqual({
      expiresAt: 1_600,
      issuedAt: 1_000,
      productId: "10",
      revision: 4,
      version: 1,
    });
    expect(() => createPreviewToken(
      { productId: "10", revision: 4, expiresAt: 1_601 },
      { now: 1_000 },
    )).toThrow(/ten minutes/i);
  });

  it("rejects expired, future-issued, malformed, modified, and wrong-secret tokens", () => {
    vi.stubEnv("PAYLOAD_SECRET", SECRET);
    const token = createPreviewToken(
      { productId: "10", revision: 4, expiresAt: 1_600 },
      { now: 1_000 },
    );

    expect(verifyPreviewToken(token, { now: 1_601 })).toBeNull();
    expect(verifyPreviewToken(token, { now: 999 })).toBeNull();
    expect(verifyPreviewToken(`${token}x`, { now: 1_100 })).toBeNull();
    expect(verifyPreviewToken("not.a.valid.token", { now: 1_100 })).toBeNull();
    vi.stubEnv("PAYLOAD_SECRET", "different-secret-with-enough-entropy");
    expect(verifyPreviewToken(token, { now: 1_100 })).toBeNull();
  });

  it("fails closed when PAYLOAD_SECRET is missing", () => {
    vi.stubEnv("PAYLOAD_SECRET", "");
    expect(() => createPreviewToken(
      { productId: "10", revision: 4, expiresAt: 1_100 },
      { now: 1_000 },
    )).toThrow(/PAYLOAD_SECRET/);
    expect(verifyPreviewToken("payload.signature", { now: 1_000 })).toBeNull();
  });
});

describe("product preview authorization", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("requires an authenticated Payload administrator even with a valid token", async () => {
    vi.stubEnv("PAYLOAD_SECRET", SECRET);
    const token = createPreviewToken(
      { productId: "10", revision: 4, expiresAt: 1_600 },
      { now: 1_000 },
    );
    const enable = vi.fn();

    const result = await authorizeProductPreview(
      new Request(`https://ajazz.jp/api/cms/preview?token=${token}&slug=ak820`),
      {
        authenticate: vi.fn().mockResolvedValue(null),
        createRequest: vi.fn(),
        enable,
        getPayload: vi.fn().mockResolvedValue({}),
        now: 1_100,
      },
    );

    expect(result).toEqual({ code: "unauthorized", status: 401 });
    expect(enable).not.toHaveBeenCalled();
  });

  it("binds the slug to the current draft product ID and editorial revision before enabling", async () => {
    vi.stubEnv("PAYLOAD_SECRET", SECRET);
    const token = createPreviewToken(
      { productId: "10", revision: 4, expiresAt: 1_600 },
      { now: 1_000 },
    );
    const enable = vi.fn();
    const find = vi.fn().mockResolvedValue({ docs: [{ id: 10, editorialRevision: 5, slug: "ak820" }] });
    const payload = { find };
    const dependencies = {
      authenticate: vi.fn().mockResolvedValue({ id: 7, role: "administrator", collection: "admins" }),
      createRequest: vi.fn().mockResolvedValue({ user: { id: 7 } }),
      enable,
      getPayload: vi.fn().mockResolvedValue(payload),
      now: 1_100,
    };

    expect(await authorizeProductPreview(
      new Request(`https://ajazz.jp/api/cms/preview?token=${token}&slug=ak820`),
      dependencies as never,
    )).toEqual({ code: "preview_stale", status: 409 });
    expect(enable).not.toHaveBeenCalled();

    find.mockResolvedValueOnce({ docs: [{ id: 10, editorialRevision: 4, slug: "ak820" }] });
    expect(await authorizeProductPreview(
      new Request(`https://ajazz.jp/api/cms/preview?token=${token}&slug=ak820`),
      dependencies as never,
    )).toEqual({ path: "/products/ak820", status: 200 });
    expect(enable).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenLastCalledWith(expect.objectContaining({
      collection: "products",
      draft: true,
      overrideAccess: false,
      req: expect.objectContaining({ user: expect.anything() }),
      where: { slug: { equals: "ak820" } },
    }));
  });
});

describe("product preview routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("enables draft mode only after the real entry route authenticates and binds the draft", async () => {
    vi.stubEnv("PAYLOAD_SECRET", SECRET);
    const now = Math.floor(Date.now() / 1_000);
    const token = createPreviewToken(
      { productId: "10", revision: 4, expiresAt: now + 500 },
      { now },
    );
    routeMocks.getPayload.mockResolvedValue({ find: routeMocks.find });
    routeMocks.authenticate.mockResolvedValue({ id: 7, role: "administrator", collection: "admins" });
    routeMocks.createLocalReq.mockResolvedValue({ user: { id: 7 } });
    routeMocks.find.mockResolvedValue({ docs: [{ id: 10, editorialRevision: 4, slug: "ak820" }] });
    const { GET } = await import("../../app/api/cms/preview/route");

    const response = await GET(new Request(
      `https://ajazz.jp/api/cms/preview?token=${token}&slug=ak820`,
    ));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://ajazz.jp/products/ak820");
    expect(routeMocks.enable).toHaveBeenCalledTimes(1);
  });

  it("disables draft mode and redirects to a fixed same-site path", async () => {
    const { GET } = await import("../../app/api/cms/preview/exit/route");
    const response = await GET(new Request("https://ajazz.jp/api/cms/preview/exit?next=https://evil.example"));

    expect(routeMocks.disable).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://ajazz.jp/");
  });

  it("generates the Products admin preview URL from the saved ID, slug, and revision", async () => {
    vi.stubEnv("PAYLOAD_SECRET", SECRET);
    const { Products } = await import("../../cms/collections/Products");
    const generate = Products.admin?.preview;
    expect(typeof generate).toBe("function");

    const value = await (generate as Function)({ id: 10, slug: "ak820", editorialRevision: 4 }, {});
    const url = new URL(String(value), "https://ajazz.jp");
    expect(url.pathname).toBe("/api/cms/preview");
    expect(url.searchParams.get("slug")).toBe("ak820");
    expect(verifyPreviewToken(url.searchParams.get("token") ?? "")).toMatchObject({
      productId: "10",
      revision: 4,
    });
  }, 15_000);
});

describe("draft product adapter", () => {
  const media = (id: number, url: string, retiredAt: string | null = null) => ({
    id,
    url,
    retiredAt,
  });

  it("uses access-controlled Payload media and includes new variants with stable preview-only IDs", () => {
    const product = adaptDraftProduct({
      id: 10,
      name: "AK820 draft",
      slug: "ak820",
      description: null,
      primaryImageId: media(1, "/api/cms/media/file/hero.webp"),
      galleryImageIds: [media(2, "/api/cms/media/file/gallery.webp")],
      variants: [
        { id: "cms-new", sku: "NEW", colorName: "New", salePriceJpy: 1000, active: true, inventoryMode: "manual" },
        { id: "cms-live", operationalVariantId: "55", sku: "LIVE", colorName: "Black", salePriceJpy: 2000, active: true, inventoryMode: "manual", imageId: media(3, "/api/cms/media/file/black.webp") },
      ],
    } as never);

    expect(product).toMatchObject({
      name: "AK820 draft",
      images: ["/api/cms/media/file/hero.webp", "/api/cms/media/file/gallery.webp"],
      variants: [
        { id: "preview:cms-new", rmsSkuNumber: "NEW", availableQuantity: 0 },
        { id: "55", rmsSkuNumber: "LIVE", availableQuantity: 0 },
      ],
    });

    const html = renderToStaticMarkup(createElement(
      CartProvider,
      null,
      createElement(ProductDetail, { product }),
    ));
    expect(html).toContain("SKU NEW");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*class="store-add-button"/);
  });

  it("rejects retired, unresolved, and direct object-storage media", () => {
    const base = { id: 10, name: "AK820", slug: "ak820", variants: [] };
    expect(() => adaptDraftProduct({ ...base, primaryImageId: media(1, "/api/cms/media/file/a.webp", "2026-08-09") } as never)).toThrow(/media/i);
    expect(() => adaptDraftProduct({ ...base, primaryImageId: 1 } as never)).toThrow(/media/i);
    expect(() => adaptDraftProduct({ ...base, primaryImageId: media(1, "https://r2.example/a.webp") } as never)).toThrow(/media/i);
  });

  it("renders a completely new product variant with a deterministic index fallback", () => {
    const product = adaptDraftProduct({
      id: 11,
      name: "New product",
      slug: "new-product",
      variants: [{ sku: "NEW-ONLY", colorName: "Blue", salePriceJpy: 3000, active: true, inventoryMode: "manual" }],
    } as never);

    expect(product.variants).toEqual([expect.objectContaining({
      id: "preview:0",
      rmsSkuNumber: "NEW-ONLY",
      availableQuantity: 0,
    })]);
  });

  it("never loads a Payload draft for a live product request", async () => {
    const loadDraft = vi.fn();
    const loadLive = vi.fn().mockResolvedValue({ name: "Live" });
    const result = await loadProductPageData("ak820", false, new Headers(), {
      loadDraft,
      loadFallback: vi.fn(),
      loadLive,
    });

    expect(result).toEqual({ name: "Live" });
    expect(loadDraft).not.toHaveBeenCalled();
  });

  it("requires a current admin and performs an access-controlled draft query", async () => {
    const payload = { find: vi.fn().mockResolvedValue({ docs: [{
      id: 10,
      name: "Draft",
      slug: "ak820",
      description: null,
      variants: [],
    }] }) };
    const authenticate = vi.fn().mockResolvedValue({ id: 7 });
    const createRequest = vi.fn().mockResolvedValue({ user: { id: 7 } });
    const { loadAuthenticatedDraftProduct } = await import("../../app/products/[slug]/preview-adapter");

    await loadAuthenticatedDraftProduct("ak820", new Headers(), {
      authenticate: authenticate as never,
      createRequest: createRequest as never,
      payload: payload as never,
    });

    expect(payload.find).toHaveBeenCalledWith(expect.objectContaining({
      draft: true,
      overrideAccess: false,
      req: { user: { id: 7 } },
      where: { slug: { equals: "ak820" } },
    }));
  });
});
