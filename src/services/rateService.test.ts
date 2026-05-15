import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FIAT_CURRENCIES = ["AUD", "CAD", "CHF", "EUR", "GBP", "JPY", "USD"];
const LIVE_PROVIDER_COUNT = 3;
const REQUESTS_PER_LIVE_LOAD = FIAT_CURRENCIES.length * LIVE_PROVIDER_COUNT;

describe("rateService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads all fiat and stablecoin providers for the all rail filter", async () => {
    const fetchMock = stubLiveRateFetch();
    const { loadQuoteEdges } = await import("./rateService");

    const result = await loadQuoteEdges("all");

    expect(fetchMock).toHaveBeenCalledTimes(REQUESTS_PER_LIVE_LOAD);
    expect(result.statuses.map((status) => status.providerName)).toEqual([
      "GammaCrypto",
      "EpsilonChain",
      "ZetaSwap",
      "AlphaFX",
      "BetaBank",
      "DeltaMarkets",
    ]);
    expect(result.edges).toHaveLength(160);
    expect(result.edges.some((edge) => edge.providerType === "fiat_broker")).toBe(true);
    expect(result.edges.some((edge) => edge.providerType === "stablecoin_venue")).toBe(true);
  });

  it("loads only live fiat providers for the fiat rail filter", async () => {
    const fetchMock = stubLiveRateFetch();
    const { loadQuoteEdges } = await import("./rateService");

    const result = await loadQuoteEdges("fiat");

    expect(fetchMock).toHaveBeenCalledTimes(REQUESTS_PER_LIVE_LOAD);
    expect(result.statuses.map((status) => status.providerName)).toEqual([
      "AlphaFX",
      "BetaBank",
      "DeltaMarkets",
    ]);
    expect(result.edges).toHaveLength(126);
    expect(result.edges.every((edge) => edge.providerType === "fiat_broker")).toBe(true);
  });

  it("loads only static stablecoin venues without calling live APIs", async () => {
    const fetchMock = stubLiveRateFetch();
    const { loadQuoteEdges } = await import("./rateService");

    const result = await loadQuoteEdges("stablecoin");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.statuses.map((status) => status.providerName)).toEqual([
      "GammaCrypto",
      "EpsilonChain",
      "ZetaSwap",
    ]);
    expect(result.edges).toHaveLength(34);
    expect(result.edges.every((edge) => edge.providerType === "stablecoin_venue")).toBe(true);
  });

  it("caches quote loads by rail filter", async () => {
    const fetchMock = stubLiveRateFetch();
    const { loadQuoteEdges } = await import("./rateService");

    const firstFiatLoad = await loadQuoteEdges("fiat");
    const secondFiatLoad = await loadQuoteEdges("fiat");
    const allRailLoad = await loadQuoteEdges("all");

    expect(secondFiatLoad).toBe(firstFiatLoad);
    expect(allRailLoad).not.toBe(firstFiatLoad);
    expect(fetchMock).toHaveBeenCalledTimes(REQUESTS_PER_LIVE_LOAD * 2);
  });

  it("refreshes cached quote loads when forced or expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-14T00:00:00Z"));

    const fetchMock = stubLiveRateFetch();
    const { loadQuoteEdges } = await import("./rateService");

    const firstLoad = await loadQuoteEdges("fiat");
    vi.setSystemTime(new Date("2026-05-14T00:04:00Z"));
    const cachedLoad = await loadQuoteEdges("fiat");
    const forcedLoad = await loadQuoteEdges("fiat", { forceRefresh: true });

    vi.setSystemTime(new Date("2026-05-14T00:10:00Z"));
    const expiredLoad = await loadQuoteEdges("fiat");

    expect(cachedLoad).toBe(firstLoad);
    expect(forcedLoad).not.toBe(firstLoad);
    expect(expiredLoad).not.toBe(forcedLoad);
    expect(fetchMock).toHaveBeenCalledTimes(REQUESTS_PER_LIVE_LOAD * 3);
  });
});

function stubLiveRateFetch() {
  const fetchMock = vi.fn((input: string | URL | Request) => {
    const url = String(input);

    return Promise.resolve(
      new Response(JSON.stringify(createLiveRatePayload(url)), {
        status: 200,
      }),
    );
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function createLiveRatePayload(url: string): unknown {
  if (url.includes("frankfurter")) {
    const base = new URL(url).searchParams.get("base") ?? "USD";

    return {
      date: "2026-05-14",
      rates: createUppercaseRates(base),
    };
  }

  if (url.includes("open.er-api")) {
    const base = getLastPathSegment(url);

    return {
      result: "success",
      time_last_update_utc: "Thu, 14 May 2026 00:02:31 +0000",
      rates: createUppercaseRates(base),
    };
  }

  const base = getLastPathSegment(url).replace(".json", "");

  return {
    date: "2026-05-14",
    [base]: createLowercaseRates(base),
  };
}

function createUppercaseRates(baseCurrency: string): Record<string, number> {
  return Object.fromEntries(
    FIAT_CURRENCIES.filter((currency) => currency !== baseCurrency.toUpperCase()).map((currency, index) => [
      currency,
      index + 1,
    ]),
  );
}

function createLowercaseRates(baseCurrency: string): Record<string, number> {
  return Object.fromEntries(
    FIAT_CURRENCIES.filter((currency) => currency !== baseCurrency.toUpperCase()).map((currency, index) => [
      currency.toLowerCase(),
      index + 1,
    ]),
  );
}

function getLastPathSegment(url: string): string {
  return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
}
