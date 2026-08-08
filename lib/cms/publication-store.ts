import { sql } from "@payloadcms/db-postgres";
import type { PayloadRequest } from "payload";
import {
  PublicationConflictError,
  type PublicationStore,
  type PublicationTransaction,
  type PublishedProductSnapshot,
  type PublishedVariant,
} from "./publication";

type TransactionDatabase = { execute: (query: unknown) => Promise<unknown> };

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: T[] }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function transactionDatabase(req: PayloadRequest): Promise<TransactionDatabase> {
  if (!req.transactionID) throw new Error("Publication store requires an active Payload transaction");
  const transactionId = String(await req.transactionID);
  const database = req.payload.db.sessions?.[transactionId]?.db as TransactionDatabase | undefined;
  if (!database?.execute) throw new Error("Publication store requires an active Payload transaction");
  return database;
}

function positiveInteger(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function transactionAdapter(database: TransactionDatabase): PublicationTransaction {
  const query = async <T>(statement: unknown) => resultRows<T>(await database.execute(statement));

  return {
    async assertSlugAvailable(slug, cmsProductId, operationalProductId) {
      const linkedProductId = positiveInteger(operationalProductId);
      const rows = await query<{ id: number }>(sql`
        SELECT id FROM public.products
        WHERE slug = ${slug} AND cms_product_id IS DISTINCT FROM ${cmsProductId}
          AND (${linkedProductId} IS NULL OR id <> ${linkedProductId})
        LIMIT 1
      `);
      if (rows.length) throw new PublicationConflictError();
    },

    async upsertProduct(snapshot: PublishedProductSnapshot) {
      const linkedProductId = positiveInteger(snapshot.operationalProductId);
      const existing = await query<{
        cms_product_id: string | null;
        id: number;
        publication_revision: number;
        rms_manage_number: string | null;
      }>(sql`
        SELECT id, cms_product_id, rms_manage_number, publication_revision
        FROM public.products
        WHERE (${linkedProductId} IS NOT NULL AND id = ${linkedProductId})
           OR cms_product_id = ${snapshot.cmsProductId}
           OR (${snapshot.rmsManageNumber} IS NOT NULL AND rms_manage_number = ${snapshot.rmsManageNumber})
        ORDER BY
          (${linkedProductId} IS NOT NULL AND id = ${linkedProductId}) DESC,
          (cms_product_id = ${snapshot.cmsProductId}) DESC,
          (rms_manage_number = ${snapshot.rmsManageNumber}) DESC
        LIMIT 1
        FOR UPDATE
      `);
      if (
        existing[0]
        && linkedProductId !== null
        && Number(existing[0].id) === linkedProductId
        && (
          (existing[0].cms_product_id != null && existing[0].cms_product_id !== snapshot.cmsProductId)
          || (existing[0].rms_manage_number != null && existing[0].rms_manage_number !== snapshot.rmsManageNumber)
        )
      ) {
        throw new PublicationConflictError(Number(existing[0].publication_revision));
      }
      if (existing[0] && Number(existing[0].publication_revision) > snapshot.revision) {
        throw new PublicationConflictError(Number(existing[0].publication_revision));
      }

      let rows: Array<{ id: number }>;
      if (existing[0]) {
        rows = await query<{ id: number }>(sql`
          UPDATE public.products SET
            cms_product_id = ${snapshot.cmsProductId}, source_type = ${snapshot.sourceType},
            rms_manage_number = ${snapshot.rmsManageNumber}, slug = ${snapshot.slug},
            name = ${snapshot.name}, short_statement = ${snapshot.shortStatement},
            description_html = ${snapshot.descriptionHtml}, category = ${snapshot.category},
            seo_title = ${snapshot.seoTitle}, seo_description = ${snapshot.seoDescription},
            featured = ${snapshot.featured}, merchandising_order = ${snapshot.merchandisingOrder},
            lifecycle = 'active', published = TRUE, published_at = NOW(), unpublished_at = NULL,
            publication_revision = ${snapshot.revision},
            last_publication_correlation_id = ${snapshot.correlationId}, updated_at = NOW()
          WHERE id = ${existing[0].id}
          RETURNING id
        `);
      } else {
        rows = await query<{ id: number }>(sql`
          INSERT INTO public.products (
            cms_product_id, source_type, rms_manage_number, slug, name, short_statement,
            description_html, category, seo_title, seo_description, featured,
            merchandising_order, lifecycle, published, published_at,
            publication_revision, last_publication_correlation_id
          ) VALUES (
            ${snapshot.cmsProductId}, ${snapshot.sourceType}, ${snapshot.rmsManageNumber},
            ${snapshot.slug}, ${snapshot.name}, ${snapshot.shortStatement},
            ${snapshot.descriptionHtml}, ${snapshot.category}, ${snapshot.seoTitle},
            ${snapshot.seoDescription}, ${snapshot.featured}, ${snapshot.merchandisingOrder},
            'active', TRUE, NOW(), ${snapshot.revision}, ${snapshot.correlationId}
          ) RETURNING id
        `);
      }
      return { operationalProductId: String(rows[0].id) };
    },

    async replaceImages(productId, images) {
      await database.execute(sql`DELETE FROM public.product_images WHERE product_id = ${Number(productId)}`);
      for (const image of images) {
        await database.execute(sql`
          INSERT INTO public.product_images (product_id, url, position, cms_media_id)
          VALUES (${Number(productId)}, ${image.url}, ${image.position}, ${image.mediaId})
        `);
      }
    },

    async upsertVariants(productId, variants: PublishedVariant[]) {
      const activeIds: string[] = [];
      for (const variant of variants) {
        const operationalVariantId = positiveInteger(variant.operationalVariantId);
        const existing = await query<{ id: number }>(sql`
          SELECT id FROM public.product_variants
          WHERE product_id = ${Number(productId)}
            AND (
              (${operationalVariantId} IS NOT NULL AND id = ${operationalVariantId})
              OR cms_variant_id = ${variant.cmsVariantId}
              OR rms_sku_number = ${variant.rmsSkuNumber}
              OR sku = ${variant.sku}
            )
          ORDER BY
            (id = ${operationalVariantId}) DESC,
            (cms_variant_id = ${variant.cmsVariantId}) DESC,
            (rms_sku_number = ${variant.rmsSkuNumber}) DESC
          LIMIT 1
          FOR UPDATE
        `);
        let rows: Array<{ id: number }>;
        if (existing[0]) {
          rows = await query<{ id: number }>(sql`
            UPDATE public.product_variants SET
              cms_variant_id = ${variant.cmsVariantId}, sku = ${variant.sku},
              rms_sku_number = ${variant.rmsSkuNumber}, inventory_mode = ${variant.inventoryMode},
              price_jpy = ${variant.priceJpy}, compare_at_price_jpy = ${variant.compareAtPriceJpy},
              compare_at_price_approved = ${variant.compareAtPriceJpy !== null},
              comparison_evidence_type = ${variant.comparisonEvidenceType},
              comparison_evidence_reference = ${variant.comparisonEvidenceReference},
              comparison_approved_by = ${variant.comparisonApprovedBy},
              comparison_approved_at = ${variant.comparisonApprovedAt},
              color_name = ${variant.colorName}, color_swatch = ${variant.colorSwatch},
              thumbnail_url = ${variant.thumbnailUrl}, image_url = ${variant.imageUrl},
              active = ${variant.active}, updated_at = NOW()
            WHERE id = ${existing[0].id} AND product_id = ${Number(productId)}
            RETURNING id
          `);
        } else {
          rows = await query<{ id: number }>(sql`
            INSERT INTO public.product_variants (
              product_id, cms_variant_id, sku, rms_sku_number, inventory_mode,
              price_jpy, compare_at_price_jpy, compare_at_price_approved,
              comparison_evidence_type, comparison_evidence_reference,
              comparison_approved_by, comparison_approved_at, color_name, color_swatch,
              thumbnail_url, image_url, active
            ) VALUES (
              ${Number(productId)}, ${variant.cmsVariantId}, ${variant.sku}, ${variant.rmsSkuNumber},
              ${variant.inventoryMode}, ${variant.priceJpy}, ${variant.compareAtPriceJpy},
              ${variant.compareAtPriceJpy !== null}, ${variant.comparisonEvidenceType},
              ${variant.comparisonEvidenceReference}, ${variant.comparisonApprovedBy},
              ${variant.comparisonApprovedAt}, ${variant.colorName}, ${variant.colorSwatch},
              ${variant.thumbnailUrl}, ${variant.imageUrl}, ${variant.active}
            ) RETURNING id
          `);
        }
        activeIds.push(String(rows[0].id));
      }
      return activeIds;
    },

    async disableMissingVariants(productId, operationalVariantIds) {
      const activeIds = sql.join(
        operationalVariantIds.map((id) => sql`${Number(id)}`),
        sql`, `,
      );
      await database.execute(sql`
        UPDATE public.product_variants
        SET active = FALSE, updated_at = NOW()
        WHERE product_id = ${Number(productId)}
          AND id NOT IN (${activeIds})
      `);
    },

    async appendPublicationAudit(event) {
      await database.execute(sql`
        INSERT INTO public.publication_audit_events (
          action, actor_id, actor_email, cms_product_id, operational_product_id,
          publication_revision, correlation_id
        ) VALUES (
          ${event.action}, ${event.actorId}, ${event.actorEmail}, ${event.cmsProductId},
          ${Number(event.operationalProductId)}, ${event.revision}, ${event.correlationId}
        )
      `);
    },

    async setPublished(cmsProductId, expectedRevision, published, correlationId) {
      const rows = await query<{ id: number; publication_revision: number; slug: string }>(sql`
        SELECT id, publication_revision, slug FROM public.products
        WHERE cms_product_id = ${cmsProductId}
        FOR UPDATE
      `);
      if (!rows[0] || Number(rows[0].publication_revision) > expectedRevision) {
        throw new PublicationConflictError(rows[0] ? Number(rows[0].publication_revision) : undefined);
      }
      const updated = await query<{ id: number; slug: string }>(sql`
        UPDATE public.products
        SET published = ${published}, lifecycle = ${published ? "active" : "unpublished"},
            unpublished_at = ${published ? null : new Date()},
            publication_revision = ${expectedRevision},
            last_publication_correlation_id = ${correlationId}, updated_at = NOW()
        WHERE id = ${rows[0].id}
        RETURNING id, slug
      `);
      return { operationalProductId: String(updated[0].id), slug: updated[0].slug };
    },
  };
}

export function createPostgresPublicationStore(req: PayloadRequest): PublicationStore {
  return {
    async transaction<T>(work: (tx: PublicationTransaction) => Promise<T>) {
      return work(transactionAdapter(await transactionDatabase(req)));
    },
  };
}
