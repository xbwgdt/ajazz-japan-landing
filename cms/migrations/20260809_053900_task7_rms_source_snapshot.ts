import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms"."products"
      ADD COLUMN "source_snapshot" jsonb,
      ADD COLUMN "source_updated_at" timestamp(3) with time zone;
    ALTER TABLE "cms"."_products_v"
      ADD COLUMN "version_source_snapshot" jsonb,
      ADD COLUMN "version_source_updated_at" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms"."products"
      DROP COLUMN "source_snapshot",
      DROP COLUMN "source_updated_at";
    ALTER TABLE "cms"."_products_v"
      DROP COLUMN "version_source_snapshot",
      DROP COLUMN "version_source_updated_at";
  `);
}
