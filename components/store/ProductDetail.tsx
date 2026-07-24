interface StoreVariant {
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

  return (
    <article className="store-product-detail">
      <div className="store-product-media">
        {product.images[0] ? (
          <img src={product.images[0]} alt={product.name} />
        ) : (
          <div className="store-product-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="store-product-summary">
        <p className="store-overline">AJAZZ PERFORMANCE SERIES</p>
        <h1>{product.name}</h1>
        {primaryVariant ? (
          <p className="store-price">
            {new Intl.NumberFormat("ja-JP", {
              style: "currency",
              currency: "JPY",
              maximumFractionDigits: 0,
            })
              .format(primaryVariant.priceJpy)
              .replace("￥", "¥")}
          </p>
        ) : null}
        <p className={isAvailable ? "store-stock is-available" : "store-stock is-unavailable"}>
          {isAvailable ? "在庫あり" : "在庫切れ"}
        </p>
        <button type="button" disabled={!isAvailable} className="store-add-button">
          {isAvailable ? "カートに入れる" : "入荷をお待ちください"}
        </button>
        <dl className="store-product-terms">
          <div>
            <dt>配送</dt>
            <dd>全国送料無料・ご注文から3営業日以内に発送</dd>
          </div>
          <div>
            <dt>返品・交換</dt>
            <dd>商品到着後7日以内。お客様都合の送料はご負担ください。</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
