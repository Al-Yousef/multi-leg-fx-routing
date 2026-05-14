import { describe, expect, it } from "vitest";
import type { QuoteEdge } from "../types/routing";
import { findTopRoutes } from "./routeEngine";

function edge(providerName: string, from: string, to: string, rate: number, feeFlat = 0, feePercent = 0): QuoteEdge {
  return {
    providerName,
    providerType: "fiat_broker",
    from,
    to,
    rate,
    feePercent,
    feeFlat,
  };
}

describe("findTopRoutes", () => {
  it("returns the top three routes by final delivered amount", () => {
    const routes = findTopRoutes(
      [
        edge("Fourth", "GBP", "JPY", 100),
        edge("Second", "GBP", "JPY", 130),
        edge("First", "GBP", "JPY", 140),
        edge("Third", "GBP", "JPY", 120),
      ],
      "GBP",
      "JPY",
      10,
    );

    expect(routes).toHaveLength(3);
    expect(routes.map((route) => route.legs[0].providerName)).toEqual(["First", "Second", "Third"]);
  });

  it("uses leg count and provider path as deterministic tie-breakers", () => {
    const routes = findTopRoutes(
      [
        edge("ZDirect", "GBP", "JPY", 100),
        edge("BFirst", "GBP", "USD", 10),
        edge("BSecond", "USD", "JPY", 10),
        edge("AFirst", "GBP", "EUR", 10),
        edge("ASecond", "EUR", "JPY", 10),
      ],
      "GBP",
      "JPY",
      100,
    );

    expect(routes.map((route) => route.legs.map((leg) => leg.providerName))).toEqual([
      ["ZDirect"],
      ["AFirst", "ASecond"],
      ["BFirst", "BSecond"],
    ]);
  });

  it("compares every route to the best one-leg route after fees", () => {
    const [bestRoute] = findTopRoutes(
      [
        edge("Direct", "GBP", "JPY", 100),
        edge("LegOne", "GBP", "USD", 2),
        edge("LegTwo", "USD", "JPY", 60),
      ],
      "GBP",
      "JPY",
      100,
    );

    expect(bestRoute.path).toEqual(["GBP", "USD", "JPY"]);
    expect(bestRoute.finalAmount).toBe(12_000);
    expect(bestRoute.differenceVsDirect).toBe(2_000);
    expect(bestRoute.percentageDifferenceVsDirect).toBe(20);
  });

  it("never uses more than three legs", () => {
    const routes = findTopRoutes(
      [
        edge("One", "A", "B", 1),
        edge("Two", "B", "C", 1),
        edge("Three", "C", "D", 1),
        edge("Four", "D", "E", 1),
      ],
      "A",
      "E",
      100,
    );

    expect(routes).toEqual([]);
  });

  it("rejects currency cycles while still exploring valid paths", () => {
    const routes = findTopRoutes(
      [
        edge("Outbound", "A", "B", 1),
        edge("Cycle", "B", "A", 100),
        edge("Finish", "B", "C", 2),
      ],
      "A",
      "C",
      100,
    );

    expect(routes).toHaveLength(1);
    expect(routes[0].path).toEqual(["A", "B", "C"]);
  });

  it("allows flat fees to change the best provider as amount scales", () => {
    const edges = [
      edge("LowPercentHighFlat", "GBP", "USD", 1, 50, 0),
      edge("HighPercentNoFlat", "GBP", "USD", 1, 0, 0.1),
    ];

    const smallBest = findTopRoutes(edges, "GBP", "USD", 100)[0];
    const largeBest = findTopRoutes(edges, "GBP", "USD", 10_000)[0];

    expect(smallBest.legs[0].providerName).toBe("HighPercentNoFlat");
    expect(largeBest.legs[0].providerName).toBe("LowPercentHighFlat");
  });
});
