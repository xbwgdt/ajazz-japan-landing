// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ProductCatalogue } from "../../components/store/ProductCatalogue";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const products = [
  {
    slug: "aj159",
    name: "AJ159 APEX",
    category: "mouse" as const,
    tagline: "8K Wireless Gaming Mouse",
    image: "/images/aj159.webp",
  },
  {
    slug: "ak820",
    name: "AK820 PRO",
    category: "mechanical-keyboard" as const,
    tagline: "Tri-mode 75% Keyboard",
    image: "/images/ak820.webp",
  },
];

function buttonByText(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent === text);
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("ProductCatalogue", () => {
  it("filters interactively, exposes a semantic category group, clears empty results, and restores product cards", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(<ProductCatalogue products={products} />);
    });

    const categoryGroup = container.querySelector<HTMLElement>('[role="group"][aria-label="製品カテゴリ"]');
    expect(categoryGroup).not.toBeNull();

    const search = container.querySelector<HTMLInputElement>("#store-product-search");
    const mouse = buttonByText(container, "Mouse");
    expect(search).not.toBeNull();
    expect(mouse).toBeDefined();

    await act(async () => {
      setInputValue(search!, "8K");
      mouse!.click();
    });

    expect(container.textContent).toContain("1件の製品");
    expect(container.textContent).toContain("AJ159 APEX");
    expect(container.textContent).not.toContain("AK820 PRO");
    expect(mouse?.getAttribute("aria-pressed")).toBe("true");
    expect(buttonByText(container, "条件をクリア")).toBeDefined();

    await act(async () => {
      setInputValue(search!, "headset");
    });

    expect(container.textContent).toContain("条件に一致する製品がありません。");
    const clear = buttonByText(container, "条件をクリア");
    expect(clear).toBeDefined();

    await act(async () => {
      clear!.click();
    });

    expect(search!.value).toBe("");
    expect(container.textContent).toContain("2件の製品");
    expect(container.textContent).toContain("AJ159 APEX");
    expect(container.textContent).toContain("8K Wireless Gaming Mouse");
    expect(container.textContent).toContain("AK820 PRO");
    expect(buttonByText(container, "すべて")?.getAttribute("aria-pressed")).toBe("true");
    expect(buttonByText(container, "条件をクリア")).toBeUndefined();

    await act(async () => {
      root.unmount();
    });
  });
});
