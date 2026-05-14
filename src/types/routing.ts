import type { ProviderType } from "./provider";

// RailFilter controls which provider rails can be used for routing.
export type RailFilter = "all" | "fiat" | "stablecoin";

// QuoteEdge represents one available conversion option from one provider.
export type QuoteEdge = {
  providerName: string;
  providerType: ProviderType;
  from: string;
  to: string;
  rate: number;
  feePercent: number;
  feeFlat: number;
};

// RouteLeg represents one used conversion step after the user enters an amount.
export type RouteLeg = {
  providerName: string;
  providerType: ProviderType;
  from: string;
  to: string;
  rate: number;
  feePercent: number;
  feeFlat: number;
  inputAmount: number;
  feeAmount: number;
  netAmount: number;
  outputAmount: number;
};

// RouteResult represents the full calculated route.
export type RouteResult = {
  legs: RouteLeg[];
  path: string[];
  initialAmount: number;
  finalAmount: number;
  differenceVsDirect?: number;
  percentageDifferenceVsDirect?: number;
};

export type ProviderAvailability = "available" | "degraded" | "unavailable";

// ProviderStatus tracks whether a provider was usable or failed while loading rates.
export type ProviderStatus = {
  providerName: string;
  availability: ProviderAvailability;
  available: boolean;
  errorMessage?: string;
  lastUpdated?: string;
};

