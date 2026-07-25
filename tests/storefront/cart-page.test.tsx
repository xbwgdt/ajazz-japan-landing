import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CartPage } from "../../components/store/CartPage";
import { CartProvider } from "../../components/store/CartProvider";

describe("cart checkout notice", () => {
  it("links to the terms and return policy before checkout", () => {
    const html = renderToStaticMarkup(<CartProvider><CartPage /></CartProvider>);

    expect(html).toContain("利用規約");
    expect(html).toContain("特定商取引法に基づく表記");
  });
});
