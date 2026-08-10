import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildProductMetadata,
  resolveProductMetadata,
} from "../../app/products/[slug]/page";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("final review SEO metadata", () => {
  it.each([
    ["app/about/page.tsx", "AJAZZ JAPANについて"],
    ["app/cart/page.tsx", "カート"],
    ["app/legal/page.tsx", "特定商取引法に基づく表記"],
    ["app/privacy/page.tsx", "プライバシーポリシー"],
    ["app/terms/page.tsx", "利用規約"],
    ["app/order/success/page.tsx", "ご注文を受け付けました"],
  ])("lets the root template append the brand suffix for %s", (path, title) => {
    const route = source(path);

    expect(route).toContain(`title: "${title}"`);
    expect(route).not.toContain(`${title} | AJAZZ JAPAN`);
  });

  it("prefers CMS SEO fields and its SEO image", () => {
    const metadata = buildProductMetadata("ak820-max", {
      name: "AK820 MAX",
      descriptionHtml: "<p>商品説明</p>",
      images: ["/fallback.webp"],
      seoTitle: "AK820 MAX ラピッドトリガーキーボード",
      seoDescription: "CMSで編集した検索結果用の商品説明です。",
      seoImageUrl: "/seo.webp",
    });

    expect(metadata.title).toBe("AK820 MAX ラピッドトリガーキーボード");
    expect(metadata.description).toBe("CMSで編集した検索結果用の商品説明です。");
    expect(metadata.alternates?.canonical).toBe("/products/ak820-max");
    expect(metadata.openGraph?.images).toEqual([{ url: "/seo.webp", alt: "AK820 MAX" }]);
    expect(metadata.twitter?.images).toEqual(["/seo.webp"]);
  });

  it("falls back to the product name, plain description, and product image", () => {
    const metadata = buildProductMetadata("aj159-apex", {
      name: "AJ159 APEX",
      descriptionHtml: "<p>高性能 <strong>ゲーミングマウス</strong></p>",
      images: ["/mouse.webp"],
      seoTitle: "   ",
      seoDescription: "",
    });

    expect(metadata.title).toBe("AJ159 APEX");
    expect(metadata.description).toBe("高性能 ゲーミングマウス");
    expect(metadata.openGraph?.images).toEqual([{ url: "/mouse.webp", alt: "AJ159 APEX" }]);
  });

  it("uses the same not-found path when metadata cannot find the product", async () => {
    const missing = new Error("not found");

    await expect(resolveProductMetadata("missing", false, new Headers(), {
      loadProduct: async () => undefined,
      loadSeo: async () => undefined,
      handleNotFound: () => { throw missing; },
    })).rejects.toBe(missing);
  });
});
