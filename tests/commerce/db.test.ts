import { describe, expect, it } from "vitest";
import { commerceSchemaSql } from "../../lib/commerce/db";

describe("commerce database schema", () => {
  it("keeps RMS products and variants idempotent across imports", () => {
    expect(commerceSchemaSql).toContain("UNIQUE (rms_manage_number)");
    expect(commerceSchemaSql).toContain("UNIQUE (product_id, rms_sku_number)");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS product_images");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS inventory_sync_logs");
  });
});
