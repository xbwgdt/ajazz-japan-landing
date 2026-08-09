import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."cat" AS ENUM('rapid-trigger-keyboard', 'mechanical-keyboard', 'membrane-keyboard', 'mouse', 'stream-controller', 'headset', 'other');
  CREATE TYPE "cms"."enum_site_settings_footer_navigation_href" AS ENUM('/', '/about', '/legal', '/privacy', '/terms');
  CREATE TYPE "cms"."enum_site_settings_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__site_settings_v_version_footer_navigation_href" AS ENUM('/', '/about', '/legal', '/privacy', '/terms');
  CREATE TYPE "cms"."enum__site_settings_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "cms"."featured_cats" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"category" "cms"."cat"
  );

  CREATE TABLE "cms"."site_settings_homepage_featured_products" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"slug" varchar
  );

  CREATE TABLE "cms"."site_settings_company_brand_paragraphs" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"text" varchar
  );

  CREATE TABLE "cms"."site_settings_company_support_paragraphs" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"text" varchar
  );

  CREATE TABLE "cms"."site_settings_company_business_paragraphs" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"text" varchar
  );

  CREATE TABLE "cms"."site_settings_footer_navigation" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar,
	"href" "cms"."enum_site_settings_footer_navigation_href"
  );

  CREATE TABLE "cms"."site_settings_social_links" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"label" varchar,
	"href" varchar
  );

  CREATE TABLE "cms"."site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"homepage_eyebrow" varchar,
	"homepage_title" varchar,
	"homepage_copy" varchar,
	"homepage_primary_command_label" varchar,
	"homepage_secondary_command_label" varchar,
	"homepage_hero_media_id_id" integer,
	"company_brand_eyebrow" varchar,
	"company_brand_title" varchar,
	"company_support_eyebrow" varchar,
	"company_support_title" varchar,
	"company_business_eyebrow" varchar,
	"company_business_title" varchar,
	"company_business_command_label" varchar,
	"contact_email" varchar DEFAULT 'xiet@a-jazz.com',
	"contact_phone" varchar DEFAULT '070-9319-5121',
	"footer_company_name" varchar,
	"footer_address" varchar,
	"legal_seller_name" varchar,
	"legal_responsible_person" varchar,
	"legal_address" varchar,
	"legal_phone" varchar,
	"legal_email" varchar,
	"legal_price_notice" varchar,
	"legal_additional_fees" varchar,
	"legal_payment" varchar,
	"legal_delivery" varchar,
	"legal_delivery_area" varchar,
	"legal_returns" varchar,
	"legal_refunds" varchar,
	"legal_quantity" varchar,
	"_status" "cms"."enum_site_settings_status" DEFAULT 'draft',
	"updated_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone
  );

  CREATE TABLE "cms"."_featured_cats_v" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"category" "cms"."cat",
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v_version_homepage_featured_products" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v_version_company_brand_paragraphs" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"text" varchar,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v_version_company_support_paragraphs" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"text" varchar,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v_version_company_business_paragraphs" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"text" varchar,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v_version_footer_navigation" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar,
	"href" "cms"."enum__site_settings_v_version_footer_navigation_href",
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v_version_social_links" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar,
	"href" varchar,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_site_settings_v" (
	"id" serial PRIMARY KEY NOT NULL,
	"version_homepage_eyebrow" varchar,
	"version_homepage_title" varchar,
	"version_homepage_copy" varchar,
	"version_homepage_primary_command_label" varchar,
	"version_homepage_secondary_command_label" varchar,
	"version_homepage_hero_media_id_id" integer,
	"version_company_brand_eyebrow" varchar,
	"version_company_brand_title" varchar,
	"version_company_support_eyebrow" varchar,
	"version_company_support_title" varchar,
	"version_company_business_eyebrow" varchar,
	"version_company_business_title" varchar,
	"version_company_business_command_label" varchar,
	"version_contact_email" varchar DEFAULT 'xiet@a-jazz.com',
	"version_contact_phone" varchar DEFAULT '070-9319-5121',
	"version_footer_company_name" varchar,
	"version_footer_address" varchar,
	"version_legal_seller_name" varchar,
	"version_legal_responsible_person" varchar,
	"version_legal_address" varchar,
	"version_legal_phone" varchar,
	"version_legal_email" varchar,
	"version_legal_price_notice" varchar,
	"version_legal_additional_fees" varchar,
	"version_legal_payment" varchar,
	"version_legal_delivery" varchar,
	"version_legal_delivery_area" varchar,
	"version_legal_returns" varchar,
	"version_legal_refunds" varchar,
	"version_legal_quantity" varchar,
	"version__status" "cms"."enum__site_settings_v_version_status" DEFAULT 'draft',
	"version_updated_at" timestamp(3) with time zone,
	"version_created_at" timestamp(3) with time zone,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"latest" boolean
  );

  ALTER TABLE "cms"."featured_cats" ADD CONSTRAINT "featured_cats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings_homepage_featured_products" ADD CONSTRAINT "site_settings_homepage_featured_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings_company_brand_paragraphs" ADD CONSTRAINT "site_settings_company_brand_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings_company_support_paragraphs" ADD CONSTRAINT "site_settings_company_support_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings_company_business_paragraphs" ADD CONSTRAINT "site_settings_company_business_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings_footer_navigation" ADD CONSTRAINT "site_settings_footer_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings_social_links" ADD CONSTRAINT "site_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."site_settings" ADD CONSTRAINT "site_settings_homepage_hero_media_id_id_media_id_fk" FOREIGN KEY ("homepage_hero_media_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_featured_cats_v" ADD CONSTRAINT "_featured_cats_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v_version_homepage_featured_products" ADD CONSTRAINT "_site_settings_v_version_homepage_featured_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v_version_company_brand_paragraphs" ADD CONSTRAINT "_site_settings_v_version_company_brand_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v_version_company_support_paragraphs" ADD CONSTRAINT "_site_settings_v_version_company_support_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v_version_company_business_paragraphs" ADD CONSTRAINT "_site_settings_v_version_company_business_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v_version_footer_navigation" ADD CONSTRAINT "_site_settings_v_version_footer_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v_version_social_links" ADD CONSTRAINT "_site_settings_v_version_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_site_settings_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_homepage_hero_media_id_id_media_id_fk" FOREIGN KEY ("version_homepage_hero_media_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "featured_cats_order_idx" ON "cms"."featured_cats" USING btree ("_order");
  CREATE INDEX "featured_cats_parent_id_idx" ON "cms"."featured_cats" USING btree ("_parent_id");
  CREATE INDEX "site_settings_homepage_featured_products_order_idx" ON "cms"."site_settings_homepage_featured_products" USING btree ("_order");
  CREATE INDEX "site_settings_homepage_featured_products_parent_id_idx" ON "cms"."site_settings_homepage_featured_products" USING btree ("_parent_id");
  CREATE INDEX "site_settings_company_brand_paragraphs_order_idx" ON "cms"."site_settings_company_brand_paragraphs" USING btree ("_order");
  CREATE INDEX "site_settings_company_brand_paragraphs_parent_id_idx" ON "cms"."site_settings_company_brand_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "site_settings_company_support_paragraphs_order_idx" ON "cms"."site_settings_company_support_paragraphs" USING btree ("_order");
  CREATE INDEX "site_settings_company_support_paragraphs_parent_id_idx" ON "cms"."site_settings_company_support_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "site_settings_company_business_paragraphs_order_idx" ON "cms"."site_settings_company_business_paragraphs" USING btree ("_order");
  CREATE INDEX "site_settings_company_business_paragraphs_parent_id_idx" ON "cms"."site_settings_company_business_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_navigation_order_idx" ON "cms"."site_settings_footer_navigation" USING btree ("_order");
  CREATE INDEX "site_settings_footer_navigation_parent_id_idx" ON "cms"."site_settings_footer_navigation" USING btree ("_parent_id");
  CREATE INDEX "site_settings_social_links_order_idx" ON "cms"."site_settings_social_links" USING btree ("_order");
  CREATE INDEX "site_settings_social_links_parent_id_idx" ON "cms"."site_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_homepage_homepage_hero_media_id_idx" ON "cms"."site_settings" USING btree ("homepage_hero_media_id_id");
  CREATE INDEX "site_settings__status_idx" ON "cms"."site_settings" USING btree ("_status");
  CREATE INDEX "_featured_cats_v_order_idx" ON "cms"."_featured_cats_v" USING btree ("_order");
  CREATE INDEX "_featured_cats_v_parent_id_idx" ON "cms"."_featured_cats_v" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_homepage_featured_products_order_idx" ON "cms"."_site_settings_v_version_homepage_featured_products" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_homepage_featured_products_parent_id_idx" ON "cms"."_site_settings_v_version_homepage_featured_products" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_company_brand_paragraphs_order_idx" ON "cms"."_site_settings_v_version_company_brand_paragraphs" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_company_brand_paragraphs_parent_id_idx" ON "cms"."_site_settings_v_version_company_brand_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_company_support_paragraphs_order_idx" ON "cms"."_site_settings_v_version_company_support_paragraphs" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_company_support_paragraphs_parent_id_idx" ON "cms"."_site_settings_v_version_company_support_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_company_business_paragraphs_order_idx" ON "cms"."_site_settings_v_version_company_business_paragraphs" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_company_business_paragraphs_parent_id_idx" ON "cms"."_site_settings_v_version_company_business_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_footer_navigation_order_idx" ON "cms"."_site_settings_v_version_footer_navigation" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_footer_navigation_parent_id_idx" ON "cms"."_site_settings_v_version_footer_navigation" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_social_links_order_idx" ON "cms"."_site_settings_v_version_social_links" USING btree ("_order");
  CREATE INDEX "_site_settings_v_version_social_links_parent_id_idx" ON "cms"."_site_settings_v_version_social_links" USING btree ("_parent_id");
  CREATE INDEX "_site_settings_v_version_homepage_version_homepage_hero__idx" ON "cms"."_site_settings_v" USING btree ("version_homepage_hero_media_id_id");
  CREATE INDEX "_site_settings_v_version_version__status_idx" ON "cms"."_site_settings_v" USING btree ("version__status");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "cms"."_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "cms"."_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "_site_settings_v_latest_idx" ON "cms"."_site_settings_v" USING btree ("latest");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "cms"."featured_cats" CASCADE;
  DROP TABLE "cms"."site_settings_homepage_featured_products" CASCADE;
  DROP TABLE "cms"."site_settings_company_brand_paragraphs" CASCADE;
  DROP TABLE "cms"."site_settings_company_support_paragraphs" CASCADE;
  DROP TABLE "cms"."site_settings_company_business_paragraphs" CASCADE;
  DROP TABLE "cms"."site_settings_footer_navigation" CASCADE;
  DROP TABLE "cms"."site_settings_social_links" CASCADE;
  DROP TABLE "cms"."site_settings" CASCADE;
  DROP TABLE "cms"."_featured_cats_v" CASCADE;
  DROP TABLE "cms"."_site_settings_v_version_homepage_featured_products" CASCADE;
  DROP TABLE "cms"."_site_settings_v_version_company_brand_paragraphs" CASCADE;
  DROP TABLE "cms"."_site_settings_v_version_company_support_paragraphs" CASCADE;
  DROP TABLE "cms"."_site_settings_v_version_company_business_paragraphs" CASCADE;
  DROP TABLE "cms"."_site_settings_v_version_footer_navigation" CASCADE;
  DROP TABLE "cms"."_site_settings_v_version_social_links" CASCADE;
  DROP TABLE "cms"."_site_settings_v" CASCADE;
  DROP TYPE "cms"."cat";
  DROP TYPE "cms"."enum_site_settings_footer_navigation_href";
  DROP TYPE "cms"."enum_site_settings_status";
  DROP TYPE "cms"."enum__site_settings_v_version_footer_navigation_href";
  DROP TYPE "cms"."enum__site_settings_v_version_status";`)
}
