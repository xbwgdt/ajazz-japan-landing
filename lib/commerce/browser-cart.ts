export interface BrowserCartLine {
  variantId: string;
  name: string;
  priceJpy: number;
  quantity: number;
}

export function addCartLine(lines: BrowserCartLine[], added: BrowserCartLine) {
  const quantity = Math.max(1, Math.floor(added.quantity));
  const existing = lines.find((line) => line.variantId === added.variantId);
  if (!existing) return [...lines, { ...added, quantity }];

  return lines.map((line) => line.variantId === added.variantId
    ? { ...line, quantity: line.quantity + quantity }
    : line);
}

export function removeCartLine(lines: BrowserCartLine[], variantId: string) {
  return lines.filter((line) => line.variantId !== variantId);
}

export function setCartLineQuantity(lines: BrowserCartLine[], variantId: string, quantity: number) {
  const normalized = Math.floor(quantity);
  if (normalized <= 0) return removeCartLine(lines, variantId);
  return lines.map((line) => line.variantId === variantId ? { ...line, quantity: normalized } : line);
}

export function cartTotalQuantity(lines: BrowserCartLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
