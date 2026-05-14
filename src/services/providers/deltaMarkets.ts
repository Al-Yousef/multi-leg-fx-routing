import type { Provider } from "../../types/provider";
import type { QuoteEdge } from "../../types/routing";
import {
  buildQuoteEdge,
  fetchJsonWithTimeout,
  getErrorMessage,
  isRecord,
  normalizeCurrencies,
  summarizeProviderResults,
  type BaseRateResult,
  type QuoteEdgeLoadResult,
} from "./providerUtils";

type DeltaMarketsResponse = {
  date?: unknown;
} & Record<string, unknown>;

export async function fetchDeltaMarketsQuoteEdges(
  provider: Provider,
  currencies: string[],
): Promise<QuoteEdgeLoadResult> {
  if (!provider.api) {
    return {
      edges: [],
      statuses: [
        {
          providerName: provider.name,
          available: false,
          errorMessage: "DeltaMarkets API config is missing.",
        },
      ],
    };
  }

  const requestedCurrencies = normalizeCurrencies(currencies);
  const results = await Promise.all(
    requestedCurrencies.map((baseCurrency) =>
      fetchDeltaMarketsBaseEdges(provider, baseCurrency, requestedCurrencies),
    ),
  );

  return summarizeProviderResults(provider, results);
}

async function fetchDeltaMarketsBaseEdges(
  provider: Provider,
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<BaseRateResult> {
  try {
    const baseKey = baseCurrency.toLowerCase();
    const payload = await fetchJsonWithTimeout(`${provider.api?.endpoint}/${baseKey}.json`);

    if (!isDeltaMarketsResponse(payload, baseKey)) {
      return {
        edges: [],
        errorMessage: `${provider.name} returned malformed rates for ${baseCurrency}.`,
      };
    }

    const rateTable = payload[baseKey];

    return {
      edges: targetCurrencies.flatMap((targetCurrency): QuoteEdge[] => {
        if (targetCurrency === baseCurrency) {
          return [];
        }

        const rate = rateTable[targetCurrency.toLowerCase()];

        if (!Number.isFinite(rate) || rate <= 0) {
          return [];
        }

        return [buildQuoteEdge(provider, baseCurrency, targetCurrency, rate)];
      }),
      lastUpdated: typeof payload.date === "string" ? payload.date : undefined,
    };
  } catch (error) {
    return {
      edges: [],
      errorMessage: `${provider.name} failed for ${baseCurrency}: ${getErrorMessage(error)}`,
    };
  }
}

function isDeltaMarketsResponse(
  value: unknown,
  baseKey: string,
): value is DeltaMarketsResponse & Record<typeof baseKey, Record<string, number>> {
  if (!isRecord(value) || !isRecord(value[baseKey])) {
    return false;
  }

  return Object.values(value[baseKey]).every((rate) => typeof rate === "number");
}
