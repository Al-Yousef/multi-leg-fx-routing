import { afterEach, describe, expect, it, vi } from "vitest";
import type { Provider } from "../../types/provider";
import { fetchBetaBankQuoteEdges } from "./betaBank";

const provider: Provider = {
  name: "BetaBank",
  type: "fiat_broker",
  rate_source: "live_api",
  api: {
    endpoint: "https://example.test/latest",
    docs: "https://example.test/docs",
  },
  fee_model: {
    fee_percent: 0.0008,
    fee_flat: 25,
    fee_currency: "source",
  },
};

describe("fetchBetaBankQuoteEdges", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks a provider as degraded when some bases fail but useful edges remain", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: "success",
            rates: {
              USD: 1.25,
            },
            time_last_update_utc: "Thu, 14 May 2026 00:02:31 +0000",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: "success" }), { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchBetaBankQuoteEdges(provider, ["GBP", "USD"]);

    expect(result.edges).toHaveLength(1);
    expect(result.statuses[0]).toMatchObject({
      providerName: "BetaBank",
      availability: "degraded",
      available: true,
      lastUpdated: "Thu, 14 May 2026 00:02:31 +0000",
    });
    expect(result.statuses[0].errorMessage).toContain("malformed rates for USD");
  });

  it("marks a provider as unavailable when all responses are malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: "success" }), { status: 200 })),
    );

    const result = await fetchBetaBankQuoteEdges(provider, ["GBP"]);

    expect(result.edges).toEqual([]);
    expect(result.statuses[0]).toMatchObject({
      availability: "unavailable",
      available: false,
    });
  });
});
