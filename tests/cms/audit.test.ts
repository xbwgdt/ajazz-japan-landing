import { describe, expect, it, vi } from "vitest";
import { AuditEvents, AUDIT_ACTIONS } from "../../cms/collections/AuditEvents";
import { writeAuditEvent } from "../../cms/hooks/writeAuditEvent";

describe("AuditEvents collection", () => {
  it("defines the complete immutable action set", () => {
    expect(AuditEvents.slug).toBe("audit-events");
    expect(AUDIT_ACTIONS).toEqual([
      "login_security",
      "create",
      "edit",
      "publish",
      "unpublish",
      "archive",
      "restore",
      "delete_draft",
      "approve_price",
      "adjust_inventory",
      "retire_media",
    ]);
  });

  it("allows administrator reads and creates but never updates or deletes", async () => {
    const authenticated = { req: { user: { id: 1 } } } as never;
    const anonymous = { req: { user: null } } as never;

    expect(await AuditEvents.access?.read?.(authenticated)).toBe(true);
    expect(await AuditEvents.access?.create?.(authenticated)).toBe(true);
    expect(await AuditEvents.access?.read?.(anonymous)).toBe(false);
    expect(await AuditEvents.access?.create?.(anonymous)).toBe(false);
    expect(await AuditEvents.access?.update?.(authenticated)).toBe(false);
    expect(await AuditEvents.access?.delete?.(authenticated)).toBe(false);
  });

  it("indexes the required audit lookup fields", () => {
    const indexed = AuditEvents.fields
      .filter((field) => "name" in field && "index" in field && field.index)
      .map((field) => "name" in field ? field.name : "");

    expect(indexed).toEqual(expect.arrayContaining([
      "action",
      "actor",
      "subjectType",
      "subjectId",
    ]));
    expect(AuditEvents.timestamps).not.toBe(false);
  });
});

describe("writeAuditEvent", () => {
  it("awaits an access-controlled audit write using the same Payload request", async () => {
    let finishWrite: (() => void) | undefined;
    const create = vi.fn().mockImplementation(() => new Promise<void>((resolve) => {
      finishWrite = resolve;
    }));
    const req = { payload: { create }, user: { id: 9 } };
    let finished = false;

    const hookPromise = writeAuditEvent({
      doc: { id: 12, name: "Product" },
      operation: "update",
      previousDoc: { id: 12, name: "Old" },
      req,
    } as never).then(() => {
      finished = true;
    });

    await Promise.resolve();
    expect(finished).toBe(false);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      collection: "audit-events",
      data: expect.objectContaining({
        action: "edit",
        actor: 9,
        subjectId: "12",
        subjectType: "product",
      }),
      overrideAccess: false,
      req,
    }));

    finishWrite?.();
    await hookPromise;
    expect(finished).toBe(true);
  });

  it("rejects the protected product change when its audit write fails", async () => {
    const failure = new Error("audit unavailable");
    const req = {
      payload: { create: vi.fn().mockRejectedValue(failure) },
      user: { id: 9 },
    };

    await expect(writeAuditEvent({
      doc: { id: 12 },
      operation: "create",
      req,
    } as never)).rejects.toBe(failure);
  });
});
