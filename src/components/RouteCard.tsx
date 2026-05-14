import type { RouteResult } from "../types/routing";
import { formatAmount } from "../utils/format";
import { LegBreakdown } from "./LegBreakdown";

type RouteCardProps = {
  route: RouteResult;
  rank: number;
};

export function RouteCard({ route, rank }: RouteCardProps) {
  const targetCurrency = route.path.at(-1) ?? "";
  const legCount = route.legs.length;
  const hasComparison =
    route.differenceVsDirect !== undefined && route.percentageDifferenceVsDirect !== undefined;
  const pct = route.percentageDifferenceVsDirect ?? 0;
  const deltaTone = !hasComparison ? "neutral" : pct >= 0 ? "positive" : "negative";
  const deltaPct = hasComparison
    ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
    : "direct n/a";
  const rankLabel = rank === 1 ? "Best route" : "Alternative";

  return (
    <article className={`route-card route-card--rank-${rank}`}>
      <header className="route-card__top">
        <div className="route-card__lead">
          <span className="route-card__rank">{rankLabel}</span>
          <strong className="route-card__amount">
            {formatAmount(route.finalAmount, targetCurrency)}
          </strong>
        </div>
        <div className="route-card__delta-wrap">
          <span className={`route-card__delta route-card__delta--${deltaTone}`}>
            {deltaPct}
          </span>
          <span className="route-card__delta-label">vs direct</span>
        </div>
      </header>

      <RoutePath route={route} />

      <details className="route-card__details">
        <summary>
          <span>Fee breakdown</span>
          <span className="route-card__details-hint">
            {legCount} {legCount === 1 ? "leg" : "legs"}
          </span>
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
          {index === 0 ? <Currency code={leg.from} /> : null}
          <span className="route-path__hop">
            <span className="route-path__arrow" aria-hidden="true" />
            <span className="route-path__provider">{leg.providerName}</span>
            <span className="route-path__arrow" aria-hidden="true" />
          </span>
          <Currency code={leg.to} />
        </span>
      ))}
    </div>
  );
}

function Currency({ code }: { code: string }) {
  return <span className="route-path__currency">{code}</span>;
}
