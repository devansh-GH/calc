import { useMemo } from "react";
import { calculate } from "../engine";
import type { CalculationReport, RateSnapshot } from "../types";

export function useCalculator(
  expression: string,
  snapshot: RateSnapshot | null,
  preferredOutputCurrency: string | null,
): CalculationReport {
  return useMemo(
    () =>
      calculate(expression, {
        rates: snapshot?.rates ?? null,
        ratesDate: snapshot?.date ?? null,
        ratesSource: snapshot?.source ?? "none",
        preferredOutputCurrency,
      }),
    [expression, snapshot, preferredOutputCurrency],
  );
}
