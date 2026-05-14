import { describe, expect, it } from "vitest";
import type { Provider } from "../../types/provider";
import { createStaticQuoteEdges } from "./staticProvider";

describe("createStaticQuoteEdges", () => {
  it("normalizes static pair casing and filters invalid rates", () => {
    const provider: Provider = {
      name: "StaticVenue",
      type: "stablecoin_venue",
      rate_source: "static",
      fee_model: {
        fee_percent: 0.001,
        fee_flat: 1,
        fee_currency: "source",
      },
      pairs: [
        { from: " gbp ", to: "usdt", rate: 1.25 },
        { from: "GBP", to: "USDC", rate: 0 },
      ],
    };

    expect(createStaticQuoteEdges([provider])).toEqual([
      {
        providerName: "StaticVenue",
        providerType: "stablecoin_venue",
        from: "GBP",
        to: "USDT",
        rate: 1.25,
        feePercent: 0.001,
        feeFlat: 1,
      },
    ]);
  });
});
