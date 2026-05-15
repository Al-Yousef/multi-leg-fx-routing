import { afterEach, describe, expect, it, vi } from "vitest";
import type { Provider } from "../../types/provider";
import { fetchAlphaFxQuoteEdges } from "./alphaFx";

const provider: Provider = {
  name: "AlphaFX",
  type: "fiat_broker",
  rate_source: "live_api",
  api: {
    endpoint: "https://example.test/latest",
    docs: "https://example.test/docs",
  },
  fee_model: {
    fee_percent: 0.0015,
    fee_flat: 0,
    fee_currency: "source",
  },
};

describe("fetchAlphaFxQuoteEdges", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes Frankfurter-style uppercase rates into quote edges", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            base: "GBP",
            date: "2026-05-14",
            rates: {
              USD: 1.35,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            base: "USD",
            date: "2026-05-14",
            rates: {
              GBP: 0.74,
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAlphaFxQuoteEdges(provider, ["GBP", "USD"]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.test/latest?base=GBP",
      expect.any(Object),
    );
    expect(result.edges).toContainEqual({
      providerName: "AlphaFX",
      providerType: "fiat_broker",
      from: "GBP",
      to: "USD",
      rate: 1.35,
      feePercent: 0.0015,
      feeFlat: 0,
    });
    expect(result.statuses[0]).toMatchObject({
      availability: "available",
      available: true,
      lastUpdated: "2026-05-14",
    });
  });

  it("marks a provider as degraded when one base returns malformed rates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            date: "2026-05-14",
            rates: {
              USD: 1.35,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ date: "2026-05-14" }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchAlphaFxQuoteEdges(provider, ["GBP", "USD"]);

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

    const result = await fetchAlphaFxQuoteEdges(provider, ["GBP"]);

    expect(result.edges).toEqual([]);
    expect(result.statuses[0]).toMatchObject({
      availability: "unavailable",
      available: false,
    });
  });
});
