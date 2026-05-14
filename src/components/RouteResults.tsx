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
            <li key={status.providerName} className={status.available ? "status-ok" : "status-error"}>
              <span>{status.providerName}</span>
              <strong>{status.available ? "Available" : "Unavailable"}</strong>
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
          <RouteCard key={route.legs.map((leg) => `${leg.providerName}-${leg.from}-${leg.to}`).join("|")} route={route} rank={index + 1} />
        ))}
      </div>
    </section>
  );
}
