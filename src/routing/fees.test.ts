import { describe, expect, it } from "vitest";
import type { QuoteEdge } from "../types/routing";
import { calculateLeg } from "./fees";

const baseEdge: QuoteEdge = {
  providerName: "TestProvider",
  providerType: "fiat_broker",
  from: "GBP",
  to: "USD",
  rate: 1.25,
  feePercent: 0.01,
  feeFlat: 2,
};

describe("calculateLeg", () => {
  it("applies percentage and flat source-currency fees before the rate", () => {
    const leg = calculateLeg(baseEdge, 1000);

    expect(leg).toMatchObject({
      feeAmount: 12,
      netAmount: 988,
      outputAmount: 1235,
      feePercent: 0.01,
      feeFlat: 2,
    });
  });

  it("rejects non-positive input amounts", () => {
    expect(calculateLeg(baseEdge, 0)).toBeNull();
    expect(calculateLeg(baseEdge, -100)).toBeNull();
  });

  it("rejects invalid rates", () => {
    expect(calculateLeg({ ...baseEdge, rate: 0 }, 100)).toBeNull();
    expect(calculateLeg({ ...baseEdge, rate: Number.NaN }, 100)).toBeNull();
  });

  it("rejects legs where fees consume the full input", () => {
    expect(calculateLeg({ ...baseEdge, feePercent: 0, feeFlat: 100 }, 100)).toBeNull();
  });
});
