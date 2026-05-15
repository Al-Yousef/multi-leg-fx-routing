// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ProviderStatus, RouteResult } from "../types/routing";
import { RouteResults } from "./RouteResults";

const statuses: ProviderStatus[] = [
  {
    providerName: "AlphaFX",
    availability: "available",
    available: true,
    lastUpdated: "2026-05-14",
  },
  {
    providerName: "BetaBank",
    availability: "degraded",
    available: true,
    errorMessage: "Missing JPY quotes.",
  },
  {
    providerName: "DeltaMarkets",
    availability: "unavailable",
    available: false,
    errorMessage: "Request timed out.",
  },
];

afterEach(() => {
  cleanup();
});

describe("RouteResults", () => {
  it("shows loading state while provider quotes load", () => {
    render(<RouteResults routes={[]} statuses={[]} isLoading />);

    expect(screen.getByText("Loading provider quotes...")).toBeInTheDocument();
    expect(screen.queryByText("No route found for this currency pair and rail filter.")).not.toBeInTheDocument();
  });

  it("shows provider health and error details", () => {
    render(<RouteResults routes={[]} statuses={statuses} isLoading={false} />);

    expect(screen.getByText("AlphaFX")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("BetaBank")).toBeInTheDocument();
    expect(screen.getByText("Degraded")).toBeInTheDocument();
    expect(screen.getByText("Missing JPY quotes.")).toBeInTheDocument();
    expect(screen.getByText("DeltaMarkets")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Request timed out.")).toBeInTheDocument();
  });

  it("shows a no-route message only after loading succeeds with no routes", () => {
    render(<RouteResults routes={[]} statuses={statuses} isLoading={false} />);

    expect(screen.getByText("No route found for this currency pair and rail filter.")).toBeInTheDocument();
  });

  it("shows provider load errors instead of the no-route message", () => {
    render(
      <RouteResults
        routes={[]}
        statuses={[]}
        isLoading={false}
        errorMessage="Failed to load provider quotes."
      />,
    );

    expect(screen.getByText("Failed to load provider quotes.")).toBeInTheDocument();
    expect(screen.queryByText("No route found for this currency pair and rail filter.")).not.toBeInTheDocument();
  });

  it("renders ranked routes when available", () => {
    render(<RouteResults routes={[route]} statuses={statuses} isLoading={false} />);

    expect(screen.getByText("Best route")).toBeInTheDocument();
    expect(screen.getByText("1,240 USD", { selector: ".route-card__amount" })).toBeInTheDocument();
    expect(screen.getByText("8 GBP")).toBeInTheDocument();
    expect(screen.getByText("992 GBP")).toBeInTheDocument();
    expect(screen.queryByText("No route found for this currency pair and rail filter.")).not.toBeInTheDocument();
  });
});

const route: RouteResult = {
  path: ["GBP", "USD"],
  initialAmount: 1000,
  finalAmount: 1240,
  differenceVsDirect: 40,
  percentageDifferenceVsDirect: 3.33,
  legs: [
    {
      providerName: "AlphaFX",
      providerType: "fiat_broker",
      from: "GBP",
      to: "USD",
      rate: 1.25,
      feePercent: 0.005,
      feeFlat: 3,
      inputAmount: 1000,
      feeAmount: 8,
      netAmount: 992,
      outputAmount: 1240,
    },
  ],
};
