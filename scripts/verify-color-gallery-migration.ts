import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { migrations } from "../cms/migrations";
import { createPostgresPublicationStore } from "../lib/cms/publication-store";
import { publishProduct, type PublishProductInput } from "../lib/cms/publication";

// PGlite is a temporary validation dependency, never an application database.
const modulePath = process.env.PGLITE_MODULE;
if (!modulePath) throw new Error("Set PGLITE_MODULE to an installed PGlite module for isolated validation.");
const { PGlite } = await import(pathToFileURL(modulePath).href);
const database = new PGlite();
const compile = (statement: any) => statement.toQuery({
  escapeName: (name: string) => `"${name.replaceAll('"', '""')}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
});
const adapter = (db: any) => ({ execute: async (statement: unknown) => {
  const query = compile(statement);
  if (query.params.length) return db.query(query.sql, query.params);
  const results = await db.exec(query.sql);
  return results.at(-1) ?? { rows: [] };
} });

try {
  for (const migration of migrations) {
    await database.transaction(async (tx: any) => migration.up({ db: adapter(tx) } as never));
    console.log(`Migrated ${migration.name}`);
  }
  const input: PublishProductInput = {
    actor: { id: "test", email: "test@example.invalid" }, cmsProductId: "test-product", correlationId: "gallery-test-1",
    currentRevision: 1, expectedRevision: 1,
    draft: { sourceType: "manual", name: "Gallery validation", slug: "gallery-validation", slugIsUnique: true,
      category: "mechanical-keyboard", primaryImageId: "1", galleryMode: "color", images: [],
      variants: [{ cmsVariantId: "test-variant", sku: "TEST-GREEN", colorName: "Green", salePriceJpy: 10000,
        inventoryMode: "manual", active: true, imageUrl: "/green.jpg", images: [
          { mediaId: "1", url: "/green.jpg", position: 0 },
          { mediaId: "2", url: "/green-detail.jpg", position: 1 },
        ] }],
    },
  };
  const publish = (value: PublishProductInput, failGallery = false) => database.transaction(async (tx: any) => {
    const db = adapter(tx);
    const execute = async (statement: unknown) => {
      if (failGallery && compile(statement).sql.includes("INSERT INTO public.product_variant_images")) throw new Error("Simulated gallery failure");
      return db.execute(statement);
    };
    const req = { transactionID: "test", payload: { db: { sessions: { test: { db: { execute } } } } } };
    return publishProduct(value, createPostgresPublicationStore(req as never));
  });
  await publish(input);
  const images = await database.query("SELECT cms_media_id, url, position FROM public.product_variant_images ORDER BY position");
  assert.deepEqual(images.rows, [{ cms_media_id: "1", url: "/green.jpg", position: 0 }, { cms_media_id: "2", url: "/green-detail.jpg", position: 1 }]);
  const mode = await database.query("SELECT gallery_mode FROM public.products");
  assert.equal(mode.rows[0].gallery_mode, "color");
  const changed = structuredClone(input);
  changed.correlationId = "gallery-test-2";
  changed.currentRevision = changed.expectedRevision = 2;
  changed.draft.name = "Must roll back";
  changed.draft.variants[0].images = [{ mediaId: "3", url: "/replacement.jpg", position: 0 }];
  await assert.rejects(publish(changed, true), /Simulated gallery failure/);
  assert.deepEqual((await database.query("SELECT cms_media_id, url, position FROM public.product_variant_images ORDER BY position")).rows, images.rows);
  assert.equal((await database.query("SELECT name FROM public.products")).rows[0].name, "Gallery validation");
  assert.equal((await database.query("SELECT count(*)::int AS count FROM public.publication_audit_events")).rows[0].count, 1);
  console.log("PASS: full migration chain, ordered galleries, published mode, atomic rollback and unchanged audit.");
} finally {
  await database.close();
}
