import { afterEach, describe, expect, it, vi } from "vitest";
import type { Provider } from "../../types/provider";
import { fetchDeltaMarketsQuoteEdges } from "./deltaMarkets";

const provider: Provider = {
  name: "DeltaMarkets",
  type: "fiat_broker",
  rate_source: "live_api",
  api: {
    endpoint: "https://example.test/currencies",
    docs: "https://example.test/docs",
  },
  fee_model: {
    fee_percent: 0.0011,
    fee_flat: 5,
    fee_currency: "source",
  },
};

describe("fetchDeltaMarketsQuoteEdges", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes currency-api lowercase rate tables into quote edges", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            date: "2026-05-14",
            gbp: {
              usd: 1.352,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            date: "2026-05-14",
            usd: {
              gbp: 0.7396,
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDeltaMarketsQuoteEdges(provider, ["GBP", "USD"]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.test/currencies/gbp.json",
      expect.any(Object),
    );
    expect(result.edges).toContainEqual({
      providerName: "DeltaMarkets",
      providerType: "fiat_broker",
      from: "GBP",
      to: "USD",
      rate: 1.352,
      feePercent: 0.0011,
      feeFlat: 5,
    });
    expect(result.statuses[0]).toMatchObject({
      availability: "available",
      available: true,
      lastUpdated: "2026-05-14",
    });
  });

  it("marks a provider as degraded when one lowercase base table is malformed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            date: "2026-05-14",
            gbp: {
              usd: 1.352,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ date: "2026-05-14" }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchDeltaMarketsQuoteEdges(provider, ["GBP", "USD"]);

    expect(result.edges).toHaveLength(1);
    expect(result.statuses[0]).toMatchObject({
      availability: "degraded",
      available: true,
      lastUpdated: "2026-05-14",
    });
    expect(result.statuses[0].errorMessage).toContain("malformed rates for USD");
  });

  it("marks a provider as unavailable when all responses are malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ date: "2026-05-14" }), { status: 200 })),
    );

    const result = await fetchDeltaMarketsQuoteEdges(provider, ["GBP"]);

    expect(result.edges).toEqual([]);
    expect(result.statuses[0]).toMatchObject({
      availability: "unavailable",
      available: false,
    });
  });
});
