# Multi-Leg FX Routing

Internal routing tool for comparing FX and stablecoin liquidity providers. Enter a source currency, target currency, and amount to see the top 3 routes ranked by final recipient amount, with up to 3 legs per route.

## Links

- GitHub repo: https://github.com/Al-Yousef/multi-leg-fx-routing
- Deployed app: https://multi-leg-fx-routing.vercel.app

## Features

- Top 3 routes by amount delivered after provider fees.
- Up to 3 legs per route, with different providers allowed on each leg.
- Per-leg input, rate, configured fee model, computed fee, net amount, and output.
- Difference versus the best available one-leg route after fees.
- Live fiat rates from Frankfurter, ExchangeRate-API, and fawazahmed0 currency-api.
- Static stablecoin venue rates from `src/data/providers.json`.
- Rail filtering for all rails, fiat only, or stablecoin venues only.
- Provider status display with available, degraded, and unavailable states.
- Amount sensitivity view to show how route choice changes for smaller and larger transfers.

## Run Locally

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run test:run
npm run lint
npm run build
npm run preview
```

## Routing Model

The app normalizes every provider quote into a directed `QuoteEdge` with `from`, `to`, `rate`, `feePercent`, and `feeFlat`. For each search, it runs a bounded depth-first search from source to target with a maximum of 3 legs and rejects currency cycles like `GBP -> USD -> GBP`. Each leg applies the assignment fee formula in the leg source currency before applying the quoted rate, so flat fees can change the winner as the transfer amount changes. Completed routes are sorted by final recipient amount, then by leg count and provider path for deterministic tie-breaking. The direct comparison is the best available one-leg route after fees, not the raw market rate.

## Provider Handling

Live providers are isolated so one unavailable API does not prevent the app from returning routes from other providers. Fetches use timeouts plus a small retry for transient network, timeout, `429`, and `5xx` failures. Malformed responses and missing pairs are treated as provider-level failures for that base currency, and providers with some usable quotes plus some failures are shown as degraded. Quote graphs are cached by rail filter during the browser session so changing only the amount recomputes routes without refetching every API.

## Project Structure

- `src/data/` stores the provider configuration from the assignment.
- `src/types/` defines shared provider and routing models.
- `src/services/` normalizes live and static provider rates into one edge format.
- `src/routing/` contains fee calculation and route optimization logic.
- `src/components/` contains the search form, provider status, route cards, and amount sensitivity UI.
- `src/utils/` contains formatting and currency helpers.

## AI Tools Used

I used Cursor with GPT-5.5 to review the codebase, identify submission gaps, plan the finish work, implement targeted changes, and generate focused tests. I also used Cursor's code search/read tools to inspect the routing engine, provider adapters, and UI before editing, and Vercel deployment guidance for the final static deployment path.

One thing the AI initially got wrong: the first plan put too much attention on optional UI stretch goals. A review pass caught that the real blockers were submission completeness, test coverage, amount-only refetching, and provider resilience, so the plan was adjusted before implementation.

## With More Time

I would move live provider fetching behind a small serverless proxy. That would allow shared caching, better rate-limit handling, provider latency metrics, and fewer browser CORS assumptions while keeping the client routing engine simple.
