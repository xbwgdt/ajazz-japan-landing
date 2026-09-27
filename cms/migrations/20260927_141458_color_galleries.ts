import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { commerceSchemaSql } from '../../lib/commerce/db'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(commerceSchemaSql))
  await db.execute(sql`
    ALTER TABLE public.products ADD COLUMN gallery_mode text NOT NULL DEFAULT 'shared'
      CHECK (gallery_mode IN ('shared', 'color'));
    CREATE TABLE public.product_variant_images (
      id BIGSERIAL PRIMARY KEY,
      variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
      cms_media_id TEXT NOT NULL,
      url TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0),
      UNIQUE (variant_id, position)
    );
  `)
  await db.execute(sql`
   CREATE TYPE "cms"."enum_products_gallery_mode" AS ENUM('shared', 'color');
  CREATE TYPE "cms"."enum__products_v_version_gallery_mode" AS ENUM('shared', 'color');
  ALTER TABLE "cms"."products_variants" ADD COLUMN "image_source_url" varchar;
  ALTER TABLE "cms"."products_variants" ADD COLUMN "amazon_asin" varchar;
  ALTER TABLE "cms"."products" ADD COLUMN "gallery_mode" "cms"."enum_products_gallery_mode" DEFAULT 'shared';
  ALTER TABLE "cms"."_products_v_version_variants" ADD COLUMN "image_source_url" varchar;
  ALTER TABLE "cms"."_products_v_version_variants" ADD COLUMN "amazon_asin" varchar;
  ALTER TABLE "cms"."_products_v" ADD COLUMN "version_gallery_mode" "cms"."enum__products_v_version_gallery_mode" DEFAULT 'shared';`)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  throw new Error('Color galleries contain editorial history. Roll back application code and galleryMode, not this additive migration.')
}
