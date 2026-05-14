import type { RouteLeg } from "../types/routing";
import { formatAmount, formatFeePercent, formatRate } from "../utils/format";

type LegBreakdownProps = {
  leg: RouteLeg;
};

export function LegBreakdown({ leg }: LegBreakdownProps) {
  return (
    <li className="leg-breakdown">
      <div>
        <strong>
          {leg.from}
          {" -> "}
          {leg.to}
        </strong>
        <span>{leg.providerName}</span>
      </div>
      <dl>
        <div>
          <dt>Input</dt>
          <dd>{formatAmount(leg.inputAmount, leg.from)}</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{formatRate(leg.rate)}</dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd>
            {formatAmount(leg.feeAmount, leg.from)} ({formatFeePercent(leg.feeAmount / leg.inputAmount)})
          </dd>
        </div>
        <div>
          <dt>Output</dt>
          <dd>{formatAmount(leg.outputAmount, leg.to)}</dd>
        </div>
      </dl>
    </li>
  );
}
