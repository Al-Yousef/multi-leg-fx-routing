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
- Manual quote refresh with a short cache TTL for live-rate freshness.
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

Live providers are isolated so one unavailable API does not prevent the app from returning routes from other providers. Fetches use timeouts plus a small retry for transient network, timeout, `429`, and `5xx` failures. Malformed responses and missing pairs are treated as provider-level failures for that base currency, and providers with some usable quotes plus some failures are shown as degraded. Quote graphs are cached by rail filter for 5 minutes so changing only the amount recomputes routes without refetching every API, and the UI exposes a manual refresh for the current rail filter.

## Project Structure

- `src/data/` stores the provider configuration from the assignment.
- `src/types/` defines shared provider and routing models.
- `src/services/` normalizes live and static provider rates into one edge format.
- `src/routing/` contains fee calculation and route optimization logic.
- `src/components/` contains the search form, provider status, route cards, and amount sensitivity UI.
- `src/utils/` contains formatting and currency helpers.

## AI Tools Used

I used Cursor with GPT-5.5 to review the codebase, identify submission gaps, plan the finish work, implement targeted changes, and generate focused tests. I also used Cursor's code search/read tools to inspect the routing engine, provider adapters, and UI before editing, and Vercel deployment guidance for the final static deployment path. I used Cursor's Claude Opus 4.7 for the designs, UI and UX.

One thing the AI initially got wrong: the first plan put too much attention on optional UI stretch goals. A review pass caught that the real blockers were submission completeness, test coverage, amount-only refetching, and provider resilience, so the plan was adjusted before implementation.

Other issues I noticed and corrected quickly (not exhaustive, just what I remember):
- A final provider-doc check caught that AlphaFX was using Frankfurter's older `from` query parameter. The adapter now uses the current `base` parameter and has a URL assertion in the tests.
- The per-leg breakdown originally made the computed fee and net amount less visible than the README promised. I updated the route details to show the fee amount, configured fee model, and net source amount directly.
- When 3D bundle was being created, it was too heavy up front, so I asked the AI to lazy-load the `three.js` scene and kept an SVG fallback.
- The first caching pass could stay stale. This is not a major issue for this demo, but I still added it out of being thorough, so quote graphs now reuse amount-only searches but expire after 5 minutes with manual refresh.
- Provider failures needed isolation; one failed API should degrade that provider, not nuke the whole quote graph. Cursor with GPT-5.5 caught this while I was asking questions about its implementation.
- Tests covered routing/services better than product states, so I added UI coverage for loading, errors, no-route states, and form validation.
- The 3D hero is intentionally illustrative and can highlight the selected pair; the route results remain the source of truth.

## With More Time

I would move live provider fetching behind a small serverless proxy. That would allow shared caching, better rate-limit handling, provider latency metrics, and fewer browser CORS assumptions while keeping the client routing engine simple.

I would also add historical route intelligence, like showing that USD to CAD improved by 1.2% this week or that certain routes tend to be better at specific times. That would make the tool more user-motivating instead of only showing a point-in-time quote.

I would add E2E tests for the full user flow, from selecting currencies through seeing ranked routes, provider status, loading states, and no-route states.

With more research, I would add realistic liquidity assumptions: min/max trade sizes, slippage curves, settlement speed, and provider reliability scores. Those would make the route ranking closer to how a real desk would evaluate execution quality.
