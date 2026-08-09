import { APIError, type Field, type GlobalBeforeChangeHook, type GlobalBeforeValidateHook, type GlobalConfig } from "payload";
import { PRODUCT_CATEGORIES } from "../../lib/commerce/product-categories";
import { containsHtmlMarkup } from "../../lib/cms/site-settings";
import { adminOnly } from "../access/admin";
import { assertNoRetiredMediaReferences } from "../hooks/rejectRetiredMediaReferences";

const safeExternalUrl = (value: unknown): true | string => {
  if (!value) return true;
  if (typeof value !== "string") return "URLを入力してください。";
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "mailto:"
      ? true
      : "https: または mailto: のURLのみ使用できます。";
  } catch {
    return "有効なURLを入力してください。";
  }
};

function assertPlainContent(value: unknown, path = "site-settings"): void {
  if (typeof value === "string" && containsHtmlMarkup(value)) {
    throw new APIError("HTML is not allowed in site settings.", 400, {
      code: "site_settings_html_forbidden",
      path,
    });
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertPlainContent(item, `${path}.${index}`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertPlainContent(child, `${path}.${key}`);
    }
  }
}

const rejectArbitraryMarkup: GlobalBeforeValidateHook = ({ data }) => {
  assertPlainContent(data);
  return data;
};

const protectSiteSettingsMedia: GlobalBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const incoming = data?.homepage?.heroMediaId;
  const current = originalDoc?.homepage?.heroMediaId;
  await assertNoRetiredMediaReferences(req, { primaryImageId: incoming !== undefined ? incoming : current });
  return data;
};

const companySectionFields = (): Field[] => [
  { name: "eyebrow", type: "text", required: true },
  { name: "title", type: "textarea", required: true },
  {
    name: "paragraphs",
    type: "array",
    maxRows: 4,
    minRows: 1,
    fields: [{ name: "text", type: "textarea", required: true }],
  },
];

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "サイト設定",
  access: { read: adminOnly, update: adminOnly },
  versions: { drafts: true, max: 50 },
  hooks: {
    beforeChange: [protectSiteSettingsMedia],
    beforeValidate: [rejectArbitraryMarkup],
  },
  fields: [
    {
      name: "homepage",
      type: "group",
      label: "トップページ",
      fields: [
        { name: "eyebrow", type: "text" },
        { name: "title", type: "textarea" },
        { name: "copy", type: "textarea" },
        { name: "primaryCommandLabel", type: "text" },
        { name: "secondaryCommandLabel", type: "text" },
        { name: "heroMediaId", type: "relationship", relationTo: "media" },
        {
          name: "featuredCategoryOrder",
          dbName: "featured_cats",
          type: "array",
          maxRows: PRODUCT_CATEGORIES.length,
          fields: [{
            name: "category",
            dbName: "cat",
            type: "select",
            required: true,
            options: PRODUCT_CATEGORIES.map(({ key, label }) => ({ label, value: key })),
          }],
        },
        { name: "featuredProducts", type: "array", maxRows: 24, fields: [{ name: "slug", type: "text", required: true }] },
      ],
    },
    {
      name: "company",
      type: "group",
      label: "会社紹介",
      fields: [
        { name: "brand", type: "group", label: "ブランド紹介", fields: companySectionFields() },
        { name: "support", type: "group", label: "日本法人サポート", fields: companySectionFields() },
        {
          name: "business",
          type: "group",
          label: "法人向け対応力",
          fields: [...companySectionFields(), { name: "commandLabel", type: "text" }],
        },
      ],
    },
    {
      name: "contact",
      type: "group",
      label: "お問い合わせ",
      fields: [
        { name: "email", type: "email", defaultValue: "xiet@a-jazz.com" },
        { name: "phone", type: "text", defaultValue: "070-9319-5121" },
      ],
    },
    {
      name: "footer",
      type: "group",
      label: "フッター",
      fields: [
        { name: "companyName", type: "text" },
        { name: "address", type: "textarea" },
        {
          name: "navigation",
          type: "array",
          maxRows: 8,
          fields: [
            { name: "label", type: "text", required: true },
            {
              name: "href",
              type: "select",
              required: true,
              options: [
                { label: "ストア", value: "/" },
                { label: "会社情報", value: "/about" },
                { label: "特定商取引法", value: "/legal" },
                { label: "プライバシー", value: "/privacy" },
                { label: "利用規約", value: "/terms" },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "socialLinks",
      type: "array",
      label: "ソーシャルリンク",
      maxRows: 8,
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true, validate: safeExternalUrl },
      ],
    },
    {
      name: "legal",
      type: "group",
      label: "特定商取引法の表示内容",
      fields: [
        { name: "sellerName", type: "text" },
        { name: "responsiblePerson", type: "text" },
        { name: "address", type: "textarea" },
        { name: "phone", type: "text" },
        { name: "email", type: "email" },
        { name: "priceNotice", type: "textarea" },
        { name: "additionalFees", type: "textarea" },
        { name: "payment", type: "textarea" },
        { name: "delivery", type: "textarea" },
        { name: "deliveryArea", type: "textarea" },
        { name: "returns", type: "textarea" },
        { name: "refunds", type: "textarea" },
        { name: "quantity", type: "textarea" },
      ],
    },
  ],
};
