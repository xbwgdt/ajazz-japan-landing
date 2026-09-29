"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { productPresentation } from "../../lib/commerce/product-presentation";
import { VariantPurchasePanel, type PurchasableVariant } from "./VariantPurchasePanel";
import { DRIVER_LINK_PROPS } from "../../lib/cms/site-settings";
import { productSpecificationRows, type ProductSpecifications } from "../../lib/commerce/product-specifications";

interface StoreVariant extends PurchasableVariant {}

interface StoreProduct {
  isPreview?: boolean;
  slug?: string;
  name: string;
  sanitizedDescriptionHtml: string;
  images: string[];
  galleryMode?: "shared" | "color";
  specifications?: ProductSpecifications;
  variants: StoreVariant[];
}

export function ProductDetail({ product }: { product: StoreProduct }) {
  const presentation = productPresentation(product.name, product.slug);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = product.variants[selectedIndex];
  const gallery = useMemo(
    () => [...new Set([
      selected?.imageUrl,
      ...(product.galleryMode === "color" ? selected?.galleryImages ?? [] : product.images),
    ].filter((image): image is string => Boolean(image)))],
    [product.galleryMode, product.images, selected?.imageUrl, selected?.galleryImages],
  );
  const [galleryIndex, setGalleryIndex] = useState(0);
  const activeImage = gallery[galleryIndex] ?? gallery[0];
  const specificationRows = productSpecificationRows({ ...presentation.specifications, ...product.specifications });

  const selectVariant = (index: number) => {
    setSelectedIndex(index);
    setGalleryIndex(0);
  };

  return (
    <article className="store-product-detail">
      <nav className="store-product-breadcrumb" aria-label="パンくずリスト"><Link href="/">ホーム</Link><span aria-hidden="true">/</span><Link href="/#products">製品一覧</Link><span aria-hidden="true">/</span><span aria-current="page">{presentation.title}</span></nav>
      <section className="store-product-gallery-shell" aria-label="商品ギャラリー">
        <div className="store-product-media">
          <div className="store-product-main-image">
            {activeImage ? <img key={activeImage} className="store-product-active-image is-active" src={activeImage} alt={`${presentation.title} ${selected?.colorName ?? ""}`} /> : <div className="store-product-placeholder" aria-hidden="true" />}
          </div>
          {gallery.length > 1 ? <div className="store-product-gallery" aria-label="商品画像">
            {gallery.map((image, index) => <button key={image} type="button" aria-label={`${presentation.title}の商品画像${index + 1}`} aria-pressed={index === galleryIndex} onClick={() => setGalleryIndex(index)}><img src={image} alt="" /></button>)}
          </div> : null}
        </div>
      </section>
      <aside className="store-product-purchase-summary">
        <p className="store-overline">AJAZZ JAPAN</p>
        <h1>{presentation.title}</h1>
        {presentation.subtitle ? <p className="store-product-subtitle">{presentation.subtitle}</p> : null}
        {presentation.lead ? <p className="store-product-lead">{presentation.lead}</p> : null}
        {presentation.highlights.length ? <ul className="store-product-highlights">{presentation.highlights.map((feature) => <li key={feature}>{feature}</li>)}</ul> : null}
        <VariantPurchasePanel name={presentation.title} variants={product.variants} selectedIndex={selectedIndex} onSelect={selectVariant} isPreview={product.isPreview} />
        <p className="store-product-shipping-note">全国送料無料・ご注文から3営業日以内に発送</p>
      </aside>
      <div className="store-product-content">
        {product.sanitizedDescriptionHtml ? <section className="store-product-feature-band">
          <p className="store-overline">PERFORMANCE</p>
          <h2>製品の特長</h2>
          <div className="store-product-description" dangerouslySetInnerHTML={{ __html: product.sanitizedDescriptionHtml }} />
        </section> : null}
        {specificationRows.length ? <section className="store-product-specification-band">
          <p className="store-overline">SPECIFICATIONS</p>
          <h2>商品仕様</h2>
          <dl className="store-product-specifications">
            {specificationRows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
          </dl>
        </section> : null}
        {product.slug !== "mousepad" ? <section className="store-product-driver-band">
          <p className="store-overline">SOFTWARE</p>
          <h2>ドライバーダウンロード</h2>
          <p>AJAZZ公式ダウンロードページで、お使いのモデルに対応するソフトウェアをご確認ください。</p>
          <a {...DRIVER_LINK_PROPS}>公式ダウンロードページへ</a>
        </section> : null}
        <section className="store-product-delivery-band">
          <p className="store-overline">DELIVERY</p>
          <h2>全国送料無料</h2>
          <p>日本全国送料無料。ご注文から3営業日以内に発送します。</p>
        </section>
        <section className="store-product-return-band">
          <p className="store-overline">RETURNS</p>
          <h2>返品・交換</h2>
          <p>商品到着後7日以内。お客様都合の返送料はご負担ください。初期不良が確認された場合はAJAZZが負担します。</p>
        </section>
      </div>
    </article>
  );
}
