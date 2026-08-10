// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ProductCard } from "../../components/store/ProductCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("catalogue commerce metadata", () => {
  it("renders approved pricing, points, aggregate stock, and an independent product link", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProductCard
        slug="ak820"
        name="AK820 PRO"
        category="mechanical-keyboard"
        tagline="Tri-mode 75% Keyboard"
        image="/main.jpg"
        index={0}
        priceJpy={17980}
        compareAtPriceJpy={20980}
        points={179}
        available
        variants={[
          { colorName: "ブラック", imageUrl: "/black.jpg", availableQuantity: 0 },
          { colorName: "ホワイト", imageUrl: "/white.jpg", availableQuantity: 2 },
        ]}
      />);
    });

    expect(container.querySelector(".store-card-price")?.textContent).toContain("￥17,980");
    expect(container.querySelector(".store-card-compare-price")?.textContent).toContain("￥20,980");
    expect(container.querySelector(".store-card-points")?.textContent).toContain("179ポイント");
    expect(container.querySelector(".store-card-stock")?.textContent).toBe("在庫あり");
    expect(container.querySelector<HTMLAnchorElement>(".store-card-command")?.getAttribute("href")).toBe("/products/ak820");

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(".store-card-swatches button"));
    expect(buttons).toHaveLength(2);
    await act(async () => { buttons[1].click(); });
    expect(container.querySelector<HTMLImageElement>(".store-card-image img")?.src).toContain("/white.jpg");

    await act(async () => { root.unmount(); });
  });

  it("does not invent a comparison price and reports sold-out inventory", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProductCard
        slug="sold-out"
        name="Sold Out"
        category="other"
        tagline="Limited"
        image="/sold-out.jpg"
        index={0}
        priceJpy={4980}
        points={49}
        available={false}
      />);
    });

    expect(container.querySelector(".store-card-compare-price")).toBeNull();
    expect(container.querySelector(".store-card-stock")?.textContent).toBe("在庫切れ");

    await act(async () => { root.unmount(); });
  });
});
