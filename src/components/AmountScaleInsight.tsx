import type { RouteResult } from "../types/routing";
import { formatAmount } from "../utils/format";

export type AmountScaleScenario = {
  amount: number;
  route?: RouteResult;
};

type AmountScaleInsightProps = {
  scenarios: AmountScaleScenario[];
  sourceCurrency: string;
  targetCurrency: string;
};

export function AmountScaleInsight({
  scenarios,
  sourceCurrency,
  targetCurrency,
}: AmountScaleInsightProps) {
  if (scenarios.length === 0) {
    return null;
  }

  return (
    <section className="scale-panel">
      <div>
        <p className="eyebrow">Amount sensitivity</p>
        <h2>How the best route changes by size</h2>
      </div>
      <div className="scale-grid">
        {scenarios.map((scenario) => (
          <article key={scenario.amount}>
            <span>{formatAmount(scenario.amount, sourceCurrency)}</span>
            {scenario.route ? (
              <>
                <strong>{formatAmount(scenario.route.finalAmount, targetCurrency)}</strong>
                <small>{renderProviderPath(scenario.route)}</small>
              </>
            ) : (
              <>
                <strong>No route</strong>
                <small>No provider path was available for this amount.</small>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
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
