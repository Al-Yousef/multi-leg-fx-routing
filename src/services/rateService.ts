import providersData from "../data/providers.json";
import type { Provider } from "../types/provider";
import type { ProviderStatus, QuoteEdge, RailFilter } from "../types/routing";
import { fetchAlphaFxQuoteEdges } from "./providers/alphaFx";
import { fetchBetaBankQuoteEdges } from "./providers/betaBank";
import { fetchDeltaMarketsQuoteEdges } from "./providers/deltaMarkets";
import { createStaticQuoteEdges } from "./providers/staticProvider";
import type { QuoteEdgeLoadResult } from "./providers/providerUtils";

type ProvidersFile = {
  providers: Provider[];
};

const DEFAULT_FIAT_CURRENCIES = ["AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "USD"];
const providerConfig = providersData as ProvidersFile;

export type { QuoteEdgeLoadResult };

export function getProviders(): Provider[] {
  return providerConfig.providers;
}

export function getSupportedCurrencies(): string[] {
  const staticCurrencies = providerConfig.providers.flatMap((provider) =>
    provider.pairs?.flatMap((pair) => [pair.from, pair.to]) ?? [],
  );

  return [...new Set([...DEFAULT_FIAT_CURRENCIES, ...staticCurrencies])].sort();
}

export function getStaticQuoteEdges(railFilter: RailFilter = "all"): QuoteEdge[] {
  return createStaticQuoteEdges(filterProviders(providerConfig.providers, railFilter));
}

export async function loadQuoteEdges(railFilter: RailFilter = "all"): Promise<QuoteEdgeLoadResult> {
  const providers = filterProviders(providerConfig.providers, railFilter);
  const staticProviders = providers.filter((provider) => provider.rate_source === "static");
  const staticEdges = createStaticQuoteEdges(staticProviders);

  const liveResults = await Promise.all(
    providers
      .filter((provider) => provider.rate_source === "live_api")
      .map((provider) => fetchLiveProviderQuoteEdges(provider, DEFAULT_FIAT_CURRENCIES)),
  );

  return {
    edges: [...staticEdges, ...liveResults.flatMap((result) => result.edges)],
    statuses: [
      ...buildStaticProviderStatuses(staticProviders, staticEdges),
      ...liveResults.flatMap((result) => result.statuses),
    ],
  };
}

function filterProviders(providers: Provider[], railFilter: RailFilter): Provider[] {
  if (railFilter === "fiat") {
    return providers.filter((provider) => provider.type === "fiat_broker");
  }

  if (railFilter === "stablecoin") {
    return providers.filter((provider) => provider.type === "stablecoin_venue");
  }

  return providers;
}

function buildStaticProviderStatuses(providers: Provider[], edges: QuoteEdge[]): ProviderStatus[] {
  return providers.map((provider) => ({
    providerName: provider.name,
    available: edges.some((edge) => edge.providerName === provider.name),
    lastUpdated: "Inline config",
  }));
}

function fetchLiveProviderQuoteEdges(
  provider: Provider,
  currencies: string[],
): Promise<QuoteEdgeLoadResult> {
  switch (provider.name) {
    case "AlphaFX":
      return fetchAlphaFxQuoteEdges(provider, currencies);
    case "BetaBank":
      return fetchBetaBankQuoteEdges(provider, currencies);
    case "DeltaMarkets":
      return fetchDeltaMarketsQuoteEdges(provider, currencies);
    default:
      return Promise.resolve({
        edges: [],
        statuses: [
          {
            providerName: provider.name,
            available: false,
            errorMessage: `No adapter is configured for ${provider.name}.`,
          },
        ],
      });
  }
}
