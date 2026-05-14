import type { RouteResult } from "../types/routing";
import { formatAmount } from "../utils/format";
import { LegBreakdown } from "./LegBreakdown";

type RouteCardProps = {
  route: RouteResult;
  rank: number;
};

export function RouteCard({ route, rank }: RouteCardProps) {
  const targetCurrency = route.path.at(-1) ?? "";
  const directComparison =
    route.differenceVsDirect === undefined || route.percentageDifferenceVsDirect === undefined
      ? "No direct route available"
      : `${route.differenceVsDirect >= 0 ? "+" : ""}${formatAmount(
          route.differenceVsDirect,
          targetCurrency,
        )} (${route.percentageDifferenceVsDirect >= 0 ? "+" : ""}${route.percentageDifferenceVsDirect.toFixed(
          3,
        )}%) vs best direct`;

  return (
    <article className="route-card">
      <div className="route-card__header">
        <div>
          <p className="eyebrow">Route #{rank}</p>
          <h2>{renderProviderPath(route)}</h2>
        </div>
        <div className="route-card__amount">
          <span>Recipient gets</span>
          <strong>{formatAmount(route.finalAmount, targetCurrency)}</strong>
        </div>
      </div>

      <p className="direct-comparison">{directComparison}</p>

      <ol className="leg-list">
        {route.legs.map((leg, index) => (
          <LegBreakdown key={`${leg.providerName}-${leg.from}-${leg.to}-${index}`} leg={leg} />
        ))}
      </ol>
    </article>
  );
}

function renderProviderPath(route: RouteResult): string {
  return route.legs
    .map((leg, index) => {
      const prefix = index === 0 ? leg.from : "";
      return `${prefix} ->[${leg.providerName}]-> ${leg.to}`;
    })
    .join("");
}
