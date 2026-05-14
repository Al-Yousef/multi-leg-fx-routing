import { useEffect, useState } from "react";
import "./App.css";
import { RouteForm, type RouteSearchInput } from "./components/RouteForm";
import { RouteResults } from "./components/RouteResults";
import { findTopRoutes } from "./routing/routeEngine";
import { getSupportedCurrencies, loadQuoteEdges } from "./services/rateService";
import type { ProviderStatus, RouteResult } from "./types/routing";

const initialSearch: RouteSearchInput = {
  sourceCurrency: "GBP",
  targetCurrency: "JPY",
  amount: 10000,
  railFilter: "all",
};

function App() {
  const [searchInput, setSearchInput] = useState<RouteSearchInput>(initialSearch);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const currencies = getSupportedCurrencies();

  useEffect(() => {
    let isCurrentRequest = true;

    loadQuoteEdges(searchInput.railFilter)
      .then((result) => {
        if (!isCurrentRequest) {
          return;
        }

        setStatuses(result.statuses);
        setRoutes(
          findTopRoutes(
            result.edges,
            searchInput.sourceCurrency,
            searchInput.targetCurrency,
            searchInput.amount,
          ),
        );
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest) {
          return;
        }

        setRoutes([]);
        setStatuses([]);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load provider quotes.");
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [searchInput]);

  function handleSearchSubmit(input: RouteSearchInput) {
    setIsLoading(true);
    setErrorMessage(undefined);
    setSearchInput(input);
  }

  return (
    <main className="app-shell">
      <section className="hero-section">
        <p className="eyebrow">Multi-leg FX routing</p>
        <h1>Find the cheapest provider path in up to three legs.</h1>
        <p>
          Live fiat quotes are normalized beside static stablecoin venues, then ranked by final recipient amount.
        </p>
      </section>

      <RouteForm currencies={currencies} isLoading={isLoading} onSubmit={handleSearchSubmit} />

      <RouteResults
        routes={routes}
        statuses={statuses}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </main>
  );
}

export default App;
