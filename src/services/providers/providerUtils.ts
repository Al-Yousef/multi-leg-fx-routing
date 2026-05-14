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
const MAX_FETCH_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

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
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetchJsonAttempt(url, timeoutMs);
    } catch (error) {
      lastError = error;

      if (attempt === MAX_FETCH_ATTEMPTS || !isRetryableError(error)) {
        throw error;
      }

      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch rates.");
}

async function fetchJsonAttempt(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new HttpStatusError(response.status);
    }

    return await response.json();
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export function summarizeProviderResults(provider: Provider, results: BaseRateResult[]): QuoteEdgeLoadResult {
  const edges = results.flatMap((result) => result.edges);
  const failures = results.filter((result) => result.errorMessage);
  const availability = edges.length === 0 ? "unavailable" : failures.length > 0 ? "degraded" : "available";

  return {
    edges,
    statuses: [
      {
        providerName: provider.name,
        availability,
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
  if (isAbortError(error)) {
    return "Request timed out";
  }

  if (error instanceof HttpStatusError) {
    return `HTTP ${error.status}`;
  }

  return error instanceof Error ? error.message : "Unknown error";
}

class HttpStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

function isRetryableError(error: unknown): boolean {
  if (isAbortError(error)) {
    return true;
  }

  if (error instanceof HttpStatusError) {
    return error.status === 429 || error.status >= 500;
  }

  return error instanceof TypeError;
}

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}
