export type ProductCategoryKey =
  | "rapid-trigger-keyboard"
  | "mechanical-keyboard"
  | "membrane-keyboard"
  | "mouse"
  | "stream-controller"
  | "headset"
  | "other";

type ProductCategory = Readonly<{
  key: ProductCategoryKey;
  label: string;
}>;

export const PRODUCT_CATEGORIES = [
  { key: "rapid-trigger-keyboard", label: "Rapid Trigger Keyboard" },
  { key: "mechanical-keyboard", label: "Mechanical Keyboard" },
  { key: "membrane-keyboard", label: "Membrane Keyboard" },
  { key: "mouse", label: "Mouse" },
  { key: "stream-controller", label: "Stream Controller" },
  { key: "headset", label: "Headset" },
  { key: "other", label: "Other" },
] as const satisfies readonly ProductCategory[];

const categoryKeys = new Set<ProductCategoryKey>(PRODUCT_CATEGORIES.map(({ key }) => key));

function normalizeCategoryText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

export function normalizeProductCategory(value: unknown): ProductCategoryKey {
  const normalized = normalizeCategoryText(value);
  const category = PRODUCT_CATEGORIES.find(({ key, label }) =>
    normalized === normalizeCategoryText(key) || normalized === normalizeCategoryText(label),
  );
  return category && categoryKeys.has(category.key) ? category.key : "other";
}

export function productCategoryLabel(key: ProductCategoryKey) {
  return PRODUCT_CATEGORIES.find((category) => category.key === key)?.label ?? "Other";
}

export function classifyProductCategory(input: {
  rmsManageNumber: string;
  name: string;
  descriptionHtml: string;
}): ProductCategoryKey {
  const text = `${input.rmsManageNumber} ${input.name} ${input.descriptionHtml}`
    .normalize("NFKC")
    .replace(/<[^>]*>/g, " ")
    .toLowerCase();
  const keyboard = /キーボード|keyboard|\bak(?!p)[a-z0-9-]*/.test(text);
  if (keyboard && /ラピッドトリガー|rapid\s*trigger|磁気(?:式|スイッチ)?|magnetic\s*switch|hall\s*effect/.test(text)) return "rapid-trigger-keyboard";
  if (/ゲーミングマウス|\bmouse\b|マウス|\baj\d/.test(text)) return "mouse";
  if (/ストリームコントローラー|stream\s*(?:controller|deck)|\bakp\d/.test(text)) return "stream-controller";
  if (/ヘッドセット|ヘッドホン|headset|headphone/.test(text)) return "headset";
  if (keyboard && /メンブレン|membrane/.test(text)) return "membrane-keyboard";
  if (keyboard) return "mechanical-keyboard";
  return "other";
}
