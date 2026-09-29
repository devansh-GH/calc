import { formatMoney, formatNumber } from "./formatting";
import type { CalculationReport } from "../types";

export function mainResultText(report: CalculationReport, precision: number): string | null {
  if (report.error || !report.result) return null;
  const value = report.result.value;
  if (value.kind === "money") return formatMoney(value.amount, value.currency!, precision);
  return formatNumber(value.amount, precision);
}
