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

type BetaBankResponse = {
  result?: unknown;
  rates?: unknown;
  time_last_update_utc?: unknown;
};

export async function fetchBetaBankQuoteEdges(
  provider: Provider,
  currencies: string[],
): Promise<QuoteEdgeLoadResult> {
  if (!provider.api) {
    return {
      edges: [],
      statuses: [
        {
          providerName: provider.name,
          availability: "unavailable",
          available: false,
          errorMessage: "BetaBank API config is missing.",
        },
      ],
    };
  }

  const requestedCurrencies = normalizeCurrencies(currencies);
  const results = await Promise.all(
    requestedCurrencies.map((baseCurrency) =>
      fetchBetaBankBaseEdges(provider, baseCurrency, requestedCurrencies),
    ),
  );

  return summarizeProviderResults(provider, results);
}

async function fetchBetaBankBaseEdges(
  provider: Provider,
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<BaseRateResult> {
  try {
    const payload = await fetchJsonWithTimeout(`${provider.api?.endpoint}/${baseCurrency}`);

    if (!isBetaBankResponse(payload)) {
      return {
        edges: [],
        errorMessage: `${provider.name} returned malformed rates for ${baseCurrency}.`,
      };
    }

    if (payload.result !== "success") {
      return {
        edges: [],
        errorMessage: `${provider.name} did not return success for ${baseCurrency}.`,
      };
    }

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
      lastUpdated:
        typeof payload.time_last_update_utc === "string" ? payload.time_last_update_utc : undefined,
    };
  } catch (error) {
    return {
      edges: [],
      errorMessage: `${provider.name} failed for ${baseCurrency}: ${getErrorMessage(error)}`,
    };
  }
}

function isBetaBankResponse(value: unknown): value is BetaBankResponse & { rates: Record<string, number> } {
  if (!isRecord(value) || !isRecord(value.rates)) {
    return false;
  }

  return Object.values(value.rates).every((rate) => typeof rate === "number");
}
