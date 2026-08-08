import { describe, expect, it, vi } from "vitest";
import { writeAuditEvent } from "../../cms/hooks/writeAuditEvent";
import { runPayloadTransaction } from "../../cms/services/payloadTransaction";

function transactionApi(events: string[]) {
  const req = { payload: {}, transactionID: "tx-1" };
  return {
    api: {
      commitTransaction: vi.fn(async () => { events.push("commit"); }),
      createLocalReq: vi.fn(async () => req),
      initTransaction: vi.fn(async () => { events.push("begin"); return true; }),
      killTransaction: vi.fn(async () => { events.push("rollback"); }),
    },
    req,
  };
}

describe("Payload transaction helper", () => {
  it("commits all work through one local request", async () => {
    const events: string[] = [];
    const { api, req } = transactionApi(events);

    await expect(runPayloadTransaction({} as never, async (transactionReq) => {
      expect(transactionReq).toBe(req);
      events.push("work");
      return 7;
    }, api as never)).resolves.toBe(7);

    expect(events).toEqual(["begin", "work", "commit"]);
  });

  it("rolls back when transactional work fails", async () => {
    const events: string[] = [];
    const { api } = transactionApi(events);

    await expect(runPayloadTransaction({} as never, async () => {
      events.push("audit");
      throw new Error("audit unavailable");
    }, api as never)).rejects.toThrow("audit unavailable");

    expect(events).toEqual(["begin", "audit", "rollback"]);
    expect(api.commitTransaction).not.toHaveBeenCalled();
  });

  it("carries the authenticated actor into the local request used by product audit hooks", async () => {
    const events: string[] = [];
    const createAudit = vi.fn().mockResolvedValue({ id: 9 });
    const actor = { id: 1, email: "xiet@a-jazz.com" };
    const req = {
      payload: { create: createAudit },
      transactionID: "tx-1",
      user: null as typeof actor | null,
    };
    const api = {
      commitTransaction: vi.fn(async () => { events.push("commit"); }),
      createLocalReq: vi.fn(async (options: { user?: typeof actor }) => {
        req.user = options.user ?? null;
        return req;
      }),
      initTransaction: vi.fn(async () => { events.push("begin"); return true; }),
      killTransaction: vi.fn(async () => { events.push("rollback"); }),
    };

    await runPayloadTransaction({} as never, async (transactionReq) => {
      await writeAuditEvent({
        data: { name: "Published name" },
        doc: { id: 7 },
        operation: "update",
        previousDoc: { editorialRevision: 3 },
        req: transactionReq,
      } as never);
    }, api as never, { user: actor as never });

    expect(api.createLocalReq).toHaveBeenCalledWith({ user: actor }, expect.anything());
    expect(createAudit).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ actor: actor.id, subjectId: "7" }),
      req,
    }));
    expect(events).toEqual(["begin", "commit"]);
  });
});
