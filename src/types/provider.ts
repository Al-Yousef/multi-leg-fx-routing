export type ProviderType = "fiat_broker" | "stablecoin_venue";

export type RateSource = "live_api" | "static";

export type FeeCurrency = "source";

export type FeeModel = {
  fee_percent: number;
  fee_flat: number;
  fee_currency: FeeCurrency;
};

export type ProviderApi = {
  endpoint: string;
  docs: string;
};

export type StaticPair = {
  from: string;
  to: string;
  rate: number;
};

// Provider represents the raw provider setup from providers.json.
// It is not a route result and does not contain calculated amounts.
// Static providers use pairs, while live providers use api.
export type Provider = {
  name: string;
  type: ProviderType;
  rate_source: RateSource;
  fee_model: FeeModel;
  api?: ProviderApi;
  pairs?: StaticPair[];
};

