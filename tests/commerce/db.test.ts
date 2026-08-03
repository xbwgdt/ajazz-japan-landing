import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { commerceSchemaSql } from "../../lib/commerce/db";

describe("commerce database schema", () => {
  it("keeps RMS products and variants idempotent across imports", () => {
    expect(commerceSchemaSql).toContain("UNIQUE (rms_manage_number)");
    expect(commerceSchemaSql).toContain("category TEXT NOT NULL DEFAULT 'other'");
    expect(commerceSchemaSql).toContain("ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other'");
    expect(commerceSchemaSql).toContain("UNIQUE (product_id, rms_sku_number)");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS product_images");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS inventory_sync_logs");
  });

  it("persists expiring checkout reservations by idempotency key", () => {
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS stock_reservations");
    expect(commerceSchemaSql).toContain("idempotency_key TEXT NOT NULL UNIQUE");
    expect(commerceSchemaSql).toContain("expires_at TIMESTAMPTZ NOT NULL");
    expect(commerceSchemaSql).toContain("cart_fingerprint TEXT");
    expect(commerceSchemaSql).toContain("expected_total_jpy INTEGER");
    expect(commerceSchemaSql).toContain("stripe_checkout_session_id TEXT UNIQUE");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS stock_reservation_items");
    expect(commerceSchemaSql).toContain("variant_id BIGINT NOT NULL REFERENCES product_variants(id)");
    const checkoutStore = readFileSync(resolve(process.cwd(), "lib/commerce/checkout-db.ts"), "utf8");
    expect(checkoutStore).not.toContain("WITH expired AS");
  });

  it("stores Stripe payment and manual fulfillment records", () => {
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS orders");
    expect(commerceSchemaSql).toContain("stripe_checkout_session_id TEXT NOT NULL UNIQUE");
    expect(commerceSchemaSql).toContain("terms_accepted_at TIMESTAMPTZ");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS order_items");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS payments");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS refunds");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS fulfillments");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS stripe_webhook_events");
    expect(commerceSchemaSql).toContain("stripe_event_id TEXT NOT NULL UNIQUE");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS inventory_restock_events");
    expect(commerceSchemaSql).toContain("to_regclass('public.return_restock_events')");
    expect(commerceSchemaSql).toContain("INSERT INTO inventory_restock_events (order_id, reason, restocked_at)");
    expect(commerceSchemaSql).toContain("previous_order_status TEXT");
    expect(commerceSchemaSql).toContain("CREATE TABLE IF NOT EXISTS admin_login_attempts");
  });

  it("stores merchandising fields for selectable color variants", () => {
    expect(commerceSchemaSql).toContain("color_name TEXT");
    expect(commerceSchemaSql).toContain("image_url TEXT");
    expect(commerceSchemaSql).toContain("compare_at_price_jpy INTEGER");
    expect(commerceSchemaSql).toContain("compare_at_price_approved BOOLEAN NOT NULL DEFAULT FALSE");
  });
});
