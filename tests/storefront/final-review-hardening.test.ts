import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("final review storefront hardening", () => {
  it("selects the newest published Payload version for supported operating systems", () => {
    const databaseSource = source("lib/commerce/storefront-db.ts");
    const migrationSource = source("cms/migrations/20260804_061212_product_editorial_model.ts");

    expect(migrationSource).toContain('"version_updated_at" timestamp(3) with time zone');
    expect(migrationSource).toContain('"version__status"');
    expect(databaseSource).toContain("published_version.version__status = 'published'");
    expect(databaseSource).toContain("ORDER BY published_version.version_updated_at DESC NULLS LAST, published_version.id DESC");
    expect(databaseSource).toContain("LIMIT 1");
    expect(databaseSource).not.toContain("version.latest = TRUE");
  });

  it("pins the Railway-compatible Node runtime", () => {
    const manifest = JSON.parse(source("package.json")) as { engines?: { node?: string } };
    const railway = JSON.parse(source("railway.json")) as { build?: { buildCommand?: string } };

    expect(manifest.engines?.node).toBe(">=22.12.0");
    expect(railway.build?.buildCommand).toBe("pnpm build");
  });

  it("keeps sanitize-html out of the ProductDetail client module", () => {
    const componentSource = source("components/store/ProductDetail.tsx");
    const routeSource = source("app/products/[slug]/page.tsx");

    expect(componentSource).not.toContain("sanitizeProductHtml");
    expect(componentSource).not.toContain("lib/commerce/product-html");
    expect(componentSource).toContain("product.sanitizedDescriptionHtml");
    expect(routeSource).toContain("sanitizeProductForRendering");
  });

  it("uses one request-scoped cached product loader for metadata and page rendering", () => {
    const routeSource = source("app/products/[slug]/page.tsx");

    expect(routeSource).toContain('import { cache } from "react"');
    expect(routeSource).toMatch(/const loadProductRequestData = cache\(async \(slug: string\)/);
    expect(routeSource.match(/loadProductRequestData\(slug\)/g)).toHaveLength(2);
    expect(routeSource).not.toMatch(/loadProductPageData\(slug, draft\.isEnabled, requestHeaders\)/);
  });
});
