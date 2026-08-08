import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."enum_media_purpose" AS ENUM('product', 'seo', 'editorial');
  ALTER TABLE "cms"."media" ALTER COLUMN "filename" DROP NOT NULL;
  ALTER TABLE "cms"."media" ADD COLUMN "purpose" "cms"."enum_media_purpose";
  ALTER TABLE "cms"."media" ADD COLUMN "content_hash" varchar;
  ALTER TABLE "cms"."media" ADD COLUMN "retired_at" timestamp(3) with time zone;
  ALTER TABLE "cms"."media" ADD COLUMN "delete_after" timestamp(3) with time zone;
  ALTER TABLE "cms"."media" ADD COLUMN "retired_by_id" integer;
  ALTER TABLE "cms"."media" ADD COLUMN "url" varchar;
  ALTER TABLE "cms"."media" ADD COLUMN "thumbnail_u_r_l" varchar;
  ALTER TABLE "cms"."media" ADD COLUMN "mime_type" varchar;
  ALTER TABLE "cms"."media" ADD COLUMN "filesize" numeric;
  ALTER TABLE "cms"."media" ADD COLUMN "width" numeric;
  ALTER TABLE "cms"."media" ADD COLUMN "height" numeric;
  ALTER TABLE "cms"."media" ADD COLUMN "focal_x" numeric;
  ALTER TABLE "cms"."media" ADD COLUMN "focal_y" numeric;
  UPDATE "cms"."media"
    SET "purpose" = 'product',
        "content_hash" = 'legacy-unverified:' || "id"::text
    WHERE "purpose" IS NULL OR "content_hash" IS NULL;
  ALTER TABLE "cms"."media" ALTER COLUMN "purpose" SET NOT NULL;
  ALTER TABLE "cms"."media" ALTER COLUMN "content_hash" SET NOT NULL;
  ALTER TABLE "cms"."media" ADD CONSTRAINT "media_retired_by_id_admins_id_fk" FOREIGN KEY ("retired_by_id") REFERENCES "cms"."admins"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_content_hash_idx" ON "cms"."media" USING btree ("content_hash");
  CREATE INDEX "media_retired_at_idx" ON "cms"."media" USING btree ("retired_at");
  CREATE INDEX "media_delete_after_idx" ON "cms"."media" USING btree ("delete_after");
  CREATE INDEX "media_retired_by_idx" ON "cms"."media" USING btree ("retired_by_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."media" DROP CONSTRAINT "media_retired_by_id_admins_id_fk";
  
  DROP INDEX "cms"."media_content_hash_idx";
  DROP INDEX "cms"."media_retired_at_idx";
  DROP INDEX "cms"."media_delete_after_idx";
  DROP INDEX "cms"."media_retired_by_idx";
  ALTER TABLE "cms"."media" ALTER COLUMN "filename" SET NOT NULL;
  ALTER TABLE "cms"."media" DROP COLUMN "purpose";
  ALTER TABLE "cms"."media" DROP COLUMN "content_hash";
  ALTER TABLE "cms"."media" DROP COLUMN "retired_at";
  ALTER TABLE "cms"."media" DROP COLUMN "delete_after";
  ALTER TABLE "cms"."media" DROP COLUMN "retired_by_id";
  ALTER TABLE "cms"."media" DROP COLUMN "url";
  ALTER TABLE "cms"."media" DROP COLUMN "thumbnail_u_r_l";
  ALTER TABLE "cms"."media" DROP COLUMN "mime_type";
  ALTER TABLE "cms"."media" DROP COLUMN "filesize";
  ALTER TABLE "cms"."media" DROP COLUMN "width";
  ALTER TABLE "cms"."media" DROP COLUMN "height";
  ALTER TABLE "cms"."media" DROP COLUMN "focal_x";
  ALTER TABLE "cms"."media" DROP COLUMN "focal_y";
  DROP TYPE "cms"."enum_media_purpose";`)
}
