import type { RouteLeg } from "../types/routing";
import { formatAmount, formatFeePercent, formatRate } from "../utils/format";

type LegBreakdownProps = {
  leg: RouteLeg;
  step: number;
};

export function LegBreakdown({ leg, step }: LegBreakdownProps) {
  const effectiveFeePct = leg.inputAmount > 0 ? leg.feeAmount / leg.inputAmount : 0;

  return (
    <li className="leg-breakdown">
      <div className="leg-breakdown__row">
        <span className="leg-breakdown__step mono">{String(step).padStart(2, "0")}</span>
        <span className="leg-breakdown__pair">
          <strong>{leg.from}</strong>
          <span className="leg-breakdown__arrow" aria-hidden="true">→</span>
          <strong>{leg.to}</strong>
        </span>
        <span className="leg-breakdown__provider">{leg.providerName}</span>
        <span className="leg-breakdown__output">
          {formatAmount(leg.outputAmount, leg.to)}
        </span>
      </div>

      <dl className="leg-breakdown__numbers">
        <div>
          <dt>In</dt>
          <dd>{formatAmount(leg.inputAmount, leg.from)}</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{formatRate(leg.rate)}</dd>
        </div>
        <div>
          <dt>Fee</dt>
          <dd>
            {formatAmount(leg.feeAmount, leg.from)}
            <small> ({formatFeePercent(effectiveFeePct)})</small>
          </dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>
            {formatFeePercent(leg.feePercent)} + {formatAmount(leg.feeFlat, leg.from)}
          </dd>
        </div>
      </dl>
    </li>
  );
}
