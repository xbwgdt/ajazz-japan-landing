import { APIError } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ requireAuthenticatedAdmin: vi.fn() }));
const lifecycleMocks = vi.hoisted(() => ({
  cleanupRetiredMedia: vi.fn(),
  deleteR2MediaObject: vi.fn(),
  MediaReferencedError: class MediaReferencedError extends Error {
    references: unknown[];

    constructor(references: unknown[]) {
      super("Media is still referenced");
      this.references = references;
    }
  },
  retireMedia: vi.fn(),
}));
const payloadMocks = vi.hoisted(() => ({ getPayload: vi.fn() }));

vi.mock("../../lib/cms/auth", () => authMocks);
vi.mock("../../cms/hooks/protectMediaReferences", () => ({
  ...lifecycleMocks,
}));
vi.mock("payload", async (importOriginal) => ({
  ...await importOriginal<typeof import("payload")>(),
  getPayload: payloadMocks.getPayload,
}));

function request(path: string, method = "POST", origin = "https://ajazz.jp") {
  return new Request(`https://ajazz.jp${path}`, {
    method,
    headers: { host: "ajazz.jp", origin },
  });
}

describe("media retirement route authentication", () => {
  beforeEach(() => {
    authMocks.requireAuthenticatedAdmin.mockReset();
    authMocks.requireAuthenticatedAdmin.mockRejectedValue(new APIError("Unauthorized", 401));
    lifecycleMocks.retireMedia.mockReset();
    payloadMocks.getPayload.mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    const { POST } = await import("../../app/api/cms/media/[id]/retire/route");
    const response = await POST(request("/api/cms/media/7/retire"), {
      params: Promise.resolve({ id: "7" }),
    });
    expect(response.status).toBe(401);
    expect(lifecycleMocks.retireMedia).not.toHaveBeenCalled();
  }, 15_000);

  it("rejects cross-origin requests before authentication", async () => {
    const { POST } = await import("../../app/api/cms/media/[id]/retire/route");
    const response = await POST(
      request("/api/cms/media/7/retire", "POST", "https://attacker.example"),
      { params: Promise.resolve({ id: "7" }) },
    );
    expect(response.status).toBe(403);
    expect(authMocks.requireAuthenticatedAdmin).not.toHaveBeenCalled();
  });

  it("returns reference summaries with 409", async () => {
    const payload = { id: "payload" };
    authMocks.requireAuthenticatedAdmin.mockResolvedValue({ id: 3 });
    payloadMocks.getPayload.mockResolvedValue(payload);
    lifecycleMocks.retireMedia.mockRejectedValue(new lifecycleMocks.MediaReferencedError([
      { path: "primaryImageId", source: "product", sourceId: "10" },
    ]));

    const { POST } = await import("../../app/api/cms/media/[id]/retire/route");
    const response = await POST(request("/api/cms/media/7/retire"), {
      params: Promise.resolve({ id: "7" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: "media_referenced",
      references: [{ path: "primaryImageId", source: "product", sourceId: "10" }],
    });
  });
});

describe("media cleanup route authentication", () => {
  beforeEach(() => {
    lifecycleMocks.cleanupRetiredMedia.mockReset();
    payloadMocks.getPayload.mockReset();
  });

  it("uses the shared constant-time bearer policy", async () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-secret";
    try {
      const { GET } = await import("../../app/api/cron/media-cleanup/route");
      const response = await GET(new Request("https://ajazz.jp/api/cron/media-cleanup", {
        headers: { authorization: "Bearer wrong" },
      }));
      expect(response.status).toBe(401);
      expect(lifecycleMocks.cleanupRetiredMedia).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  it("runs cleanup for the configured bearer secret", async () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-secret";
    const payload = { id: "payload" };
    payloadMocks.getPayload.mockResolvedValue(payload);
    lifecycleMocks.cleanupRetiredMedia.mockResolvedValue({ deleted: 1, failed: 0, referenced: 0 });
    try {
      const { GET } = await import("../../app/api/cron/media-cleanup/route");
      const response = await GET(new Request("https://ajazz.jp/api/cron/media-cleanup", {
        headers: { authorization: "Bearer cron-secret" },
      }));

      expect(response.status).toBe(200);
      expect(lifecycleMocks.cleanupRetiredMedia).toHaveBeenCalledWith({
        deleteObject: lifecycleMocks.deleteR2MediaObject,
        payload,
      });
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});
