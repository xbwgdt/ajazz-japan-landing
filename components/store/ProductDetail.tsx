"use client";

import { useMemo, useState } from "react";
import { VariantPurchasePanel, type PurchasableVariant } from "./VariantPurchasePanel";

interface StoreVariant extends PurchasableVariant {}

interface StoreProduct {
  name: string;
  descriptionHtml: string;
  images: string[];
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

  const selectVariant = (index: number) => {
    setSelectedIndex(index);
    setGalleryIndex(0);
  };

  return (
    <article className="store-product-detail">
      <div className="store-product-media">
        <div className="store-product-main-image">
          {activeImage ? <img src={activeImage} alt={`${product.name} ${selected?.colorName ?? ""}`} /> : <div className="store-product-placeholder" aria-hidden="true" />}
        </div>
        {gallery.length > 1 ? <div className="store-product-gallery" aria-label="商品画像">
          {gallery.map((image, index) => <button key={image} type="button" aria-pressed={index === galleryIndex} onClick={() => setGalleryIndex(index)}><img src={image} alt="" /></button>)}
        </div> : null}
      </div>
      <div className="store-product-summary">
        <p className="store-overline">AJAZZ PERFORMANCE SERIES</p>
        <h1>{product.name}</h1>
        <p className="store-product-lead">高性能ゲーミングデバイスを、日本全国送料無料でお届けします。</p>
        <VariantPurchasePanel name={product.name} variants={product.variants} selectedIndex={selectedIndex} onSelect={selectVariant} />
        <dl className="store-product-terms">
          <div><dt>送料</dt><dd>日本全国送料無料。ご注文から3営業日以内に発送します。</dd></div>
          <div><dt>返品・交換</dt><dd>商品到着後7日以内。お客様都合の返送料はご負担ください。初期不良が確認された場合はAJAZZが負担します。</dd></div>
        </dl>
      </div>
      <div className="store-product-content">
        <section>
          <p className="store-overline">PERFORMANCE</p>
          <h2>製品の特長</h2>
          <p>応答性、操作精度、長時間使用時の快適性まで、プレイ環境に必要な性能を一つのデバイスにまとめました。</p>
        </section>
        <section>
          <p className="store-overline">SPECIFICATIONS</p>
          <h2>商品仕様</h2>
          <p>接続方式、サイズ、重量、対応OSなどの詳細仕様は、商品データから確認できます。</p>
        </section>
        <section>
          <p className="store-overline">SOFTWARE</p>
          <h2>ドライバー・マニュアル</h2>
          <p>対応ソフトウェア、ファームウェア、取扱説明書をドライバーダウンロードページから確認できます。</p>
          <a href="/drivers">対応ファイルを確認する</a>
        </section>
      </div>
    </article>
  );
}
