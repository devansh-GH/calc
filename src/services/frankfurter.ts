import type { CurrencyMeta } from "../types";

const BASE_URL = "https://api.frankfurter.dev/v2";
const TIMEOUT_MS = 12000;

export class FrankfurterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrankfurterError";
  }
}

async function fetchJson(path: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
    if (!response.ok) {
      throw new FrankfurterError(`Exchange-rate service responded with ${response.status}.`);
    }
    return (await response.json()) as unknown;
  } catch (err) {
    if (err instanceof FrankfurterError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new FrankfurterError("Exchange-rate request timed out.");
    }
    throw new FrankfurterError("No internet connection.");
  } finally {
    clearTimeout(timer);
  }
}

export interface RateTable {
  date: string;
  base: string;
  rates: Record<string, number>;
}

interface RateRow {
  date: string;
  base: string;
  quote: string;
  rate: number;
}

function isRateRow(value: unknown): value is RateRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.date === "string" &&
    typeof row.base === "string" &&
    typeof row.quote === "string" &&
    typeof row.rate === "number" &&
    Number.isFinite(row.rate) &&
    row.rate > 0
  );
}

export async function fetchRates(base = "USD", quotes?: string[]): Promise<RateTable> {
  const params = new URLSearchParams({ base });
  if (quotes && quotes.length > 0) params.set("quotes", quotes.join(","));
  const data = await fetchJson(`/rates?${params.toString()}`);

  if (Array.isArray(data)) {
    const rows = data.filter(isRateRow);
    if (rows.length === 0) throw new FrankfurterError("Exchange-rate service returned no rates.");
    const rates: Record<string, number> = {};
    for (const row of rows) rates[row.quote.toUpperCase()] = row.rate;
    return { date: rows[0].date, base: rows[0].base.toUpperCase(), rates };
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as { date?: unknown; base?: unknown; rates?: unknown };
    if (
      typeof obj.date === "string" &&
      typeof obj.base === "string" &&
      typeof obj.rates === "object" &&
      obj.rates !== null
    ) {
      const rates: Record<string, number> = {};
      for (const [code, rate] of Object.entries(obj.rates as Record<string, unknown>)) {
        if (typeof rate === "number" && Number.isFinite(rate) && rate > 0)
          rates[code.toUpperCase()] = rate;
      }
      if (Object.keys(rates).length === 0)
        throw new FrankfurterError("Exchange-rate service returned no rates.");
      return { date: obj.date, base: obj.base.toUpperCase(), rates };
    }
  }
  throw new FrankfurterError("Exchange-rate service returned an unexpected response.");
}

interface CurrencyRow {
  iso_code?: unknown;
  name?: unknown;
  symbol?: unknown;
}

export async function fetchCurrencies(): Promise<CurrencyMeta[]> {
  const data = await fetchJson("/currencies");
  if (!Array.isArray(data))
    throw new FrankfurterError("Currency directory returned an unexpected response.");
  const list: CurrencyMeta[] = [];
  for (const row of data as CurrencyRow[]) {
    if (typeof row.iso_code === "string" && typeof row.name === "string") {
      list.push({
        code: row.iso_code.toUpperCase(),
        name: row.name,
        symbol: typeof row.symbol === "string" ? row.symbol : "",
      });
    }
  }
  if (list.length === 0) throw new FrankfurterError("Currency directory returned no currencies.");
  return list.sort((a, b) => a.code.localeCompare(b.code));
}
