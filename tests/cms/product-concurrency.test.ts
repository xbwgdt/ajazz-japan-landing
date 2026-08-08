import { describe, expect, it, vi } from "vitest";
import { lockProduct } from "../../cms/services/productConcurrency";

describe("product publication concurrency", () => {
  it("takes a transaction-scoped product advisory lock", async () => {
    const execute = vi.fn().mockResolvedValue([]);
    const req = {
      payload: { db: { sessions: { "tx-1": { db: { execute } } } } },
      transactionID: "tx-1",
    };

    await lockProduct(req as never, "product-7");

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("refuses to lock without the active Payload transaction", async () => {
    await expect(lockProduct({ payload: { db: {} } } as never, "product-7"))
      .rejects.toThrow("active Payload transaction");
  });
});
