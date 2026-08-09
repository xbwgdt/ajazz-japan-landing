"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { useState } from "react";
import { manualInventoryEndpoint } from "../../lib/cms/manual-inventory-route";

type Variant = { inventoryMode?: "manual" | "rms"; operationalVariantId?: string; rmsSkuNumber?: string; sku?: string };
type ProductInventoryData = {
  sourceSnapshot?: { variants?: Array<{ rmsSkuNumber?: string; stockQuantity?: number }> };
  variants?: Variant[];
};

function rmsQuantity(product: ProductInventoryData, variant: Variant): string {
  const source = product.sourceSnapshot?.variants?.find((item) => item.rmsSkuNumber === variant.rmsSkuNumber);
  return source && Number.isFinite(source.stockQuantity) ? String(source.stockQuantity) : "RMS managed";
}

export function ManualInventoryActionPanel({ product, productId }: { product: ProductInventoryData; productId?: number | string }) {
  const [error, setError] = useState<string | null>(null);
  async function adjust(variant: Variant, form: HTMLFormElement) {
    if (!productId || !variant.operationalVariantId) return;
    const values = new FormData(form);
    const response = await fetch(manualInventoryEndpoint(productId), {
      body: JSON.stringify({
        quantity: Number(values.get("quantity")),
        reason: String(values.get("reason") ?? ""),
        variantId: Number(variant.operationalVariantId),
      }),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { code?: string };
      setError(result.code ?? "inventory_adjustment_failed");
      return;
    }
    window.location.reload();
  }

  return (
    <section className="store-inventory-actions" aria-label="Inventory controls">
      {(product.variants ?? []).map((variant, index) => variant.inventoryMode === "rms" ? (
        <div key={variant.operationalVariantId ?? variant.rmsSkuNumber ?? index}>
          <label>RMS SKU<input disabled readOnly value={variant.rmsSkuNumber ?? variant.sku ?? ""} /></label>
          <label>RMS inventory<input disabled readOnly value={rmsQuantity(product, variant)} /></label>
        </div>
      ) : (
        <form key={variant.operationalVariantId ?? variant.sku ?? index} onSubmit={(event) => {
          event.preventDefault();
          void adjust(variant, event.currentTarget);
        }}>
          <label>{variant.sku ?? "Manual variant"}<input min="0" name="quantity" required step="1" type="number" /></label>
          <label>Reason<input name="reason" required type="text" /></label>
          <button type="submit">Adjust inventory</button>
        </form>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function ManualInventoryAction() {
  const { data, id } = useDocumentInfo();
  const product = (data ?? {}) as ProductInventoryData & { operationalProductId?: string | number };
  return <ManualInventoryActionPanel product={product} productId={product.operationalProductId} />;
}
