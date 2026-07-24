import { describe, expect, it } from "vitest";
import { commerceSchemaSql } from "../../lib/commerce/db";

describe("commerce database schema", () => {
  it("keeps RMS products and variants idempotent across imports", () => {
    expect(commerceSchemaSql).toContain("UNIQUE (rms_manage_number)");
    expect(commerceSchemaSql).toContain("UNIQUE (product_id, rms_sku_number)");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS product_images");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS inventory_sync_logs");
  });

  it("persists expiring checkout reservations by idempotency key", () => {
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS stock_reservations");
    expect(commerceSchemaSql).toContain("idempotency_key TEXT NOT NULL UNIQUE");
    expect(commerceSchemaSql).toContain("expires_at TIMESTAMPTZ NOT NULL");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS stock_reservation_items");
    expect(commerceSchemaSql).toContain("variant_id BIGINT NOT NULL REFERENCES product_variants(id)");
  });

  it("stores Stripe payment and manual fulfillment records", () => {
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS orders");
    expect(commerceSchemaSql).toContain("stripe_checkout_session_id TEXT NOT NULL UNIQUE");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS order_items");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS payments");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS refunds");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS fulfillments");
  });
});
