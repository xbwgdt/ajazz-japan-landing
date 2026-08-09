export function manualInventoryEndpoint(operationalProductId: number | string): string {
  return `/api/cms/products/${encodeURIComponent(String(operationalProductId))}/inventory`;
}
