import type { QuoteEdge, RouteLeg, RouteResult } from "../types/routing";
import { calculateLeg } from "./fees";

const MAX_LEGS = 3;
const TOP_ROUTE_LIMIT = 3;

export function findTopRoutes(
  edges: QuoteEdge[],
  sourceCurrency: string,
  targetCurrency: string,
  inputAmount: number,
): RouteResult[] {
  // Direct routes are calculated separately so every candidate can be compared
  // against the best one-leg option when that option exists.
  const directRoutes = buildRoutes(edges, sourceCurrency, targetCurrency, inputAmount, 1);
  const directBest = directRoutes[0]?.finalAmount;

  return buildRoutes(edges, sourceCurrency, targetCurrency, inputAmount, MAX_LEGS)
    .map((route) => addDirectComparison(route, directBest))
    .sort(compareRoutes)
    .slice(0, TOP_ROUTE_LIMIT);
}

function buildRoutes(
  edges: QuoteEdge[],
  sourceCurrency: string,
  targetCurrency: string,
  inputAmount: number,
  maxLegs: number,
): RouteResult[] {
  const routes: RouteResult[] = [];

  // The search is intentionally bounded to the assignment's maximum of 3 legs.
  searchRoutes({
    edges,
    targetCurrency,
    initialAmount: inputAmount,
    currentCurrency: sourceCurrency,
    currentAmount: inputAmount,
    maxLegs,
    path: [sourceCurrency],
    legs: [],
    routes,
  });

  return routes.sort(compareRoutes);
}

type SearchState = {
  edges: QuoteEdge[];
  targetCurrency: string;
  initialAmount: number;
  currentCurrency: string;
  currentAmount: number;
  maxLegs: number;
  path: string[];
  legs: RouteLeg[];
  routes: RouteResult[];
};

function searchRoutes(state: SearchState): void {
  if (state.legs.length >= state.maxLegs) {
    return;
  }

  const nextEdges = state.edges.filter((edge) => edge.from === state.currentCurrency);

  for (const edge of nextEdges) {
    // Reject currency cycles like GBP -> USD -> GBP before calculating fees.
    if (state.path.includes(edge.to)) {
      continue;
    }

    // Every leg uses the previous leg's output as its input amount.
    const leg = calculateLeg(edge, state.currentAmount);

    if (!leg) {
      continue;
    }

    const nextPath = [...state.path, edge.to];
    const nextLegs = [...state.legs, leg];

    if (edge.to === state.targetCurrency) {
      state.routes.push({
        legs: nextLegs,
        path: nextPath,
        initialAmount: state.initialAmount,
        finalAmount: leg.outputAmount,
      });
      continue;
    }

    searchRoutes({
      ...state,
      currentCurrency: edge.to,
      currentAmount: leg.outputAmount,
      path: nextPath,
      legs: nextLegs,
    });
  }
}

function addDirectComparison(route: RouteResult, directBest?: number): RouteResult {
  if (directBest === undefined) {
    return route;
  }

  // Positive values mean this route delivers more than the best direct route.
  const differenceVsDirect = route.finalAmount - directBest;

  return {
    ...route,
    differenceVsDirect,
    percentageDifferenceVsDirect: (differenceVsDirect / directBest) * 100,
  };
}

function compareRoutes(a: RouteResult, b: RouteResult): number {
  const amountDifference = b.finalAmount - a.finalAmount;

  if (amountDifference !== 0) {
    return amountDifference;
  }

  const legDifference = a.legs.length - b.legs.length;

  if (legDifference !== 0) {
    return legDifference;
  }

  return routeSignature(a).localeCompare(routeSignature(b));
}

function routeSignature(route: RouteResult): string {
  return route.legs.map((leg) => `${leg.from}-${leg.providerName}-${leg.to}`).join("|");
}

