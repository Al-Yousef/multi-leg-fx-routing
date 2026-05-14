export function formatAmount(value: number, currency: string): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 2 : 6,
  }).format(value)} ${currency}`;
}

export function formatRate(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(value);
}

export function formatFeePercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: 4,
  }).format(value);
}
