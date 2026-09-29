/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test";
import { calculate } from "../index";

const RATES = { INR: 95.88, EUR: 0.86, GBP: 0.74, JPY: 150 };
const OPTS = { rates: RATES, ratesDate: "2026-09-18", ratesSource: "cache" as const };

function value(expr: string, opts = OPTS) {
  const report = calculate(expr, opts);
  if (report.error) throw new Error(`Unexpected error for "${expr}": ${report.error}`);
  return report.result!.value;
}

describe("plain arithmetic", () => {
  test("100 + 50 * 2 = 200 (precedence)", () => {
    expect(value("100 + 50 * 2")).toEqual({ kind: "number", amount: 200 });
  });
  test("(100 + 50) / 2 = 75", () => {
    expect(value("(100 + 50) / 2")).toEqual({ kind: "number", amount: 75 });
  });
  test("works without any rates (offline)", () => {
    const report = calculate("100 + 50 * 2", { rates: null, ratesDate: null, ratesSource: "none" });
    expect(report.error).toBeNull();
    expect(report.result!.value).toEqual({ kind: "number", amount: 200 });
  });
});

describe("money scaling", () => {
  test("100 USD / 2 = 50 USD", () => {
    expect(value("100 USD / 2")).toEqual({ kind: "money", amount: 50, currency: "USD" });
  });
  test("20 EUR * 3 = 60 EUR", () => {
    expect(value("20 EUR * 3")).toEqual({ kind: "money", amount: 60, currency: "EUR" });
  });
  test("$100 / 4 = 25 USD", () => {
    expect(value("$100 / 4")).toEqual({ kind: "money", amount: 25, currency: "USD" });
  });
});

describe("mixed currencies", () => {
  test("100 USD + ₹500 is valid money", () => {
    const report = calculate("100 USD + ₹500", OPTS);
    expect(report.error).toBeNull();
    expect(report.result!.value.kind).toBe("money");
    expect(report.detectedCurrencies.sort()).toEqual(["INR", "USD"]);
  });
  test("100 USD + ₹500 + €20 is valid", () => {
    const report = calculate("100 USD + ₹500 + €20", OPTS);
    expect(report.error).toBeNull();
    expect(report.detectedCurrencies.sort()).toEqual(["EUR", "INR", "USD"]);
  });
  test("(100 USD + ₹500) / 2 is valid", () => {
    const v = value("(100 USD + ₹500) / 2");
    expect(v.kind).toBe("money");
    if (v.kind === "money") {
      const expected = (100 + 500 / RATES.INR) / 2;
      expect(v.amount).toBeCloseTo(expected, 6);
      expect(v.currency).toBe("USD");
    }
  });
  test("(100 USD + ₹500) * 3 is valid", () => {
    expect(value("(100 USD + ₹500) * 3").kind).toBe("money");
  });
  test("(100 USD + ₹500 + €20) / 4 is valid", () => {
    expect(value("(100 USD + ₹500 + €20) / 4").kind).toBe("money");
  });
  test("((100 USD + ₹500) / 2) + €20 is valid", () => {
    expect(value("((100 USD + ₹500) / 2) + €20").kind).toBe("money");
  });
  test('output currency override via "in"', () => {
    const report = calculate("50 EUR in INR", OPTS);
    expect(report.error).toBeNull();
    expect(report.displayCurrency).toBe("INR");
    const v = report.result!.value;
    if (v.kind === "money") {
      expect(v.currency).toBe("INR");
      expect(v.amount).toBeCloseTo((50 / RATES.EUR) * RATES.INR, 4);
    } else throw new Error("expected money");
  });
});

describe("invalid money operations", () => {
  test("100 USD * 20 EUR is rejected with a clear reason", () => {
    const report = calculate("100 USD * 20 EUR", OPTS);
    expect(report.error).toContain("monetary");
  });
  test("100 USD / 20 EUR is rejected", () => {
    const report = calculate("100 USD / 20 EUR", OPTS);
    expect(report.error).toContain("monetary");
  });
  test("plain number + money is rejected, not silently converted", () => {
    const report = calculate("100 + 50 USD", OPTS);
    expect(report.error).toContain("plain number");
  });
});

describe("malformed input", () => {
  test("double unary plus does not crash", () => {
    const report = calculate("100 USD ++ ₹500", OPTS);
    expect(report.error).toBeNull();
  });
  test("operator after operator gives a useful error", () => {
    const report = calculate("100 USD + × 20", OPTS);
    expect(report.error).toMatch(/expected/i);
  });
  test("trailing operator is incomplete, not a crash", () => {
    const report = calculate("100 USD /", OPTS);
    expect(report.error).toMatch(/incomplete/i);
  });
  test("unbalanced parenthesis is a useful error", () => {
    const report = calculate("(100 USD + ₹500", OPTS);
    expect(report.error).toMatch(/parenthesis/i);
  });
  test("unknown currency code is reported", () => {
    const report = calculate("100 XYZ + 5", OPTS);
    expect(report.error).toMatch(/unknown currency/i);
  });
  test("unexpected characters are rejected", () => {
    const report = calculate("100 USD # 5", OPTS);
    expect(report.error).toMatch(/unexpected character/i);
  });
});

describe("percentages", () => {
  test("100 USD * 10% = 10 USD", () => {
    expect(value("100 USD * 10%")).toEqual({ kind: "money", amount: 10, currency: "USD" });
  });
  test("100 USD + 10% = 110 USD", () => {
    expect(value("100 USD + 10%")).toEqual({ kind: "money", amount: 110, currency: "USD" });
  });
  test("200 + 10% = 220", () => {
    expect(value("200 + 10%")).toEqual({ kind: "number", amount: 220 });
  });
});

describe("rates availability", () => {
  test("missing rate produces a useful error naming the currency", () => {
    const report = calculate("10 GBP + 5 USD", {
      rates: { INR: 95.88 },
      ratesDate: "2026-09-18",
      ratesSource: "cache",
    });
    expect(report.error).toMatch(/GBP/);
  });
  test("currency expression without any rates explains offline state", () => {
    const report = calculate("100 USD + ₹500", {
      rates: null,
      ratesDate: null,
      ratesSource: "none",
    });
    expect(report.error).toMatch(/offline/i);
  });
});
