import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "payload";

const { executeMock, getPayloadMock, requireAdminMock } = vi.hoisted(() => ({
  executeMock: vi.fn(async (input: Record<string, unknown>) => ({ action: input.action })),
  getPayloadMock: vi.fn(async () => ({})),
  requireAdminMock: vi.fn(async () => ({ id: 1, email: "xiet@a-jazz.com", role: "administrator" })),
}));

vi.mock("payload", async (importOriginal) => ({
  ...await importOriginal<typeof import("payload")>(),
  getPayload: getPayloadMock,
}));
vi.mock("../../lib/cms/auth", () => ({ requireAuthenticatedAdmin: requireAdminMock }));
vi.mock("../../lib/cms/publication-route", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../lib/cms/publication-route")>(),
  executePublicationAction: executeMock,
}));

import { POST as publish } from "../../app/api/cms/products/[id]/publish/route";
import { POST as unpublish } from "../../app/api/cms/products/[id]/unpublish/route";

function request(body: unknown, origin = "https://ajazz.jp") {
  return new Request("https://ajazz.jp/api/cms/products/1/action", {
    method: "POST",
    headers: { "content-type": "application/json", host: "ajazz.jp", origin },
    body: JSON.stringify(body),
  });
}

describe("product publication routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects cross-origin requests before authentication", async () => {
    const response = await publish(request({ expectedRevision: 3 }, "https://evil.example"), { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(403);
    expect(requireAdminMock).not.toHaveBeenCalled();
  });

  it("rejects state-changing requests without an origin", async () => {
    const noOrigin = new Request("https://ajazz.jp/api/cms/products/1/publish", {
      method: "POST",
      headers: { "content-type": "application/json", host: "ajazz.jp" },
      body: JSON.stringify({ expectedRevision: 3 }),
    });
    const response = await publish(noOrigin, { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(403);
  });

  it("requires an authenticated administrator", async () => {
    requireAdminMock.mockRejectedValueOnce(new APIError("Unauthorized", 401));
    const response = await publish(request({ expectedRevision: 3 }), { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(401);
  });

  it("requires an integer expected revision", async () => {
    const response = await publish(request({ expectedRevision: "3" }), { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("returns a client error for malformed JSON", async () => {
    const malformed = new Request("https://ajazz.jp/api/cms/products/1/publish", {
      method: "POST",
      headers: { "content-type": "application/json", host: "ajazz.jp", origin: "https://ajazz.jp" },
      body: "{",
    });
    const response = await publish(malformed, { params: Promise.resolve({ id: "1" }) });
    expect(response.status).toBe(400);
  });

  it("dispatches publish and unpublish through the guarded service", async () => {
    const publishResponse = await publish(request({ expectedRevision: 3 }), { params: Promise.resolve({ id: "1" }) });
    const unpublishResponse = await unpublish(request({ expectedRevision: 3 }), { params: Promise.resolve({ id: "1" }) });
    expect(publishResponse.status).toBe(200);
    expect(unpublishResponse.status).toBe(200);
    expect(executeMock.mock.calls.map(([input]) => input.action)).toEqual(["publish", "unpublish"]);
  });
});
