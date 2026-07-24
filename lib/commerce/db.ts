import postgres from "postgres";

export class CommerceDatabaseNotConfiguredError extends Error {}

export const commerceSchemaSql = `
  CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    rms_manage_number TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description_html TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rms_manage_number)
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    rms_sku_number TEXT NOT NULL,
    price_jpy INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, rms_sku_number)
  );

  CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE (product_id, position)
  );

  CREATE TABLE IF NOT EXISTS inventory_sync_logs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL,
    updated_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
  );
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
