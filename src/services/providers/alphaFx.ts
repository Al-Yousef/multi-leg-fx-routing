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

type AlphaFxResponse = {
  base?: unknown;
  date?: unknown;
  rates?: unknown;
};

export async function fetchAlphaFxQuoteEdges(
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
          errorMessage: "AlphaFX API config is missing.",
        },
      ],
    };
  }

  const requestedCurrencies = normalizeCurrencies(currencies);
  const results = await Promise.all(
    requestedCurrencies.map((baseCurrency) =>
      fetchAlphaFxBaseEdges(provider, baseCurrency, requestedCurrencies),
    ),
  );

  return summarizeProviderResults(provider, results);
}

async function fetchAlphaFxBaseEdges(
  provider: Provider,
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<BaseRateResult> {
  try {
    const payload = await fetchJsonWithTimeout(
      `${provider.api?.endpoint}?from=${encodeURIComponent(baseCurrency)}`,
    );

    if (!isAlphaFxResponse(payload)) {
      return {
        edges: [],
        errorMessage: `${provider.name} returned malformed rates for ${baseCurrency}.`,
      };
    }

    // Frankfurter returns a base-currency table with uppercase quote symbols.
    return {
      edges: targetCurrencies.flatMap((targetCurrency): QuoteEdge[] => {
        if (targetCurrency === baseCurrency) {
          return [];
        }

        const rate = payload.rates[targetCurrency];

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

function isAlphaFxResponse(value: unknown): value is AlphaFxResponse & { rates: Record<string, number> } {
  if (!isRecord(value) || !isRecord(value.rates)) {
    return false;
  }

  return Object.values(value.rates).every((rate) => typeof rate === "number");
}
