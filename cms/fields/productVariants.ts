import type { Field } from "payload";

export const productVariants: Field = {
  name: "variants",
  type: "array",
  labels: { singular: "Variant", plural: "Variants" },
  fields: [
    { name: "operationalVariantId", type: "text", index: true },
    { name: "sku", type: "text", required: true, index: true },
    { name: "rmsSkuNumber", type: "text", index: true },
    { name: "colorName", type: "text", required: true },
    { name: "colorSwatch", type: "text" },
    { name: "thumbnailId", type: "relationship", relationTo: "media" },
    { name: "imageId", type: "relationship", relationTo: "media" },
    { name: "salePriceJpy", type: "number", min: 1, required: true },
    { name: "compareAtPriceJpy", type: "number", min: 1 },
    {
      name: "comparisonEvidenceType",
      type: "select",
      options: [
        { label: "Manufacturer price", value: "manufacturer_price" },
        { label: "Recent price", value: "recent_price" },
        { label: "Market price", value: "market_price" },
      ],
    },
    { name: "comparisonEvidenceReference", type: "textarea" },
    { name: "comparisonApprovedBy", type: "relationship", relationTo: "admins" },
    { name: "comparisonApprovedAt", type: "date" },
    {
      name: "inventoryMode",
      type: "select",
      required: true,
      defaultValue: "manual",
      options: [
        { label: "RMS", value: "rms" },
        { label: "Manual", value: "manual" },
      ],
    },
    { name: "active", type: "checkbox", defaultValue: true },
  ],
};
