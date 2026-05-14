import type { RouteLeg } from "../types/routing";
import { formatAmount, formatFeePercent, formatRate } from "../utils/format";

type LegBreakdownProps = {
  leg: RouteLeg;
  step: number;
};

export function LegBreakdown({ leg, step }: LegBreakdownProps) {
  const effectiveFeePct = leg.inputAmount > 0 ? leg.feeAmount / leg.inputAmount : 0;
  const feeTooltip = `${formatFeePercent(leg.feePercent)} + ${formatAmount(leg.feeFlat, leg.from)} model`;

  return (
    <li className="leg-row">
      <span className="leg-row__step mono">{String(step).padStart(2, "0")}</span>

      <span className="leg-row__flow">
        <span className="leg-row__side">
          <span className="leg-row__amount">{formatAmount(leg.inputAmount, leg.from)}</span>
        </span>
        <span className="leg-row__via">
          <span className="leg-row__arrow" aria-hidden="true" />
          <span className="leg-row__provider">{leg.providerName}</span>
          <span className="leg-row__arrow" aria-hidden="true" />
        </span>
        <span className="leg-row__side">
          <span className="leg-row__amount leg-row__amount--out">
            {formatAmount(leg.outputAmount, leg.to)}
          </span>
        </span>
      </span>

      <span className="leg-row__stats">
        <span className="leg-row__stat">
          <span>rate</span>
          <strong>{formatRate(leg.rate)}</strong>
        </span>
        <span className="leg-row__stat" title={feeTooltip}>
          <span>fee</span>
          <strong>{formatFeePercent(effectiveFeePct)}</strong>
        </span>
      </span>
    </li>
  );
}
