import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { AmountScaleInsight, type AmountScaleScenario } from "./components/AmountScaleInsight";
import { RouteForm, type RouteSearchInput } from "./components/RouteForm";
import { RouteResults } from "./components/RouteResults";
import { RoutingNetwork3D } from "./components/RoutingNetwork3D";
import { findTopRoutes } from "./routing/routeEngine";
import { getSupportedCurrencies, loadQuoteEdges } from "./services/rateService";
import type { QuoteEdgeLoadResult } from "./services/providers/providerUtils";
import { formatAmount } from "./utils/format";

const initialSearch: RouteSearchInput = {
  sourceCurrency: "GBP",
  targetCurrency: "JPY",
  amount: 10000,
  railFilter: "all",
};

const NAV_LINKS = [
  { href: "#dashboard", label: "Dashboard" },
  { href: "#routing-model", label: "Routing" },
  { href: "#sensitivity", label: "Notional" },
  { href: "#provider-trust", label: "Counterparties" },
];

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

  const statuses = quoteResult?.statuses ?? [];
  const providersAvailable = statuses.filter((s) => s.availability === "available").length;
  const providersDegraded = statuses.filter((s) => s.availability === "degraded").length;
  const providersUnavailable = statuses.filter((s) => s.availability === "unavailable").length;
  const providersTotal = statuses.length;
  const bestRoute = routes[0];
  const maxLegs = routes.reduce((max, r) => Math.max(max, r.legs.length), 0);
  const railLabel =
    searchInput.railFilter === "all"
      ? "Fiat + Stablecoin"
      : searchInput.railFilter === "fiat"
        ? "Fiat only"
        : "Stablecoin only";
  const bestDeltaPct = bestRoute?.percentageDifferenceVsDirect;
  const activePath = bestRoute?.path ?? [searchInput.sourceCurrency, searchInput.targetCurrency];
  const networkEdges = useMemo(
    () =>
      (quoteResult?.edges ?? []).map((edge) => ({
        from: edge.from,
        to: edge.to,
      })),
    [quoteResult],
  );

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
    <div className="page">
      <header className="top-nav">
        <div className="top-nav__inner">
          <a className="brand" href="#top">
            <span className="brand__mark" aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="brand__text">
              <strong>SDM</strong>
              <small>Route Intelligence</small>
            </span>
          </a>
          <nav className="top-nav__links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <a className="top-nav__cta" href="#dashboard">
            Open desk
          </a>
        </div>
      </header>

      <main id="top" className="page__main">
        <section className="hero">
          <div className="hero__copy">
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              SDM Route Intelligence
            </span>
            <h1>
              Liquidity routing,
              <br />
              <span className="text-gold">built for desks.</span>
            </h1>
            <p className="hero__lede">
              Multi-leg execution across fiat brokers and stablecoin venues. Up to three legs per route,
              ranked by what the recipient actually receives after every fee and spread.
            </p>
            <div className="hero__ctas">
              <a className="btn btn--primary" href="#dashboard">
                Run a transfer
              </a>
              <a className="btn btn--ghost" href="#routing-model">
                How the engine routes
              </a>
            </div>
            <dl className="hero__stats">
              <div>
                <dt>Pair</dt>
                <dd className="mono">
                  {searchInput.sourceCurrency}
                  <span className="hero__stats-arrow">/</span>
                  {searchInput.targetCurrency}
                </dd>
              </div>
              <div>
                <dt>Notional</dt>
                <dd>{formatAmount(searchInput.amount, searchInput.sourceCurrency)}</dd>
              </div>
              <div>
                <dt>Delivered</dt>
                <dd className="text-gold-soft">
                  {bestRoute
                    ? formatAmount(bestRoute.finalAmount, searchInput.targetCurrency)
                    : isLoading
                      ? "..."
                      : "--"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="hero__visual">
            <RoutingNetwork3D
              currencies={currencies}
              edges={networkEdges}
              activePath={activePath}
            />
            <div className="hero__visual-tag">
              <span className={`dot ${isLoading ? "dot--pulse" : "dot--ok"}`} aria-hidden="true" />
              <span className="hero__visual-tag-label">
                {isLoading
                  ? "Loading quote graph"
                  : bestRoute
                    ? `Live path | ${bestRoute.legs.length} ${bestRoute.legs.length === 1 ? "leg" : "legs"}`
                    : "No route"}
              </span>
            </div>
          </div>
        </section>

        <section className="liquidity-strip" aria-label="Liquidity intelligence">
          <Metric
            label="Counterparties"
            value={providersTotal ? String(providersTotal) : "--"}
            sub={
              providersTotal
                ? `${providersAvailable} live / ${providersDegraded} degraded`
                : "Loading"
            }
          />
          <Metric label="Rails" value={railLabel} sub="Switch in form" />
          <Metric label="Route depth" value={maxLegs ? `${maxLegs} legs` : "--"} sub="Hard cap of 3" />
          <Metric
            label="vs best direct"
            value={
              bestDeltaPct === undefined
                ? "--"
                : `${bestDeltaPct >= 0 ? "+" : ""}${bestDeltaPct.toFixed(2)}%`
            }
            sub="After fees"
            tone={
              bestDeltaPct === undefined
                ? undefined
                : bestDeltaPct >= 0
                  ? "positive"
                  : "negative"
            }
          />
          <Metric
            label="Routes ranked"
            value={routes.length ? String(routes.length) : "--"}
            sub="Top 3 shown"
          />
        </section>

        <section id="dashboard" className="section">
          <SectionHeader
            eyebrow="Execution"
            title="Configure a transfer. See where the value goes."
            blurb="Pick a source, target, and notional. The engine searches every eligible path across the selected rails, applies per-leg fees and rates, and ranks the top three by delivered amount."
          />

          <RouteForm currencies={currencies} isLoading={isLoading} onSubmit={handleSearchSubmit} />

          <RouteResults
            routes={routes}
            statuses={statuses}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </section>

        <section id="routing-model" className="section">
          <SectionHeader
            eyebrow="Routing model"
            title="A quote graph, not a rate table."
            blurb="Every provider quote becomes a directed edge. A bounded search explores up to three hops, rejects currency cycles, and applies fees in the leg source currency before the quoted rate."
          />
          <div className="cards-3">
            <FeatureCard
              step="01"
              title="Normalize quotes"
              body="Live fiat APIs and static stablecoin venues unify into a single QuoteEdge with rate, fee percent, and fee flat in source currency."
            />
            <FeatureCard
              step="02"
              title="Search paths"
              body="Bounded depth-first search finds every source-to-target path within three legs and rejects cycles like GBP to USD to GBP."
            />
            <FeatureCard
              step="03"
              title="Rank by delivered"
              body="Each leg applies fees in its source currency, then the rate on the net. Routes are sorted by delivered amount with deterministic tie-breaking."
            />
          </div>
        </section>

        <section id="sensitivity" className="section">
          <SectionHeader
            eyebrow="Notional sensitivity"
            title="The cheapest route depends on size."
            blurb="Flat fees dominate small tickets. Spreads dominate large ones. The same pair can prefer different counterparties as the notional scales."
          />
          <AmountScaleInsight
            scenarios={scaleScenarios}
            sourceCurrency={searchInput.sourceCurrency}
            targetCurrency={searchInput.targetCurrency}
          />
        </section>

        <section id="provider-trust" className="section">
          <SectionHeader
            eyebrow="Counterparty health"
            title="Transparency first. No silent failures."
            blurb="Each counterparty is fetched in isolation with timeouts and small retries for transient errors. Partial results surface as degraded rather than hidden, so the desk always knows what it's pricing against."
          />
          <div className="cards-3">
            <TrustCard
              tone="ok"
              label="Available"
              count={providersAvailable}
              body="All requested base currencies returned usable quotes within the timeout window."
            />
            <TrustCard
              tone="warn"
              label="Degraded"
              count={providersDegraded}
              body="Some quotes loaded, others failed. The engine still uses the usable subset for routing."
            />
            <TrustCard
              tone="bad"
              label="Unavailable"
              count={providersUnavailable}
              body="Counterparty could not be reached. Its edges are excluded so other rails can still deliver routes."
            />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <strong>SDM Route Intelligence</strong>
            <p>
              A routing intelligence demo inspired by Secure Digital Markets' institutional liquidity workflows.
              Not a live execution venue. Not investment advice.
            </p>
          </div>
          <div className="footer__meta">
            <a href="https://github.com/Al-Yousef/multi-leg-fx-routing" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://multi-leg-fx-routing.vercel.app" target="_blank" rel="noreferrer">
              Live demo
            </a>
            <span className="footer__build">React + Vite + three.js</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className={`metric${tone ? ` metric--${tone}` : ""}`}>
      <span className="metric__label">{label}</span>
      <strong className="metric__value">{value}</strong>
      {sub ? <small className="metric__sub">{sub}</small> : null}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  blurb,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
}) {
  return (
    <header className="section__header">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{blurb}</p>
    </header>
  );
}

function FeatureCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <article className="feature-card">
      <span className="feature-card__step mono">{step}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function TrustCard({
  tone,
  label,
  count,
  body,
}: {
  tone: "ok" | "warn" | "bad";
  label: string;
  count: number;
  body: string;
}) {
  return (
    <article className={`trust-card trust-card--${tone}`}>
      <header>
        <span className={`dot dot--${tone}`} aria-hidden="true" />
        <span className="trust-card__label">{label}</span>
        <strong className="trust-card__count">{count}</strong>
      </header>
      <p>{body}</p>
    </article>
  );
}

export default App;
