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

export function cartTotalQuantity(lines: BrowserCartLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
