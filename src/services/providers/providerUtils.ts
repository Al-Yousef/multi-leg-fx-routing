import type { Provider } from "../../types/provider";
import type { ProviderStatus, QuoteEdge } from "../../types/routing";

export type QuoteEdgeLoadResult = {
  edges: QuoteEdge[];
  statuses: ProviderStatus[];
};

export type BaseRateResult = {
  edges: QuoteEdge[];
  errorMessage?: string;
  lastUpdated?: string;
};

export const FETCH_TIMEOUT_MS = 5000;

export function buildQuoteEdge(provider: Provider, from: string, to: string, rate: number): QuoteEdge {
  return {
    providerName: provider.name,
    providerType: provider.type,
    from,
    to,
    rate,
    feePercent: provider.fee_model.fee_percent,
    feeFlat: provider.fee_model.fee_flat,
  };
}

export async function fetchJsonWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
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

export function summarizeProviderResults(provider: Provider, results: BaseRateResult[]): QuoteEdgeLoadResult {
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

export function normalizeCurrencies(currencies: string[]): string[] {
  return [...new Set(currencies.map((currency) => currency.trim().toUpperCase()).filter(Boolean))];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request timed out";
  }

  return error instanceof Error ? error.message : "Unknown error";
}
