import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoreFooter } from "../../components/store/StoreFooter";
import { normalizeSiteSettings } from "../../lib/cms/site-settings";

describe("final review footer contact", () => {
  it("renders the configured email and phone as contact links", () => {
    const settings = normalizeSiteSettings({
      contact: { email: "support@a-jazz.com", phone: "070-9319‐5121" },
    });

    const html = renderToStaticMarkup(<StoreFooter settings={settings} />);

    expect(html).toContain('href="mailto:support@a-jazz.com"');
    expect(html).toContain(">support@a-jazz.com</a>");
    expect(html).toContain('href="tel:07093195121"');
    expect(html).toContain(">070-9319‐5121</a>");
  });
});
