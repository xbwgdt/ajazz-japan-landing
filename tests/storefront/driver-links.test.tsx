import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CartProvider } from "../../components/store/CartProvider";
import { ProductDetail } from "../../components/store/ProductDetail";
import { Storefront } from "../../components/store/Storefront";
import { DRIVER_DESTINATION } from "../../lib/cms/site-settings";

const navigationMocks = vi.hoisted(() => ({ redirect: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: navigationMocks.redirect }));

describe("external driver destination", () => {
  it("uses safe external links in the storefront header, hero, and footer", () => {
    const html = renderToStaticMarkup(<CartProvider><Storefront /></CartProvider>);

    expect(html.match(new RegExp(`href="${DRIVER_DESTINATION}"`, "g"))).toHaveLength(3);
    expect(html.match(/target="_blank"/g)).toHaveLength(3);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(3);
  });

  it("uses the same safe external destination on product pages", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX ULTRA",
      descriptionHtml: "",
      images: ["/keyboard.webp"],
      variants: [{
        availableQuantity: 1,
        colorName: "Black",
        id: "1",
        imageUrl: "/keyboard.webp",
        priceJpy: 12980,
        rmsSkuNumber: "AK820-BK",
      }],
    }} /></CartProvider>);

    expect(html).toContain(`href="${DRIVER_DESTINATION}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("keeps the legacy drivers route as a server redirect", async () => {
    const { default: DriversPage } = await import("../../app/drivers/page");
    DriversPage();
    expect(navigationMocks.redirect).toHaveBeenCalledWith(DRIVER_DESTINATION);
  });
});
