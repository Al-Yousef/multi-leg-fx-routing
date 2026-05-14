import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { AmountScaleInsight, type AmountScaleScenario } from "./components/AmountScaleInsight";
import { RouteForm, type RouteSearchInput } from "./components/RouteForm";
import { RouteResults } from "./components/RouteResults";
import { findTopRoutes } from "./routing/routeEngine";
import { getSupportedCurrencies, loadQuoteEdges } from "./services/rateService";
import type { QuoteEdgeLoadResult } from "./services/providers/providerUtils";

const initialSearch: RouteSearchInput = {
  sourceCurrency: "GBP",
  targetCurrency: "JPY",
  amount: 10000,
  railFilter: "all",
};

function App() {
  const [searchInput, setSearchInput] = useState<RouteSearchInput>(initialSearch);
  const [quoteResult, setQuoteResult] = useState<QuoteEdgeLoadResult>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const currencies = getSupportedCurrencies();
  const routes = useMemo(() => {
    if (!quoteResult) {
      return [];
    }

    return findTopRoutes(
      quoteResult.edges,
      searchInput.sourceCurrency,
      searchInput.targetCurrency,
      searchInput.amount,
    );
  }, [quoteResult, searchInput.amount, searchInput.sourceCurrency, searchInput.targetCurrency]);
  const scaleScenarios = useMemo<AmountScaleScenario[]>(() => {
    if (!quoteResult) {
      return [];
    }

    const scenarioAmounts = [...new Set([searchInput.amount / 10, searchInput.amount, searchInput.amount * 10])]
      .filter((amount) => Number.isFinite(amount) && amount > 0);

    return scenarioAmounts.map((amount) => ({
      amount,
      route: findTopRoutes(
        quoteResult.edges,
        searchInput.sourceCurrency,
        searchInput.targetCurrency,
        amount,
      )[0],
    }));
  }, [quoteResult, searchInput.amount, searchInput.sourceCurrency, searchInput.targetCurrency]);

  useEffect(() => {
    let isCurrentRequest = true;

    loadQuoteEdges(searchInput.railFilter)
      .then((result) => {
        if (!isCurrentRequest) {
          return;
        }

        setQuoteResult(result);
      })
      .catch((error: unknown) => {
        if (!isCurrentRequest) {
          return;
        }

        setQuoteResult(undefined);
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
  }, [searchInput.railFilter]);

  function handleSearchSubmit(input: RouteSearchInput) {
    setErrorMessage(undefined);
    if (input.railFilter !== searchInput.railFilter) {
      setQuoteResult(undefined);
      setIsLoading(true);
    }
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

      <AmountScaleInsight
        scenarios={scaleScenarios}
        sourceCurrency={searchInput.sourceCurrency}
        targetCurrency={searchInput.targetCurrency}
      />

      <RouteResults
        routes={routes}
        statuses={quoteResult?.statuses ?? []}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </main>
  );
}

export default App;
