import providersData from "../data/providers.json";
import type { Provider } from "../types/provider";
import type { QuoteEdge } from "../types/routing";

type ProvidersFile = {
  providers: Provider[];
};

const providerConfig = providersData as ProvidersFile;

export function getStaticQuoteEdges(): QuoteEdge[] {
  return providerConfig.providers.flatMap((provider) => {
    if (provider.rate_source !== "static" || !provider.pairs) {
      return [];
    }

    // Static venues already list tradable pairs; normalization attaches provider fees
    // so the route engine can treat every rate source as the same QuoteEdge shape.
    return provider.pairs.map((pair) => ({
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

