import postgres from "postgres";

export class CommerceDatabaseNotConfiguredError extends Error {}

export const commerceSchemaSql = `
  CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    rms_manage_number TEXT,
    cms_product_id TEXT,
    source_type TEXT NOT NULL DEFAULT 'rms',
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description_html TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'other',
    short_statement TEXT,
    seo_title TEXT,
    seo_description TEXT,
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    merchandising_order INTEGER NOT NULL DEFAULT 0,
    lifecycle TEXT NOT NULL DEFAULT 'unpublished',
    published BOOLEAN NOT NULL DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    unpublished_at TIMESTAMPTZ,
    publication_revision INTEGER NOT NULL DEFAULT 0,
    last_publication_correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS products_rms_manage_number_unique_nonnull
  ON public.products (rms_manage_number) WHERE rms_manage_number IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS products_cms_product_id_unique_nonnull
  ON public.products (cms_product_id) WHERE cms_product_id IS NOT NULL;

  CREATE TABLE IF NOT EXISTS public.product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    cms_variant_id TEXT,
    sku TEXT,
    rms_sku_number TEXT,
    inventory_mode TEXT NOT NULL DEFAULT 'rms',
    price_jpy INTEGER NOT NULL,
    compare_at_price_jpy INTEGER,
    compare_at_price_approved BOOLEAN NOT NULL DEFAULT FALSE,
    comparison_evidence_type TEXT,
    comparison_evidence_reference TEXT,
    comparison_approved_by TEXT,
    comparison_approved_at TIMESTAMPTZ,
    color_name TEXT,
    color_swatch TEXT,
    thumbnail_url TEXT,
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE UNIQUE INDEX IF NOT EXISTS product_variants_rms_sku_unique_nonnull
  ON public.product_variants (product_id, rms_sku_number) WHERE rms_sku_number IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS product_variants_cms_variant_id_unique_nonnull
  ON public.product_variants (cms_variant_id) WHERE cms_variant_id IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_sku_unique_nonnull
  ON public.product_variants (product_id, sku) WHERE sku IS NOT NULL;

  CREATE TABLE IF NOT EXISTS public.product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    cms_media_id TEXT,
    position INTEGER NOT NULL,
    UNIQUE (product_id, position)
  );

  CREATE TABLE IF NOT EXISTS public.publication_audit_events (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('publish', 'unpublish')),
    actor_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    cms_product_id TEXT NOT NULL,
    operational_product_id BIGINT NOT NULL REFERENCES public.products(id),
    publication_revision INTEGER NOT NULL,
    correlation_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.manual_inventory_adjustments (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES public.products(id),
    variant_id BIGINT NOT NULL REFERENCES public.product_variants(id),
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL CHECK (new_quantity >= 0),
    reason TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    correlation_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE OR REPLACE FUNCTION public.reject_append_only_mutation()
  RETURNS trigger LANGUAGE plpgsql AS $function$
  BEGIN
    RAISE EXCEPTION 'append-only table cannot be mutated';
  END
  $function$;

  DO $append_only$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'publication_audit_events_append_only') THEN
      CREATE TRIGGER publication_audit_events_append_only
      BEFORE UPDATE OR DELETE ON public.publication_audit_events
      FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'manual_inventory_adjustments_append_only') THEN
      CREATE TRIGGER manual_inventory_adjustments_append_only
      BEFORE UPDATE OR DELETE ON public.manual_inventory_adjustments
      FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();
    END IF;
  END
  $append_only$;

  CREATE TABLE IF NOT EXISTS inventory_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    updated_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS stock_reservations (
    id UUID PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    cart_fingerprint TEXT,
    expected_total_jpy INTEGER,
    stripe_checkout_session_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS stock_reservation_items (
    reservation_id UUID NOT NULL REFERENCES stock_reservations(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (reservation_id, variant_id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    reservation_id UUID NOT NULL UNIQUE REFERENCES stock_reservations(id),
    stripe_checkout_session_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'paid',
    customer_email TEXT,
    shipping_address JSONB,
    terms_accepted_at TIMESTAMPTZ,
    subtotal_jpy INTEGER NOT NULL,
    shipping_jpy INTEGER NOT NULL DEFAULT 0,
    total_jpy INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    name TEXT NOT NULL,
    unit_price_jpy INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount_jpy INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stripe_refund_id TEXT UNIQUE,
    amount_jpy INTEGER NOT NULL,
    status TEXT NOT NULL,
    previous_order_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS inventory_restock_events (
    order_id UUID PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    stripe_refund_id TEXT,
    restocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  DO $migration$
  BEGIN
    IF to_regclass('public.return_restock_events') IS NOT NULL THEN
      INSERT INTO inventory_restock_events (order_id, reason, restocked_at)
      SELECT order_id, 'returned_item', received_at
      FROM return_restock_events
      ON CONFLICT (order_id) DO NOTHING;
    END IF;
  END
  $migration$;

  CREATE TABLE IF NOT EXISTS admin_login_attempts (
    id BIGSERIAL PRIMARY KEY,
    client_key TEXT NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS admin_login_attempts_client_time_idx
  ON admin_login_attempts (client_key, attempted_at DESC);

  CREATE TABLE IF NOT EXISTS fulfillments (
    id BIGSERIAL PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier TEXT,
    tracking_number TEXT UNIQUE,
    shipped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    stripe_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER NOT NULL DEFAULT 0;

  ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS compare_at_price_jpy INTEGER;

  ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS compare_at_price_approved BOOLEAN NOT NULL DEFAULT FALSE;

  ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS color_name TEXT;

  ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS image_url TEXT;

  ALTER TABLE public.products ALTER COLUMN rms_manage_number DROP NOT NULL;
  ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_rms_manage_number_key;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cms_product_id TEXT;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'rms';
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_statement TEXT;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_title TEXT;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seo_description TEXT;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS merchandising_order INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS lifecycle TEXT NOT NULL DEFAULT 'unpublished';
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMPTZ;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS publication_revision INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.products ADD COLUMN IF NOT EXISTS last_publication_correlation_id TEXT;

  CREATE UNIQUE INDEX IF NOT EXISTS products_rms_manage_number_unique_nonnull
  ON public.products (rms_manage_number) WHERE rms_manage_number IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS products_cms_product_id_unique_nonnull
  ON public.products (cms_product_id) WHERE cms_product_id IS NOT NULL;

  ALTER TABLE public.product_variants ALTER COLUMN rms_sku_number DROP NOT NULL;
  ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_product_id_rms_sku_number_key;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS cms_variant_id TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS sku TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS inventory_mode TEXT NOT NULL DEFAULT 'rms';
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS color_swatch TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS comparison_evidence_type TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS comparison_evidence_reference TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS comparison_approved_by TEXT;
  ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS comparison_approved_at TIMESTAMPTZ;

  CREATE UNIQUE INDEX IF NOT EXISTS product_variants_rms_sku_unique_nonnull
  ON public.product_variants (product_id, rms_sku_number) WHERE rms_sku_number IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS product_variants_cms_variant_id_unique_nonnull
  ON public.product_variants (cms_variant_id) WHERE cms_variant_id IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_sku_unique_nonnull
  ON public.product_variants (product_id, sku) WHERE sku IS NOT NULL;

  ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS cms_media_id TEXT;

  ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

  ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

  ALTER TABLE stock_reservations
  ADD COLUMN IF NOT EXISTS cart_fingerprint TEXT;

  ALTER TABLE stock_reservations
  ADD COLUMN IF NOT EXISTS expected_total_jpy INTEGER;

  ALTER TABLE stock_reservations
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

  CREATE UNIQUE INDEX IF NOT EXISTS stock_reservations_checkout_session_idx
  ON stock_reservations (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

  ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS previous_order_status TEXT;
`;

let sqlClient: ReturnType<typeof postgres> | undefined;

export function commerceSql() {
  if (!sqlClient) {
    sqlClient = postgres(databaseUrl(), {
      connect_timeout: 10,
      idle_timeout: 20,
      max: 1,
      prepare: false,
      ssl: "require",
    });
  }

  return sqlClient;
}

export async function ensureCommerceSchema() {
  await commerceSql().unsafe(commerceSchemaSql);
}

function databaseUrl() {
  const value = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!value) {
    throw new CommerceDatabaseNotConfiguredError(
      "Database connection is not configured",
    );
  }
  return value;
}
