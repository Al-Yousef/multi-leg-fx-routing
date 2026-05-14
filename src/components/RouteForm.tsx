import { useState, type FormEvent } from "react";
import type { RailFilter } from "../types/routing";
import { normalizeAmount, normalizeCurrency } from "../utils/currency";

export type RouteSearchInput = {
  sourceCurrency: string;
  targetCurrency: string;
  amount: number;
  railFilter: RailFilter;
};

type RouteFormProps = {
  currencies: string[];
  isLoading: boolean;
  onSubmit: (input: RouteSearchInput) => void;
};

export function RouteForm({ currencies, isLoading, onSubmit }: RouteFormProps) {
  const [sourceCurrency, setSourceCurrency] = useState("GBP");
  const [targetCurrency, setTargetCurrency] = useState("JPY");
  const [amount, setAmount] = useState("10000");
  const [railFilter, setRailFilter] = useState<RailFilter>("all");
  const [validationError, setValidationError] = useState<string>();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedSource = normalizeCurrency(sourceCurrency);
    const normalizedTarget = normalizeCurrency(targetCurrency);
    const normalizedAmount = normalizeAmount(amount);

    if (!normalizedSource || !normalizedTarget) {
      setValidationError("Choose both source and target currencies.");
      return;
    }

    if (normalizedSource === normalizedTarget) {
      setValidationError("Source and target currencies must be different.");
      return;
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setValidationError("Enter an amount greater than zero.");
      return;
    }

    setValidationError(undefined);
    onSubmit({
      sourceCurrency: normalizedSource,
      targetCurrency: normalizedTarget,
      amount: normalizedAmount,
      railFilter,
    });
  }

  return (
    <form className="route-form" onSubmit={handleSubmit}>
      <label>
        Source
        <select value={sourceCurrency} onChange={(event) => setSourceCurrency(event.target.value)}>
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>

      <label>
        Target
        <select value={targetCurrency} onChange={(event) => setTargetCurrency(event.target.value)}>
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>

      <label>
        Amount
        <input
          inputMode="decimal"
          min="0"
          step="0.01"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <label>
        Rails
        <select value={railFilter} onChange={(event) => setRailFilter(event.target.value as RailFilter)}>
          <option value="all">All rails</option>
          <option value="fiat">Fiat only</option>
          <option value="stablecoin">Stablecoin venues only</option>
        </select>
      </label>

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Loading quotes..." : "Find routes"}
      </button>

      {validationError ? <p className="form-error">{validationError}</p> : null}
    </form>
  );
}
