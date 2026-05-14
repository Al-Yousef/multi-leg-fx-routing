import type { RouteResult } from "../types/routing";
import { formatAmount } from "../utils/format";
import { LegBreakdown } from "./LegBreakdown";

type RouteCardProps = {
  route: RouteResult;
  rank: number;
};

export function RouteCard({ route, rank }: RouteCardProps) {
  const targetCurrency = route.path.at(-1) ?? "";
  const sourceCurrency = route.path[0] ?? "";
  const legCount = route.legs.length;
  const hasComparison =
    route.differenceVsDirect !== undefined && route.percentageDifferenceVsDirect !== undefined;
  const pct = route.percentageDifferenceVsDirect;
  const diff = route.differenceVsDirect;
  const deltaTone = !hasComparison ? "neutral" : (pct ?? 0) >= 0 ? "positive" : "negative";
  const deltaPct = hasComparison ? `${(pct ?? 0) >= 0 ? "+" : ""}${(pct ?? 0).toFixed(2)}%` : "Direct n/a";
  const deltaAbs = hasComparison
    ? `${(diff ?? 0) >= 0 ? "+" : ""}${formatAmount(diff ?? 0, targetCurrency)}`
    : undefined;
  const showDetailsDefault = rank === 1;

  return (
    <article className={`route-card route-card--rank-${rank}`}>
      <header className="route-card__top">
        <span className={`route-card__delta route-card__delta--${deltaTone}`}>
          {deltaPct}
        </span>
        <div className="route-card__amount">
          <span>Delivered</span>
          <strong>{formatAmount(route.finalAmount, targetCurrency)}</strong>
        </div>
      </header>

      <RoutePath route={route} />

      <p className="route-card__meta">
        <span>
          {legCount} {legCount === 1 ? "leg" : "legs"}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {hasComparison && deltaAbs
            ? `${deltaAbs} vs best direct ${sourceCurrency}/${targetCurrency}`
            : "No direct one-leg route to compare"}
        </span>
      </p>

      <details className="route-card__details" open={showDetailsDefault}>
        <summary>
          <span>Fee breakdown</span>
          <span className="route-card__details-hint">{legCount} {legCount === 1 ? "step" : "steps"}</span>
        </summary>
        <ol className="leg-list">
          {route.legs.map((leg, index) => (
            <LegBreakdown
              key={`${leg.providerName}-${leg.from}-${leg.to}-${index}`}
              leg={leg}
              step={index + 1}
            />
          ))}
        </ol>
      </details>
    </article>
  );
}

function RoutePath({ route }: { route: RouteResult }) {
  return (
    <div className="route-path" aria-label="Provider path">
      {route.legs.map((leg, index) => (
        <span key={`${leg.from}-${leg.to}-${index}`} className="route-path__segment">
          {index === 0 ? (
            <span className="route-path__currency">{leg.from}</span>
          ) : null}
          <span className="route-path__hop">
            <span className="route-path__arrow" aria-hidden="true" />
            <span className="route-path__provider">{leg.providerName}</span>
          </span>
          <span className="route-path__currency">{leg.to}</span>
        </span>
      ))}
    </div>
  );
}
