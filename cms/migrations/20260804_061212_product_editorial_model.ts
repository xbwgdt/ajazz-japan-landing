import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "cms"."supported_os" AS ENUM('windows', 'macos', 'linux', 'android', 'ios');
  CREATE TYPE "cms"."enum_products_variants_comparison_evidence_type" AS ENUM('manufacturer_price', 'recent_price', 'market_price');
  CREATE TYPE "cms"."enum_products_variants_inventory_mode" AS ENUM('rms', 'manual');
  CREATE TYPE "cms"."enum_products_specifications_connection_modes" AS ENUM('wired', '2.4ghz', 'bluetooth');
  CREATE TYPE "cms"."enum_products_specifications_headset_connection" AS ENUM('wired', '2.4ghz', 'bluetooth');
  CREATE TYPE "cms"."enum_products_source_type" AS ENUM('rms', 'manual');
  CREATE TYPE "cms"."enum_products_category" AS ENUM('rapid-trigger-keyboard', 'mechanical-keyboard', 'membrane-keyboard', 'mouse', 'stream-controller', 'headset', 'other');
  CREATE TYPE "cms"."enum_products_lifecycle" AS ENUM('active', 'unpublished', 'archived');
  CREATE TYPE "cms"."enum_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum__products_v_version_variants_comparison_evidence_type" AS ENUM('manufacturer_price', 'recent_price', 'market_price');
  CREATE TYPE "cms"."enum__products_v_version_variants_inventory_mode" AS ENUM('rms', 'manual');
  CREATE TYPE "cms"."enum__products_v_version_specifications_connection_modes" AS ENUM('wired', '2.4ghz', 'bluetooth');
  CREATE TYPE "cms"."enum__products_v_version_specifications_headset_connection" AS ENUM('wired', '2.4ghz', 'bluetooth');
  CREATE TYPE "cms"."enum__products_v_version_source_type" AS ENUM('rms', 'manual');
  CREATE TYPE "cms"."enum__products_v_version_category" AS ENUM('rapid-trigger-keyboard', 'mechanical-keyboard', 'membrane-keyboard', 'mouse', 'stream-controller', 'headset', 'other');
  CREATE TYPE "cms"."enum__products_v_version_lifecycle" AS ENUM('active', 'unpublished', 'archived');
  CREATE TYPE "cms"."enum__products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "cms"."enum_audit_events_action" AS ENUM('login_security', 'create', 'edit', 'publish', 'unpublish', 'archive', 'restore', 'delete_draft', 'approve_price', 'adjust_inventory', 'retire_media');
  CREATE TABLE "cms"."media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar NOT NULL,
	"alt" varchar NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "cms"."products_variants" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"operational_variant_id" varchar,
	"sku" varchar,
	"rms_sku_number" varchar,
	"color_name" varchar,
	"color_swatch" varchar,
	"thumbnail_id_id" integer,
	"image_id_id" integer,
	"sale_price_jpy" numeric,
	"compare_at_price_jpy" numeric,
	"comparison_evidence_type" "cms"."enum_products_variants_comparison_evidence_type",
	"comparison_evidence_reference" varchar,
	"comparison_approved_by_id" integer,
	"comparison_approved_at" timestamp(3) with time zone,
	"inventory_mode" "cms"."enum_products_variants_inventory_mode" DEFAULT 'manual',
	"active" boolean DEFAULT true
  );

  CREATE TABLE "cms"."products_specifications_connection_modes" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "cms"."enum_products_specifications_connection_modes",
	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "cms"."products_specifications_headset_connection" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "cms"."enum_products_specifications_headset_connection",
	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "cms"."products_specifications_supported_applications" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar
  );

  CREATE TABLE "cms"."products" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_type" "cms"."enum_products_source_type" DEFAULT 'manual',
	"rms_manage_number" varchar,
	"operational_product_id" varchar,
	"name" varchar,
	"slug" varchar,
	"short_statement" varchar,
	"description" jsonb,
	"category" "cms"."enum_products_category",
	"lifecycle" "cms"."enum_products_lifecycle" DEFAULT 'unpublished',
	"featured" boolean DEFAULT false,
	"merchandising_order" numeric DEFAULT 0,
	"primary_image_id_id" integer,
	"specifications_keyboard_layout" varchar,
	"specifications_size" varchar,
	"specifications_switch_type" varchar,
	"specifications_polling_rate_hz" numeric,
	"specifications_rapid_trigger_supported" boolean,
	"specifications_actuation_min_mm" numeric,
	"specifications_actuation_max_mm" numeric,
	"specifications_keycap_material" varchar,
	"specifications_mouse_sensor" varchar,
	"specifications_maximum_dpi" numeric,
	"specifications_weight_grams" numeric,
	"specifications_button_count" numeric,
	"specifications_driver_size_mm" numeric,
	"specifications_microphone_type" varchar,
	"specifications_stream_controller_key_count" numeric,
	"specifications_stream_controller_display_count" numeric,
	"seo_title" varchar,
	"seo_description" varchar,
	"seo_image_id_id" integer,
	"editorial_revision" numeric DEFAULT 0,
	"last_published_at" timestamp(3) with time zone,
	"last_published_by_id" integer,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"_status" "cms"."enum_products_status" DEFAULT 'draft'
  );

  CREATE TABLE "cms"."products_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" integer NOT NULL,
	"path" varchar NOT NULL,
	"media_id" integer
  );

  CREATE TABLE "cms"."_products_v_version_variants" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"operational_variant_id" varchar,
	"sku" varchar,
	"rms_sku_number" varchar,
	"color_name" varchar,
	"color_swatch" varchar,
	"thumbnail_id_id" integer,
	"image_id_id" integer,
	"sale_price_jpy" numeric,
	"compare_at_price_jpy" numeric,
	"comparison_evidence_type" "cms"."enum__products_v_version_variants_comparison_evidence_type",
	"comparison_evidence_reference" varchar,
	"comparison_approved_by_id" integer,
	"comparison_approved_at" timestamp(3) with time zone,
	"inventory_mode" "cms"."enum__products_v_version_variants_inventory_mode" DEFAULT 'manual',
	"active" boolean DEFAULT true,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_products_v_version_specifications_connection_modes" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "cms"."enum__products_v_version_specifications_connection_modes",
	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "cms"."_products_v_version_specifications_headset_connection" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "cms"."enum__products_v_version_specifications_headset_connection",
	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "cms"."_products_v_version_specifications_supported_applications" (
	"_order" integer NOT NULL,
	"_parent_id" integer NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar,
	"_uuid" varchar
  );

  CREATE TABLE "cms"."_supported_os_v" (
	"order" integer NOT NULL,
	"parent_id" integer NOT NULL,
	"value" "cms"."supported_os",
	"id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "cms"."_products_v" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" integer,
	"version_source_type" "cms"."enum__products_v_version_source_type" DEFAULT 'manual',
	"version_rms_manage_number" varchar,
	"version_operational_product_id" varchar,
	"version_name" varchar,
	"version_slug" varchar,
	"version_short_statement" varchar,
	"version_description" jsonb,
	"version_category" "cms"."enum__products_v_version_category",
	"version_lifecycle" "cms"."enum__products_v_version_lifecycle" DEFAULT 'unpublished',
	"version_featured" boolean DEFAULT false,
	"version_merchandising_order" numeric DEFAULT 0,
	"version_primary_image_id_id" integer,
	"version_specifications_keyboard_layout" varchar,
	"version_specifications_size" varchar,
	"version_specifications_switch_type" varchar,
	"version_specifications_polling_rate_hz" numeric,
	"version_specifications_rapid_trigger_supported" boolean,
	"version_specifications_actuation_min_mm" numeric,
	"version_specifications_actuation_max_mm" numeric,
	"version_specifications_keycap_material" varchar,
	"version_specifications_mouse_sensor" varchar,
	"version_specifications_maximum_dpi" numeric,
	"version_specifications_weight_grams" numeric,
	"version_specifications_button_count" numeric,
	"version_specifications_driver_size_mm" numeric,
	"version_specifications_microphone_type" varchar,
	"version_specifications_stream_controller_key_count" numeric,
	"version_specifications_stream_controller_display_count" numeric,
	"version_seo_title" varchar,
	"version_seo_description" varchar,
	"version_seo_image_id_id" integer,
	"version_editorial_revision" numeric DEFAULT 0,
	"version_last_published_at" timestamp(3) with time zone,
	"version_last_published_by_id" integer,
	"version_updated_at" timestamp(3) with time zone,
	"version_created_at" timestamp(3) with time zone,
	"version__status" "cms"."enum__products_v_version_status" DEFAULT 'draft',
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"latest" boolean,
	"autosave" boolean
  );

  CREATE TABLE "cms"."_products_v_rels" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer,
	"parent_id" integer NOT NULL,
	"path" varchar NOT NULL,
	"media_id" integer
  );

  CREATE TABLE "cms"."audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "cms"."enum_audit_events_action" NOT NULL,
	"actor_id" integer NOT NULL,
	"subject_type" varchar NOT NULL,
	"subject_id" varchar NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "media_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "products_id" integer;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD COLUMN "audit_events_id" integer;
  ALTER TABLE "cms"."products_variants" ADD CONSTRAINT "products_variants_thumbnail_id_id_media_id_fk" FOREIGN KEY ("thumbnail_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."products_variants" ADD CONSTRAINT "products_variants_image_id_id_media_id_fk" FOREIGN KEY ("image_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."products_variants" ADD CONSTRAINT "products_variants_comparison_approved_by_id_admins_id_fk" FOREIGN KEY ("comparison_approved_by_id") REFERENCES "cms"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."products_variants" ADD CONSTRAINT "products_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."products_specifications_connection_modes" ADD CONSTRAINT "products_specifications_connection_modes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."products_specifications_headset_connection" ADD CONSTRAINT "products_specifications_headset_connection_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."products_specifications_supported_applications" ADD CONSTRAINT "products_specifications_supported_applications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."products" ADD CONSTRAINT "products_primary_image_id_id_media_id_fk" FOREIGN KEY ("primary_image_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."products" ADD CONSTRAINT "products_seo_image_id_id_media_id_fk" FOREIGN KEY ("seo_image_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."products" ADD CONSTRAINT "products_last_published_by_id_admins_id_fk" FOREIGN KEY ("last_published_by_id") REFERENCES "cms"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_thumbnail_id_id_media_id_fk" FOREIGN KEY ("thumbnail_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_image_id_id_media_id_fk" FOREIGN KEY ("image_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_comparison_approved_by_id_admins_id_fk" FOREIGN KEY ("comparison_approved_by_id") REFERENCES "cms"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_variants" ADD CONSTRAINT "_products_v_version_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_specifications_connection_modes" ADD CONSTRAINT "_products_v_version_specifications_connection_modes_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_specifications_headset_connection" ADD CONSTRAINT "_products_v_version_specifications_headset_connection_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_version_specifications_supported_applications" ADD CONSTRAINT "_products_v_version_specifications_supported_applications_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "cms"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_supported_os_v" ADD CONSTRAINT "_supported_os_v_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_products_v" ADD CONSTRAINT "_products_v_parent_id_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v" ADD CONSTRAINT "_products_v_version_primary_image_id_id_media_id_fk" FOREIGN KEY ("version_primary_image_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v" ADD CONSTRAINT "_products_v_version_seo_image_id_id_media_id_fk" FOREIGN KEY ("version_seo_image_id_id") REFERENCES "cms"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v" ADD CONSTRAINT "_products_v_version_last_published_by_id_admins_id_fk" FOREIGN KEY ("version_last_published_by_id") REFERENCES "cms"."admins"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "cms"."_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."_products_v_rels" ADD CONSTRAINT "_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."audit_events" ADD CONSTRAINT "audit_events_actor_id_admins_id_fk" FOREIGN KEY ("actor_id") REFERENCES "cms"."admins"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "media_filename_idx" ON "cms"."media" USING btree ("filename");
  CREATE INDEX "media_updated_at_idx" ON "cms"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "cms"."media" USING btree ("created_at");
  CREATE INDEX "products_variants_order_idx" ON "cms"."products_variants" USING btree ("_order");
  CREATE INDEX "products_variants_parent_id_idx" ON "cms"."products_variants" USING btree ("_parent_id");
  CREATE INDEX "products_variants_operational_variant_id_idx" ON "cms"."products_variants" USING btree ("operational_variant_id");
  CREATE INDEX "products_variants_sku_idx" ON "cms"."products_variants" USING btree ("sku");
  CREATE INDEX "products_variants_rms_sku_number_idx" ON "cms"."products_variants" USING btree ("rms_sku_number");
  CREATE INDEX "products_variants_thumbnail_id_idx" ON "cms"."products_variants" USING btree ("thumbnail_id_id");
  CREATE INDEX "products_variants_image_id_idx" ON "cms"."products_variants" USING btree ("image_id_id");
  CREATE INDEX "products_variants_comparison_approved_by_idx" ON "cms"."products_variants" USING btree ("comparison_approved_by_id");
  CREATE INDEX "products_specifications_connection_modes_order_idx" ON "cms"."products_specifications_connection_modes" USING btree ("order");
  CREATE INDEX "products_specifications_connection_modes_parent_idx" ON "cms"."products_specifications_connection_modes" USING btree ("parent_id");
  CREATE INDEX "products_specifications_headset_connection_order_idx" ON "cms"."products_specifications_headset_connection" USING btree ("order");
  CREATE INDEX "products_specifications_headset_connection_parent_idx" ON "cms"."products_specifications_headset_connection" USING btree ("parent_id");
  CREATE INDEX "products_specifications_supported_applications_order_idx" ON "cms"."products_specifications_supported_applications" USING btree ("_order");
  CREATE INDEX "products_specifications_supported_applications_parent_id_idx" ON "cms"."products_specifications_supported_applications" USING btree ("_parent_id");
  CREATE INDEX "products_rms_manage_number_idx" ON "cms"."products" USING btree ("rms_manage_number");
  CREATE INDEX "products_operational_product_id_idx" ON "cms"."products" USING btree ("operational_product_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "cms"."products" USING btree ("slug");
  CREATE INDEX "products_primary_image_id_idx" ON "cms"."products" USING btree ("primary_image_id_id");
  CREATE INDEX "products_seo_image_id_idx" ON "cms"."products" USING btree ("seo_image_id_id");
  CREATE INDEX "products_last_published_by_idx" ON "cms"."products" USING btree ("last_published_by_id");
  CREATE INDEX "products_updated_at_idx" ON "cms"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "cms"."products" USING btree ("created_at");
  CREATE INDEX "products__status_idx" ON "cms"."products" USING btree ("_status");
  CREATE INDEX "products_rels_order_idx" ON "cms"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "cms"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "cms"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_media_id_idx" ON "cms"."products_rels" USING btree ("media_id");
  CREATE INDEX "_products_v_version_variants_order_idx" ON "cms"."_products_v_version_variants" USING btree ("_order");
  CREATE INDEX "_products_v_version_variants_parent_id_idx" ON "cms"."_products_v_version_variants" USING btree ("_parent_id");
  CREATE INDEX "_products_v_version_variants_operational_variant_id_idx" ON "cms"."_products_v_version_variants" USING btree ("operational_variant_id");
  CREATE INDEX "_products_v_version_variants_sku_idx" ON "cms"."_products_v_version_variants" USING btree ("sku");
  CREATE INDEX "_products_v_version_variants_rms_sku_number_idx" ON "cms"."_products_v_version_variants" USING btree ("rms_sku_number");
  CREATE INDEX "_products_v_version_variants_thumbnail_id_idx" ON "cms"."_products_v_version_variants" USING btree ("thumbnail_id_id");
  CREATE INDEX "_products_v_version_variants_image_id_idx" ON "cms"."_products_v_version_variants" USING btree ("image_id_id");
  CREATE INDEX "_products_v_version_variants_comparison_approved_by_idx" ON "cms"."_products_v_version_variants" USING btree ("comparison_approved_by_id");
  CREATE INDEX "_products_v_version_specifications_connection_modes_order_idx" ON "cms"."_products_v_version_specifications_connection_modes" USING btree ("order");
  CREATE INDEX "_products_v_version_specifications_connection_modes_parent_idx" ON "cms"."_products_v_version_specifications_connection_modes" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_specifications_headset_connection_order_idx" ON "cms"."_products_v_version_specifications_headset_connection" USING btree ("order");
  CREATE INDEX "_products_v_version_specifications_headset_connection_parent_idx" ON "cms"."_products_v_version_specifications_headset_connection" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_specifications_supported_applications_order_idx" ON "cms"."_products_v_version_specifications_supported_applications" USING btree ("_order");
  CREATE INDEX "_products_v_version_specifications_supported_applications_parent_id_idx" ON "cms"."_products_v_version_specifications_supported_applications" USING btree ("_parent_id");
  CREATE INDEX "_supported_os_v_order_idx" ON "cms"."_supported_os_v" USING btree ("order");
  CREATE INDEX "_supported_os_v_parent_idx" ON "cms"."_supported_os_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_parent_idx" ON "cms"."_products_v" USING btree ("parent_id");
  CREATE INDEX "_products_v_version_version_rms_manage_number_idx" ON "cms"."_products_v" USING btree ("version_rms_manage_number");
  CREATE INDEX "_products_v_version_version_operational_product_id_idx" ON "cms"."_products_v" USING btree ("version_operational_product_id");
  CREATE INDEX "_products_v_version_version_slug_idx" ON "cms"."_products_v" USING btree ("version_slug");
  CREATE INDEX "_products_v_version_version_primary_image_id_idx" ON "cms"."_products_v" USING btree ("version_primary_image_id_id");
  CREATE INDEX "_products_v_version_version_seo_image_id_idx" ON "cms"."_products_v" USING btree ("version_seo_image_id_id");
  CREATE INDEX "_products_v_version_version_last_published_by_idx" ON "cms"."_products_v" USING btree ("version_last_published_by_id");
  CREATE INDEX "_products_v_version_version_updated_at_idx" ON "cms"."_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_products_v_version_version_created_at_idx" ON "cms"."_products_v" USING btree ("version_created_at");
  CREATE INDEX "_products_v_version_version__status_idx" ON "cms"."_products_v" USING btree ("version__status");
  CREATE INDEX "_products_v_created_at_idx" ON "cms"."_products_v" USING btree ("created_at");
  CREATE INDEX "_products_v_updated_at_idx" ON "cms"."_products_v" USING btree ("updated_at");
  CREATE INDEX "_products_v_latest_idx" ON "cms"."_products_v" USING btree ("latest");
  CREATE INDEX "_products_v_autosave_idx" ON "cms"."_products_v" USING btree ("autosave");
  CREATE INDEX "_products_v_rels_order_idx" ON "cms"."_products_v_rels" USING btree ("order");
  CREATE INDEX "_products_v_rels_parent_idx" ON "cms"."_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_products_v_rels_path_idx" ON "cms"."_products_v_rels" USING btree ("path");
  CREATE INDEX "_products_v_rels_media_id_idx" ON "cms"."_products_v_rels" USING btree ("media_id");
  CREATE INDEX "audit_events_action_idx" ON "cms"."audit_events" USING btree ("action");
  CREATE INDEX "audit_events_actor_idx" ON "cms"."audit_events" USING btree ("actor_id");
  CREATE INDEX "audit_events_subject_type_idx" ON "cms"."audit_events" USING btree ("subject_type");
  CREATE INDEX "audit_events_subject_id_idx" ON "cms"."audit_events" USING btree ("subject_id");
  CREATE INDEX "audit_events_updated_at_idx" ON "cms"."audit_events" USING btree ("updated_at");
  CREATE INDEX "audit_events_created_at_idx" ON "cms"."audit_events" USING btree ("created_at");
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "cms"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "cms"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cms"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_events_id") REFERENCES "cms"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_audit_events_id_idx" ON "cms"."payload_locked_documents_rels" USING btree ("audit_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cms"."media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."products_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."products_specifications_connection_modes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."products_specifications_headset_connection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."products_specifications_supported_applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."products" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."products_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_products_v_version_variants" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_products_v_version_specifications_connection_modes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_products_v_version_specifications_headset_connection" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_products_v_version_specifications_supported_applications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_supported_os_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_products_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."_products_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cms"."audit_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "cms"."media" CASCADE;
  DROP TABLE "cms"."products_variants" CASCADE;
  DROP TABLE "cms"."products_specifications_connection_modes" CASCADE;
  DROP TABLE "cms"."products_specifications_headset_connection" CASCADE;
  DROP TABLE "cms"."products_specifications_supported_applications" CASCADE;
  DROP TABLE "cms"."products" CASCADE;
  DROP TABLE "cms"."products_rels" CASCADE;
  DROP TABLE "cms"."_products_v_version_variants" CASCADE;
  DROP TABLE "cms"."_products_v_version_specifications_connection_modes" CASCADE;
  DROP TABLE "cms"."_products_v_version_specifications_headset_connection" CASCADE;
  DROP TABLE "cms"."_products_v_version_specifications_supported_applications" CASCADE;
  DROP TABLE "cms"."_supported_os_v" CASCADE;
  DROP TABLE "cms"."_products_v" CASCADE;
  DROP TABLE "cms"."_products_v_rels" CASCADE;
  DROP TABLE "cms"."audit_events" CASCADE;
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_media_fk";

  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_products_fk";

  ALTER TABLE "cms"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_events_fk";

  DROP INDEX "cms"."payload_locked_documents_rels_media_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_products_id_idx";
  DROP INDEX "cms"."payload_locked_documents_rels_audit_events_id_idx";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "media_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "products_id";
  ALTER TABLE "cms"."payload_locked_documents_rels" DROP COLUMN "audit_events_id";
  DROP TYPE "cms"."supported_os";
  DROP TYPE "cms"."enum_products_variants_comparison_evidence_type";
  DROP TYPE "cms"."enum_products_variants_inventory_mode";
  DROP TYPE "cms"."enum_products_specifications_connection_modes";
  DROP TYPE "cms"."enum_products_specifications_headset_connection";
  DROP TYPE "cms"."enum_products_source_type";
  DROP TYPE "cms"."enum_products_category";
  DROP TYPE "cms"."enum_products_lifecycle";
  DROP TYPE "cms"."enum_products_status";
  DROP TYPE "cms"."enum__products_v_version_variants_comparison_evidence_type";
  DROP TYPE "cms"."enum__products_v_version_variants_inventory_mode";
  DROP TYPE "cms"."enum__products_v_version_specifications_connection_modes";
  DROP TYPE "cms"."enum__products_v_version_specifications_headset_connection";
  DROP TYPE "cms"."enum__products_v_version_source_type";
  DROP TYPE "cms"."enum__products_v_version_category";
  DROP TYPE "cms"."enum__products_v_version_lifecycle";
  DROP TYPE "cms"."enum__products_v_version_status";
  DROP TYPE "cms"."enum_audit_events_action";`)
}
