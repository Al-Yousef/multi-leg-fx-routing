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

type QuoteEdgeCacheEntry = {
  promise: Promise<QuoteEdgeLoadResult>;
  expiresAt: number;
};

type LoadQuoteEdgesOptions = {
  forceRefresh?: boolean;
};

const DEFAULT_FIAT_CURRENCIES = ["AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "USD"];
const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000;
const providerConfig = providersData as ProvidersFile;
const quoteEdgeCache = new Map<RailFilter, QuoteEdgeCacheEntry>();

export type { QuoteEdgeLoadResult };

export function getProviders(): Provider[] {
  return providerConfig.providers;
}

export function getSupportedCurrencies(): string[] {
  const staticCurrencies = providerConfig.providers.flatMap((provider) =>
    provider.pairs?.flatMap((pair) => [pair.from.trim().toUpperCase(), pair.to.trim().toUpperCase()]) ?? [],
  );

  return [...new Set([...DEFAULT_FIAT_CURRENCIES, ...staticCurrencies])].sort();
}

export function getStaticQuoteEdges(railFilter: RailFilter = "all"): QuoteEdge[] {
  return createStaticQuoteEdges(filterProviders(providerConfig.providers, railFilter));
}

export async function loadQuoteEdges(
  railFilter: RailFilter = "all",
  options: LoadQuoteEdgesOptions = {},
): Promise<QuoteEdgeLoadResult> {
  const cachedResult = quoteEdgeCache.get(railFilter);
  const now = Date.now();

  if (!options.forceRefresh && cachedResult && cachedResult.expiresAt > now) {
    return cachedResult.promise;
  }

  const loadPromise = loadQuoteEdgesUncached(railFilter).catch((error: unknown) => {
    if (quoteEdgeCache.get(railFilter)?.promise === loadPromise) {
      quoteEdgeCache.delete(railFilter);
    }
    throw error;
  });

  quoteEdgeCache.set(railFilter, {
    promise: loadPromise,
    expiresAt: now + QUOTE_CACHE_TTL_MS,
  });
  return loadPromise;
}

async function loadQuoteEdgesUncached(railFilter: RailFilter): Promise<QuoteEdgeLoadResult> {
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
  return providers.map((provider) => {
    const available = edges.some((edge) => edge.providerName === provider.name);

    return {
      providerName: provider.name,
      availability: available ? "available" : "unavailable",
      available,
      lastUpdated: "Inline config",
    };
  });
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
            availability: "unavailable",
            available: false,
            errorMessage: `No adapter is configured for ${provider.name}.`,
          },
        ],
      });
  }
}
