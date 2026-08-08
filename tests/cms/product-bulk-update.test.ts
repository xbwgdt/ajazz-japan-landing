import { describe, expect, it } from "vitest";
import { Products, rejectBulkProductUpdates } from "../../cms/collections/Products";

describe("product bulk update guard", () => {
  it("hides bulk editing in the admin", () => {
    expect(Products.disableBulkEdit).toBe(true);
  });

  it("rejects server-side updates without a specific product ID", () => {
    try {
      rejectBulkProductUpdates({
        args: { data: { featured: true }, where: { lifecycle: { equals: "active" } } },
        operation: "update",
      } as never);
      throw new Error("Expected bulk update rejection");
    } catch (error) {
      expect(error).toMatchObject({
        data: { code: "product_bulk_update_forbidden" },
        status: 400,
      });
    }
  });

  it("allows the normal single-product update path", () => {
    const args = { data: { featured: true }, id: 7 };
    expect(rejectBulkProductUpdates({ args, operation: "update" } as never)).toBe(args);
  });
});
