import providersData from "../data/providers.json";
import type { Provider } from "../types/provider";
import type { ProviderStatus, QuoteEdge } from "../types/routing";

type ProvidersFile = {
  providers: Provider[];
};

export type QuoteEdgeLoadResult = {
  edges: QuoteEdge[];
  statuses: ProviderStatus[];
};

const DEFAULT_FIAT_CURRENCIES = ["AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "USD"];
const FETCH_TIMEOUT_MS = 5000;

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

export async function fetchBetaBankQuoteEdges(
  currencies: string[] = DEFAULT_FIAT_CURRENCIES,
): Promise<QuoteEdgeLoadResult> {
  const provider = getProviderByName("BetaBank");

  if (!provider?.api) {
    return {
      edges: [],
      statuses: [
        {
          providerName: "BetaBank",
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
  const edges = results.flatMap((result) => result.edges);
  const failures = results.filter((result) => result.errorMessage);

  return {
    edges,
    statuses: [
      {
        providerName: provider.name,
        available: edges.length > 0,
        errorMessage: failures.length > 0 ? failures.map((failure) => failure.errorMessage).join(" ") : undefined,
        lastUpdated: results.find((result) => result.lastUpdated)?.lastUpdated,
      },
    ],
  };
}

type BaseRateResult = {
  edges: QuoteEdge[];
  errorMessage?: string;
  lastUpdated?: string;
};

type BetaBankResponse = {
  result?: unknown;
  rates?: unknown;
  time_last_update_utc?: unknown;
};

async function fetchBetaBankBaseEdges(
  provider: Provider,
  baseCurrency: string,
  targetCurrencies: string[],
): Promise<BaseRateResult> {
  try {
    const payload = await fetchJsonWithTimeout(`${provider.api?.endpoint}/${baseCurrency}`, FETCH_TIMEOUT_MS);

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
      edges: targetCurrencies.flatMap((targetCurrency) => {
        if (targetCurrency === baseCurrency) {
          return [];
        }

        const rate = payload.rates[targetCurrency];

        if (!Number.isFinite(rate) || rate <= 0) {
          return [];
        }

        return [
          {
            providerName: provider.name,
            providerType: provider.type,
            from: baseCurrency,
            to: targetCurrency,
            rate,
            feePercent: provider.fee_model.fee_percent,
            feeFlat: provider.fee_model.fee_flat,
          },
        ];
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

async function fetchJsonWithTimeout(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

function getProviderByName(providerName: string): Provider | undefined {
  return providerConfig.providers.find((provider) => provider.name === providerName);
}

function normalizeCurrencies(currencies: string[]): string[] {
  return [...new Set(currencies.map((currency) => currency.trim().toUpperCase()).filter(Boolean))];
}

function isBetaBankResponse(value: unknown): value is BetaBankResponse & { rates: Record<string, number> } {
  if (!isRecord(value) || !isRecord(value.rates)) {
    return false;
  }

  return Object.values(value.rates).every((rate) => typeof rate === "number");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

