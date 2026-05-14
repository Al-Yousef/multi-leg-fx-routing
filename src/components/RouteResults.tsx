import type { ProviderStatus, RouteResult } from "../types/routing";
import { RouteCard } from "./RouteCard";

type RouteResultsProps = {
  routes: RouteResult[];
  statuses: ProviderStatus[];
  isLoading: boolean;
  errorMessage?: string;
};

export function RouteResults({ routes, statuses, isLoading, errorMessage }: RouteResultsProps) {
  return (
    <section className="results-section">
      <div className="status-panel">
        <h2>Provider status</h2>
        <ul>
          {statuses.map((status) => (
            <li key={status.providerName} className={`status-${status.availability}`}>
              <span>{status.providerName}</span>
              <strong>{formatAvailability(status.availability)}</strong>
              {status.lastUpdated ? <small>Rates: {status.lastUpdated}</small> : null}
              {status.errorMessage ? <small>{status.errorMessage}</small> : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="routes-panel">
        <h2>Top routes</h2>
        {isLoading ? <p>Loading provider quotes...</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
        {!isLoading && !errorMessage && routes.length === 0 ? (
          <p>No route found for this currency pair and rail filter.</p>
        ) : null}
        {routes.map((route, index) => (
          <RouteCard
            key={route.legs.map((leg) => `${leg.providerName}-${leg.from}-${leg.to}`).join("|")}
            route={route}
            rank={index + 1}
          />
        ))}
      </div>
    </section>
  );
}

function formatAvailability(availability: ProviderStatus["availability"]): string {
  switch (availability) {
    case "available":
      return "Available";
    case "degraded":
      return "Degraded";
    case "unavailable":
      return "Unavailable";
  }
}
