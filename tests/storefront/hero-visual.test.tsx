import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../components/store/CartProvider";
import { Storefront } from "../../components/store/Storefront";
import { DEFAULT_SITE_SETTINGS } from "../../lib/cms/site-settings";

describe("storefront hero visual", () => {
  it("uses the approved gaming desk image as the default hero", () => {
    expect(DEFAULT_SITE_SETTINGS.homepage.heroMediaUrl).toBe(
      "/images/ajazz-gaming-desk-hero.webp",
    );
  });

  it("renders the hero image as a full-bleed background layer", () => {
    const html = renderToStaticMarkup(
      <CartProvider>
        <Storefront />
      </CartProvider>,
    );

    expect(html).toContain('class="store-hero-media"');
    expect(html).toContain('src="/images/ajazz-gaming-desk-hero.webp"');
    expect(html).not.toContain("store-hero-spec");
  });
});
