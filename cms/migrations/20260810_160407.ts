import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "cms"."product_os" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "cms"."supported_os",
    "id" serial PRIMARY KEY NOT NULL
  );

  ALTER TABLE "cms"."_supported_os_v" RENAME TO "_product_os_v";
  ALTER TABLE "cms"."_product_os_v" RENAME CONSTRAINT "_supported_os_v_parent_fk" TO "_product_os_v_parent_fk";
  ALTER INDEX "cms"."_supported_os_v_order_idx" RENAME TO "_product_os_v_order_idx";
  ALTER INDEX "cms"."_supported_os_v_parent_idx" RENAME TO "_product_os_v_parent_idx";

  ALTER TABLE "cms"."product_os" ADD CONSTRAINT "product_os_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "product_os_order_idx" ON "cms"."product_os" USING btree ("order");
  CREATE INDEX "product_os_parent_idx" ON "cms"."product_os" USING btree ("parent_id");
  CREATE INDEX "products_source_type_idx" ON "cms"."products" USING btree ("source_type");
  CREATE INDEX "products_category_idx" ON "cms"."products" USING btree ("category");
  CREATE INDEX "products_lifecycle_idx" ON "cms"."products" USING btree ("lifecycle");
  CREATE INDEX "_products_v_version_version_source_type_idx" ON "cms"."_products_v" USING btree ("version_source_type");
  CREATE INDEX "_products_v_version_version_category_idx" ON "cms"."_products_v" USING btree ("version_category");
  CREATE INDEX "_products_v_version_version_lifecycle_idx" ON "cms"."_products_v" USING btree ("version_lifecycle");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "cms"."product_os" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."product_os" CASCADE;
  DROP INDEX "cms"."products_source_type_idx";
  DROP INDEX "cms"."products_category_idx";
  DROP INDEX "cms"."products_lifecycle_idx";
  DROP INDEX "cms"."_products_v_version_version_source_type_idx";
  DROP INDEX "cms"."_products_v_version_version_category_idx";
  DROP INDEX "cms"."_products_v_version_version_lifecycle_idx";
  ALTER INDEX "cms"."_product_os_v_order_idx" RENAME TO "_supported_os_v_order_idx";
  ALTER INDEX "cms"."_product_os_v_parent_idx" RENAME TO "_supported_os_v_parent_idx";
  ALTER TABLE "cms"."_product_os_v" RENAME CONSTRAINT "_product_os_v_parent_fk" TO "_supported_os_v_parent_fk";
  ALTER TABLE "cms"."_product_os_v" RENAME TO "_supported_os_v";`)
}
