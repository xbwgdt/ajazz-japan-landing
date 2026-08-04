import { describe, expect, it } from "vitest";
import configPromise from "../../payload.config";
import {
  down as downInitialCms,
  up as upInitialCms,
} from "../../cms/migrations/20260804_040101_initial_cms";

type SqlQuery = {
  queryChunks?: unknown[];
};

const migrationTables = new Set([
  "admins_sessions",
  "admins",
  "payload_kv",
  "payload_locked_documents",
  "payload_locked_documents_rels",
  "payload_preferences",
  "payload_preferences_rels",
  "payload_migrations",
]);

const migrationTypeNames = new Set(["enum_admins_role"]);

const migrationIndexNames = new Set([
  "admins_sessions_order_idx",
  "admins_sessions_parent_id_idx",
  "admins_updated_at_idx",
  "admins_created_at_idx",
  "admins_email_idx",
  "payload_kv_key_idx",
  "payload_locked_documents_global_slug_idx",
  "payload_locked_documents_updated_at_idx",
  "payload_locked_documents_created_at_idx",
  "payload_locked_documents_rels_order_idx",
  "payload_locked_documents_rels_parent_idx",
  "payload_locked_documents_rels_path_idx",
  "payload_locked_documents_rels_admins_id_idx",
  "payload_preferences_key_idx",
  "payload_preferences_updated_at_idx",
  "payload_preferences_created_at_idx",
  "payload_preferences_rels_order_idx",
  "payload_preferences_rels_parent_idx",
  "payload_preferences_rels_path_idx",
  "payload_preferences_rels_admins_id_idx",
  "payload_migrations_updated_at_idx",
  "payload_migrations_created_at_idx",
]);

function renderSql(query: unknown): string {
  const chunks = (query as SqlQuery).queryChunks;
  if (!Array.isArray(chunks)) {
    throw new Error("Expected migration to execute a Drizzle SQL query");
  }

  return chunks
    .flatMap((chunk) => {
      if (typeof chunk === "string") return [chunk];
      if (!chunk || typeof chunk !== "object" || !("value" in chunk)) return [];

      const value = (chunk as { value: unknown }).value;
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    })
    .join("");
}

function statements(sql: string): string[] {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runMigration(
  migration: typeof upInitialCms | typeof downInitialCms,
): Promise<string[]> {
  const executed: string[] = [];
  await migration({
    db: {
      execute: async (query: unknown) => {
        executed.push(renderSql(query));
      },
    },
  } as never);
  return executed.flatMap(statements);
}

function expectQualifiedMigrationTarget(statement: string): void {
  if (/^CREATE TYPE\b/i.test(statement)) {
    const match = statement.match(/^CREATE TYPE "cms"\."([^"]+)" AS ENUM\b/i);
    expect(match, `CREATE TYPE target must be schema-qualified: ${statement}`).not.toBeNull();
    if (match) expect(migrationTypeNames.has(match[1])).toBe(true);
    return;
  }

  if (/^CREATE TABLE\b/i.test(statement)) {
    const match = statement.match(/^CREATE TABLE "cms"\."([^"]+)" \(/i);
    expect(match, `CREATE TABLE target must be schema-qualified: ${statement}`).not.toBeNull();
    if (match) expect(migrationTables.has(match[1])).toBe(true);
    return;
  }

  if (/^ALTER TABLE\b/i.test(statement)) {
    const match = statement.match(/^ALTER TABLE "cms"\."([^"]+)" ADD CONSTRAINT\b/i);
    expect(match, `ALTER TABLE target must be schema-qualified: ${statement}`).not.toBeNull();
    if (match) expect(migrationTables.has(match[1])).toBe(true);
    return;
  }

  if (/^CREATE (?:UNIQUE )?INDEX\b/i.test(statement)) {
    const match = statement.match(
      /^CREATE (?:UNIQUE )?INDEX "([^"]+)" ON "cms"\."([^"]+)" USING\b/i,
    );
    expect(match, `CREATE INDEX target must be schema-qualified: ${statement}`).not.toBeNull();
    if (match) {
      expect(migrationIndexNames.has(match[1])).toBe(true);
      expect(migrationTables.has(match[2])).toBe(true);
    }
    return;
  }

  if (/^DROP TABLE\b/i.test(statement)) {
    const match = statement.match(/^DROP TABLE "cms"\."([^"]+)"$/i);
    expect(match, `DROP TABLE target must be schema-qualified: ${statement}`).not.toBeNull();
    if (match) expect(migrationTables.has(match[1])).toBe(true);
    return;
  }

  if (/^DROP TYPE\b/i.test(statement)) {
    const match = statement.match(/^DROP TYPE "cms"\."([^"]+)"$/i);
    expect(match, `DROP TYPE target must be schema-qualified: ${statement}`).not.toBeNull();
    if (match) expect(migrationTypeNames.has(match[1])).toBe(true);
    return;
  }

  throw new Error(`Unexpected migration DDL statement: ${statement}`);
}

describe("Payload configuration", () => {
  it("isolates CMS configuration from the public commerce schema", async () => {
    const config = await configPromise;
    const db = (config.db.init as unknown as (args: { payload: unknown }) => {
      migrationDir?: string;
      push?: boolean;
      schemaName?: string;
    })({ payload: {} });

    expect(db.schemaName).toBe("cms");
    expect(db.push).toBe(false);
    expect(db.migrationDir).toBe("cms/migrations");
    expect(config.routes.admin).toBe("/cms");
    expect(config.routes.api).toBe("/api/cms");
    expect(config.collections?.map((item) => item.slug)).toContain("admins");
  });

  it("creates the CMS schema before any CMS object", async () => {
    const upStatements = await runMigration(upInitialCms);

    expect(upStatements[0]).toBe('CREATE SCHEMA IF NOT EXISTS "cms"');
  });

  it("limits migration DDL to this migration's CMS objects", async () => {
    const upStatements = await runMigration(upInitialCms);
    const downStatements = await runMigration(downInitialCms);

    expect(downStatements.some((statement) => /^DROP SCHEMA\b/i.test(statement))).toBe(false);
    expect(downStatements.some((statement) => /\bCASCADE\b/i.test(statement))).toBe(false);
    expect(upStatements.slice(1)).not.toContain(expect.stringMatching(/^CREATE SCHEMA\b/i));

    for (const statement of [...upStatements.slice(1), ...downStatements]) {
      expectQualifiedMigrationTarget(statement);
    }
  });
});
