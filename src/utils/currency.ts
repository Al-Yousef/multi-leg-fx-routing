export function normalizeCurrency(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeAmount(value: string): number {
  return Number(value.replaceAll(",", "").trim());
}
