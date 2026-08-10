"use client";

import { useMemo, useState } from "react";
import { VariantPurchasePanel, type PurchasableVariant } from "./VariantPurchasePanel";
import { DRIVER_LINK_PROPS } from "../../lib/cms/site-settings";
import { productSpecificationRows, type ProductSpecifications } from "../../lib/commerce/product-specifications";

interface StoreVariant extends PurchasableVariant {}

interface StoreProduct {
  name: string;
  sanitizedDescriptionHtml: string;
  images: string[];
  specifications?: ProductSpecifications;
  variants: StoreVariant[];
}

export function ProductDetail({ product }: { product: StoreProduct }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = product.variants[selectedIndex];
  const gallery = useMemo(
    () => [...new Set([selected?.imageUrl, ...product.images].filter((image): image is string => Boolean(image)))],
    [product.images, selected?.imageUrl],
  );
  const [galleryIndex, setGalleryIndex] = useState(0);
  const activeImage = gallery[galleryIndex] ?? gallery[0];
  const specificationRows = useMemo(() => productSpecificationRows(product.specifications ?? {}), [product.specifications]);

  const selectVariant = (index: number) => {
    setSelectedIndex(index);
    setGalleryIndex(0);
  };

  return (
    <article className="store-product-detail">
      <section className="store-product-gallery-shell" aria-label="商品ギャラリー">
        <div className="store-product-media">
          <div className="store-product-main-image">
            {activeImage ? <img key={activeImage} className="store-product-active-image is-active" src={activeImage} alt={`${product.name} ${selected?.colorName ?? ""}`} /> : <div className="store-product-placeholder" aria-hidden="true" />}
          </div>
          {gallery.length > 1 ? <div className="store-product-gallery" aria-label="商品画像">
            {gallery.map((image, index) => <button key={image} type="button" aria-label={`${product.name}の商品画像${index + 1}`} aria-pressed={index === galleryIndex} onClick={() => setGalleryIndex(index)}><img src={image} alt="" /></button>)}
          </div> : null}
        </div>
      </section>
      <aside className="store-product-purchase-summary">
        <p className="store-overline">AJAZZ PERFORMANCE SERIES</p>
        <h1>{product.name}</h1>
        <p className="store-product-lead">高性能ゲーミングデバイスを、日本全国送料無料でお届けします。</p>
        <VariantPurchasePanel name={product.name} variants={product.variants} selectedIndex={selectedIndex} onSelect={selectVariant} />
      </aside>
      <div className="store-product-content">
        <section className="store-product-feature-band">
          <p className="store-overline">PERFORMANCE</p>
          <h2>製品の特長</h2>
          {product.sanitizedDescriptionHtml ? <div className="store-product-description" dangerouslySetInnerHTML={{ __html: product.sanitizedDescriptionHtml }} /> : <p>応答性、操作精度、長時間使用時の快適性まで、プレイ環境に必要な性能を一つのデバイスにまとめました。</p>}
        </section>
        <section className="store-product-specification-band">
          <p className="store-overline">SPECIFICATIONS</p>
          <h2>商品仕様</h2>
          {specificationRows.length ? <dl className="store-product-specifications">
            {specificationRows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
          </dl> : <p>詳細仕様は順次更新します。</p>}
        </section>
        <section className="store-product-driver-band">
          <p className="store-overline">SOFTWARE</p>
          <h2>ドライバー・マニュアル</h2>
          <p>対応ソフトウェア、ファームウェア、取扱説明書をドライバーダウンロードページから確認できます。</p>
          <a {...DRIVER_LINK_PROPS}>対応ファイルを確認する</a>
        </section>
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
