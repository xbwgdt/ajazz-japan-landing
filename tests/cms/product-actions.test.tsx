import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProductActionsPanel } from "../../cms/admin/ProductActions";
import { Products } from "../../cms/collections/Products";

vi.mock("@payloadcms/ui", () => ({ useDocumentInfo: vi.fn(), useFormModified: vi.fn(), useFormProcessing: vi.fn() }));

describe("product publication controls", () => {
  it("lets an active product publish saved editorial changes", () => {
    const html = renderToStaticMarkup(<ProductActionsPanel product={{ lifecycle: "active", slug: "ak820v2-rt", editorialRevision: 4 }} productId={28} />);
    expect(html).toContain(">Publish saved changes</button>");
    expect(html).toContain(">Unpublish</button>");
  });

  it("replaces the native publish button which cannot use the publication service", () => {
    expect(Products.admin?.components?.edit?.PublishButton).toBe("/cms/admin/ProductActions#NativePublishButton");
  });

  it("blocks publication while changes are unsaved", () => {
    const html = renderToStaticMarkup(<ProductActionsPanel product={{ lifecycle: "active", slug: "ak820v2-rt" }} productId={28} unsaved />);
    expect(html).toContain('disabled="">Publish saved changes</button>');
  });

  it("does not publish archived products", () => {
    const html = renderToStaticMarkup(<ProductActionsPanel product={{ lifecycle: "archived", slug: "ak820v2-rt" }} productId={28} />);
    expect(html).not.toContain(">Publish");
  });
});
