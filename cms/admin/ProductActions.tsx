"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { useState } from "react";

type ProductActionData = {
  editorialRevision?: number;
  lifecycle?: "active" | "unpublished" | "archived";
  slug?: string;
};

export function ProductActionsPanel({ product, productId }: { product: ProductActionData; productId?: number | string }) {
  const [error, setError] = useState<string | null>(null);
  const slug = product.slug ?? "";
  const lifecycle = product.lifecycle ?? "unpublished";
  const revision = Number(product.editorialRevision ?? 0);

  async function request(action: "publish" | "unpublish" | "archive" | "restore" | "delete") {
    if (!productId || !slug) return;
    const confirmation = action === "archive" || action === "delete"
      ? `${action === "archive" ? "ARCHIVE" : "DELETE"} ${slug}`
      : undefined;
    if (confirmation && window.prompt(confirmation) !== confirmation) return;
    const route = action === "delete" ? "delete-draft" : action;
    const body = action === "publish" || action === "unpublish"
      ? { expectedRevision: revision }
      : action === "restore" ? {} : { confirmation };
    const response = await fetch(`/api/cms/products/${encodeURIComponent(String(productId))}/${route}`, {
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({})) as { code?: string };
      setError(result.code ?? "product_action_failed");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="store-product-actions" aria-label="Product actions">
      {lifecycle === "unpublished" && <button type="button" onClick={() => request("publish")}>Publish</button>}
      {lifecycle === "active" && <button type="button" onClick={() => request("unpublish")}>Unpublish</button>}
      {lifecycle !== "archived" && <button type="button" onClick={() => request("archive")}>Archive</button>}
      {lifecycle === "archived" && <button type="button" onClick={() => request("restore")}>Restore draft</button>}
      {lifecycle === "unpublished" && <button type="button" onClick={() => request("delete")}>Delete draft</button>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export function ProductActions() {
  const { data, id } = useDocumentInfo();
  return <ProductActionsPanel product={(data ?? {}) as ProductActionData} productId={id} />;
}
