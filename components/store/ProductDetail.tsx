import { AddToCartButton } from "./AddToCartButton";

interface StoreVariant {
  id?: string;
  rmsSkuNumber: string;
  priceJpy: number;
  availableQuantity: number;
}

interface StoreProduct {
  name: string;
  descriptionHtml: string;
  images: string[];
  variants: StoreVariant[];
}

export function ProductDetail({ product }: { product: StoreProduct }) {
  const primaryVariant = product.variants[0];
  const isAvailable = Boolean(primaryVariant && primaryVariant.availableQuantity > 0);
  const price = primaryVariant
    ? new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(primaryVariant.priceJpy)
    : null;

  return (
    <article className="store-product-detail">
      <div className="store-product-media">
        {product.images[0] ? <img src={product.images[0]} alt={product.name} /> : <div className="store-product-placeholder" aria-hidden="true" />}
      </div>
      <div className="store-product-summary">
        <p className="store-overline">AJAZZ PERFORMANCE SERIES</p>
        <h1>{product.name}</h1>
        {price ? <p className="store-price">{price}</p> : null}
        <p className={isAvailable ? "store-stock is-available" : "store-stock is-unavailable"}>{isAvailable ? "在庫あり" : "在庫切れ"}</p>
        <AddToCartButton variantId={primaryVariant?.id} name={product.name} priceJpy={primaryVariant?.priceJpy ?? 0} available={isAvailable} />
        <dl className="store-product-terms">
          <div><dt>送料</dt><dd>日本全国送料無料。ご注文から3営業日以内に発送します。</dd></div>
          <div><dt>返品・交換</dt><dd>商品到着後7日以内。お客様都合の返送料はご負担ください。初期不良が確認された場合はAJAZZが負担します。</dd></div>
        </dl>
      </div>
    </article>
  );
}
