import type { QuoteEdge, RouteLeg } from "../types/routing";

export function calculateLeg(edge: QuoteEdge, inputAmount: number): RouteLeg | null {
  if (inputAmount <= 0) {
    return null;
  }

  if (!Number.isFinite(edge.rate) || edge.rate <= 0) {
    return null;
  }

  // Fees combine the percentage charge on the input with the provider's flat fee.
  const feeAmount = inputAmount * edge.feePercent + edge.feeFlat;

  if (feeAmount >= inputAmount) {
    return null;
  }

  // The quoted rate applies only after fees are removed from the input amount.
  const netAmount = inputAmount - feeAmount;
  const outputAmount = netAmount * edge.rate;

  return {
    providerName: edge.providerName,
    providerType: edge.providerType,
    from: edge.from,
    to: edge.to,
    rate: edge.rate,
    feePercent: edge.feePercent,
    feeFlat: edge.feeFlat,
    inputAmount,
    feeAmount,
    netAmount,
    outputAmount,
  };
}

