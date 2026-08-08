import { type MigrateDownArgs, type MigrateUpArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms"."products"
      ADD COLUMN "last_published_revision" numeric,
      ADD COLUMN "last_publication_correlation_id" varchar;
    ALTER TABLE "cms"."_products_v"
      ADD COLUMN "version_last_published_revision" numeric,
      ADD COLUMN "version_last_publication_correlation_id" varchar;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "cms"."products"
      DROP COLUMN "last_published_revision",
      DROP COLUMN "last_publication_correlation_id";
    ALTER TABLE "cms"."_products_v"
      DROP COLUMN "version_last_published_revision",
      DROP COLUMN "version_last_publication_correlation_id";
  `);
}
