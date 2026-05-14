import type { Provider } from "../../types/provider";
import type { QuoteEdge } from "../../types/routing";

// Converts static provider pairs into normalized QuoteEdges.
export function createStaticQuoteEdges(providers: Provider[]): QuoteEdge[] {
  return providers.flatMap((provider) => {
    if (provider.rate_source !== "static" || !provider.pairs) {
      return [];
    }

    return provider.pairs
      .filter((pair) => Number.isFinite(pair.rate) && pair.rate > 0)
      .map((pair) => ({
        providerName: provider.name,
        providerType: provider.type,
        from: pair.from,
        to: pair.to,
        rate: pair.rate,
        feePercent: provider.fee_model.fee_percent,
        feeFlat: provider.fee_model.fee_flat,
      }));
  });
}

