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
    const ddlStatements = [...upStatements, ...downStatements].filter((statement) =>
      /^(CREATE|ALTER|DROP)\s+(SCHEMA|TYPE|TABLE|INDEX)/i.test(statement),
    );

    expect(ddlStatements.some((statement) => /\bpublic\b/i.test(statement))).toBe(false);
    expect(downStatements.some((statement) => /^DROP SCHEMA\b/i.test(statement))).toBe(false);
    expect(downStatements.some((statement) => /\bCASCADE\b/i.test(statement))).toBe(false);

    for (const statement of downStatements.filter((item) => /^DROP TABLE\b/i.test(item))) {
      const table = statement.match(/^DROP TABLE "cms"\."([^"]+)"$/i)?.[1];
      expect(table).toBeDefined();
      expect(migrationTables.has(table as string)).toBe(true);
    }

    expect(downStatements).toContain('DROP TYPE "cms"."enum_admins_role"');
  });
});
