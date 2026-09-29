import { currencySymbol } from "../engine/currencies";

function groupInteger(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatAmount(amount: number, precision: number): string {
  if (!Number.isFinite(amount)) return "—";
  const fixed = amount.toFixed(precision);
  const [int, frac] = fixed.split(".");
  const sign = fixed.startsWith("-") ? "-" : "";
  const digits = sign ? int.slice(1) : int;
  return frac === undefined
    ? `${sign}${groupInteger(digits)}`
    : `${sign}${groupInteger(digits)}.${frac}`;
}

export function formatMoney(amount: number, currency: string, precision: number): string {
  const symbol = currencySymbol(currency);
  const text = formatAmount(amount, precision);
  if (!symbol) return `${text} ${currency}`;
  return /[A-Za-z]/.test(symbol) ? `${text} ${symbol}` : `${symbol}${text}`;
}

export function formatNumber(amount: number, precision: number): string {
  return formatAmount(amount, precision);
}

export function formatRate(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return "—";
  if (rate >= 1000) return groupInteger(String(Math.round(rate * 100) / 100));
  if (rate >= 1) return String(Math.round(rate * 10000) / 10000);
  return String(Number(rate.toPrecision(4)));
}
