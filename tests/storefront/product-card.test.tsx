// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ProductCard } from "../../components/store/ProductCard";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("product card color previews", () => {
  it("exposes and updates the selected color with aria-pressed", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () => {
      root.render(<ProductCard
        slug="aj159"
        name="AJ159 APEX"
        category="mouse"
        tagline="8K mouse"
        image="/main.jpg"
        index={0}
        variants={[
          { colorName: "ブルー", imageUrl: "/blue.jpg", availableQuantity: 2 },
          { colorName: "ホワイト", imageUrl: "/white.jpg", availableQuantity: 1 },
        ]}
      />);
    });

    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(".store-card-swatches button"));
    expect(buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
    await act(async () => { buttons[1].click(); });
    expect(buttons.map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
    expect(container.querySelector<HTMLImageElement>(".store-card-image img")?.src).toContain("/white.jpg");

    await act(async () => { root.unmount(); });
  });
});
