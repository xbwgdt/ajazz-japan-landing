import { beforeEach, describe, expect, it, vi } from "vitest";

const payloadMocks = vi.hoisted(() => ({
  notFound: vi.fn(),
  post: vi.fn(),
  rootPage: vi.fn(),
}));

vi.mock("@payload-config", () => ({ default: Promise.resolve({}) }));
vi.mock("@payloadcms/next/routes", () => ({
  REST_DELETE: vi.fn(() => vi.fn()),
  REST_GET: vi.fn(() => vi.fn()),
  REST_OPTIONS: vi.fn(() => vi.fn()),
  REST_PATCH: vi.fn(() => vi.fn()),
  REST_POST: vi.fn(() => payloadMocks.post),
  REST_PUT: vi.fn(() => vi.fn()),
}));
vi.mock("@payloadcms/next/views", () => ({
  generatePageMetadata: vi.fn(),
  RootPage: payloadMocks.rootPage,
}));
vi.mock("next/navigation", () => ({
  notFound: payloadMocks.notFound,
}));
vi.mock("../../app/(payload)/admin/importMap.js", () => ({ importMap: {} }));

describe("public first-administrator lockdown", () => {
  beforeEach(() => {
    payloadMocks.post.mockReset().mockResolvedValue(
      Response.json({ delegated: true }, { status: 200 }),
    );
    payloadMocks.rootPage.mockReset().mockResolvedValue({ view: "payload" });
    payloadMocks.notFound.mockReset().mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("denies first-register before calling Payload's POST handler", async () => {
    const { POST } = await import("../../app/(payload)/api/cms/[[...slug]]/route");
    const request = new Request("https://ajazz.jp/api/cms/admins/first-register", {
      method: "POST",
    });
    const args = {
      params: Promise.resolve({ slug: ["admins", "first-register"] }),
    };

    const response = await POST(request, args);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not Found" });
    expect(payloadMocks.post).not.toHaveBeenCalled();
  });

  it("continues delegating normal administrator login to Payload", async () => {
    const { POST } = await import("../../app/(payload)/api/cms/[[...slug]]/route");
    const request = new Request("https://ajazz.jp/api/cms/admins/login", {
      method: "POST",
    });
    const args = {
      params: Promise.resolve({ slug: ["admins", "login"] }),
    };

    const response = await POST(request, args);

    expect(response.status).toBe(200);
    expect(payloadMocks.post).toHaveBeenCalledOnce();
    expect(payloadMocks.post).toHaveBeenCalledWith(request, args);
  });

  it("denies the create-first-user page before rendering Payload", async () => {
    const { default: Page } = await import(
      "../../app/(payload)/admin/[[...segments]]/page"
    );
    const props = {
      params: Promise.resolve({ segments: ["create-first-user"] }),
      searchParams: Promise.resolve({}),
    };

    await expect(Page(props)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(payloadMocks.notFound).toHaveBeenCalledOnce();
    expect(payloadMocks.rootPage).not.toHaveBeenCalled();
  });

  it("continues rendering Payload's normal administrator login page", async () => {
    const { default: Page } = await import(
      "../../app/(payload)/admin/[[...segments]]/page"
    );
    const props = {
      params: Promise.resolve({ segments: ["login"] }),
      searchParams: Promise.resolve({}),
    };

    await expect(Page(props)).resolves.toEqual({ view: "payload" });
    expect(payloadMocks.rootPage).toHaveBeenCalledOnce();
    expect(payloadMocks.rootPage).toHaveBeenCalledWith(expect.objectContaining({
      params: props.params,
      searchParams: props.searchParams,
    }));
  });
});
