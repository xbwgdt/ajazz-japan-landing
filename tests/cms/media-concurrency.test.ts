import { describe, expect, it, vi } from "vitest";
import {
  lockMediaRows,
  normalizeMediaIds,
} from "../../cms/services/mediaConcurrency";

describe("media concurrency guard", () => {
  it("locks unique media rows in deterministic order inside the active transaction", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const req = {
      payload: {
        db: {
          sessions: { "tx-1": { db: { execute } } },
        },
      },
      transactionID: "tx-1",
    };

    await lockMediaRows(req as never, [9, 7, 9, 8]);

    expect(execute).toHaveBeenCalledTimes(3);
    expect(normalizeMediaIds([9, 7, 9, 8])).toEqual([7, 8, 9]);
  });

  it("refuses to run the guard outside a Payload transaction", async () => {
    await expect(lockMediaRows({ payload: { db: {} } } as never, [7]))
      .rejects.toThrow("active Payload transaction");
  });
});
