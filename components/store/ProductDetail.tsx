import { VariantPurchasePanel, type PurchasableVariant } from "./VariantPurchasePanel";

interface StoreVariant extends PurchasableVariant {}

interface StoreProduct {
  name: string;
  descriptionHtml: string;
  images: string[];
  variants: StoreVariant[];
}

export function ProductDetail({ product }: { product: StoreProduct }) {

  return (
    <article className="store-product-detail">
      <div className="store-product-media">
        {product.images[0] ? <img src={product.images[0]} alt={product.name} /> : <div className="store-product-placeholder" aria-hidden="true" />}
      </div>
      <div className="store-product-summary">
        <p className="store-overline">AJAZZ PERFORMANCE SERIES</p>
        <h1>{product.name}</h1>
        <VariantPurchasePanel name={product.name} variants={product.variants} />
        <dl className="store-product-terms">
          <div><dt>送料</dt><dd>日本全国送料無料。ご注文から3営業日以内に発送します。</dd></div>
          <div><dt>返品・交換</dt><dd>商品到着後7日以内。お客様都合の返送料はご負担ください。初期不良が確認された場合はAJAZZが負担します。</dd></div>
        </dl>
      </div>
    </article>
  );
}
