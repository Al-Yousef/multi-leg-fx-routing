import type { Provider } from "../../types/provider";
import type { QuoteEdge } from "../../types/routing";
import { buildQuoteEdge } from "./providerUtils";

// Converts static provider pairs into normalized QuoteEdges.
export function createStaticQuoteEdges(providers: Provider[]): QuoteEdge[] {
  return providers.flatMap((provider) => {
    if (provider.rate_source !== "static" || !provider.pairs) {
      return [];
    }

    return provider.pairs
      .filter((pair) => Number.isFinite(pair.rate) && pair.rate > 0)
      .map((pair) =>
        buildQuoteEdge(provider, pair.from.trim().toUpperCase(), pair.to.trim().toUpperCase(), pair.rate),
      );
  });
}

