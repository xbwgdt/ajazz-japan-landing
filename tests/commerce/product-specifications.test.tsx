import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CartProvider } from "../../components/store/CartProvider";
import { ProductDetail } from "../../components/store/ProductDetail";
import { mapCmsSpecifications } from "../../lib/commerce/product-specifications";

describe("CMS product specifications", () => {
  it("loads the existing Payload specification tables without adding operational columns", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/commerce/storefront-db.ts"), "utf8");

    expect(source).toContain("LEFT JOIN cms.products cp ON cp.id::text = p.cms_product_id");
    expect(source).toContain("cms.products_specifications_connection_modes");
    expect(source).toContain("cms.products_specifications_headset_connection");
    expect(source).toContain("cms.products_specifications_supported_applications");
    expect(source).toContain("cms._product_os_v");
    expect(source).toContain("cms._products_v");
  });

  it("maps Payload scalar and relation-backed specification fields", () => {
    expect(mapCmsSpecifications({
      keyboard_layout: "75% JIS",
      size: "333 x 145 x 42 mm",
      switch_type: "Magnetic",
      polling_rate_hz: "8000",
      rapid_trigger_supported: true,
      actuation_min_mm: "0.1",
      actuation_max_mm: "4.0",
      keycap_material: "PBT",
      mouse_sensor: null,
      maximum_dpi: null,
      weight_grams: "980",
      button_count: null,
      driver_size_mm: null,
      microphone_type: null,
      stream_controller_key_count: null,
      stream_controller_display_count: null,
      connection_modes: ["wired", "2.4ghz", "bluetooth"],
      headset_connection: [],
      supported_applications: ["AJAZZ Driver", "Discord"],
      supported_operating_systems: ["windows", "macos"],
    })).toEqual({
      keyboardLayout: "75% JIS",
      size: "333 x 145 x 42 mm",
      switchType: "Magnetic",
      connectionModes: ["wired", "2.4ghz", "bluetooth"],
      pollingRateHz: 8000,
      rapidTriggerSupported: true,
      actuationMinMm: 0.1,
      actuationMaxMm: 4,
      keycapMaterial: "PBT",
      weightGrams: 980,
      supportedApplications: ["AJAZZ Driver", "Discord"],
      supportedOperatingSystems: ["windows", "macos"],
    });
  });

  it("renders meaningful CMS specifications instead of placeholder copy", () => {
    const html = renderToStaticMarkup(<CartProvider><ProductDetail product={{
      name: "AK820 MAX",
      sanitizedDescriptionHtml: "",
      images: [],
      specifications: {
        keyboardLayout: "75% JIS",
        connectionModes: ["wired", "2.4ghz", "bluetooth"],
        pollingRateHz: 8000,
        rapidTriggerSupported: true,
        actuationMinMm: 0.1,
        weightGrams: 980,
        supportedOperatingSystems: ["windows", "macos"],
      },
      variants: [{ rmsSkuNumber: "AK820", priceJpy: 10000, availableQuantity: 1 }],
    }} /></CartProvider>);

    expect(html).toContain("75% JIS");
    expect(html).toContain("有線 / 2.4 GHz / Bluetooth");
    expect(html).toContain("8,000 Hz");
    expect(html).toContain("対応");
    expect(html).toContain("0.1 mm");
    expect(html).toContain("980 g");
    expect(html).toContain("Windows / macOS");
    expect(html).not.toContain("商品データから確認できます");
  });
});
