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
  aliases: readonly string[];
}>;

export const PRODUCT_CATEGORIES = [
  { key: "rapid-trigger-keyboard", label: "ラピッドトリガーキーボード", aliases: ["Rapid Trigger Keyboard"] },
  { key: "mechanical-keyboard", label: "メカニカルキーボード", aliases: ["Mechanical Keyboard"] },
  { key: "membrane-keyboard", label: "メンブレンキーボード", aliases: ["Membrane Keyboard"] },
  { key: "mouse", label: "マウス", aliases: ["Mouse"] },
  { key: "stream-controller", label: "ストリームコントローラー", aliases: ["Stream Controller"] },
  { key: "headset", label: "ヘッドセット", aliases: ["Headset"] },
  { key: "other", label: "その他", aliases: ["Other"] },
] as const satisfies readonly ProductCategory[];

const categoryKeys = new Set<ProductCategoryKey>(PRODUCT_CATEGORIES.map(({ key }) => key));

function normalizeCategoryText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ")
    : "";
}

export function normalizeProductCategory(value: unknown): ProductCategoryKey {
  const normalized = normalizeCategoryText(value);
  const category = PRODUCT_CATEGORIES.find(({ key, label, aliases }) =>
    normalized === normalizeCategoryText(key)
      || normalized === normalizeCategoryText(label)
      || aliases.some((alias) => normalized === normalizeCategoryText(alias)),
  );
  return category && categoryKeys.has(category.key) ? category.key : "other";
}

export function productCategoryLabel(key: ProductCategoryKey) {
  return PRODUCT_CATEGORIES.find((category) => category.key === key)?.label ?? "その他";
}

export function productCategorySearchTerms(key: ProductCategoryKey) {
  const category = PRODUCT_CATEGORIES.find((item) => item.key === key);
  return category ? [category.key, category.label, ...category.aliases] : [key];
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
  if (/ストリームコントローラー|stream\s*(?:controller|deck)|\bakp\d/.test(text)) return "stream-controller";
  if (keyboard && /ラピッドトリガー|rapid\s*trigger|磁気(?:軸|スイッチ)|magnetic\s*switch|hall\s*effect/.test(text)) return "rapid-trigger-keyboard";
  if (/ゲーミングマウス|\bmouse\b|マウス|\baj\d/.test(text)) return "mouse";
  if (/ヘッドセット|ヘッドホン|headset|headphone/.test(text)) return "headset";
  if (keyboard && /メンブレン|membrane/.test(text)) return "membrane-keyboard";
  if (keyboard) return "mechanical-keyboard";
  return "other";
}
