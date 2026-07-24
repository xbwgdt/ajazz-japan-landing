const RAKUTEN_CABINET_BASE_URL = "https://image.rakuten.co.jp/ajazz/cabinet";

export function normalizeRmsImageUrl(path: string) {
  return `${RAKUTEN_CABINET_BASE_URL}/${path.replace(/^\/+/, "")}`;
}
