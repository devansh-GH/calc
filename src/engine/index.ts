import { computeMetrics, detectCurrencies } from "./metrics";
import { evaluate, EvalFailure, convertMoney, prettyMoney, rateBetween } from "./evaluator";
import { parse } from "./parser";
import { validate } from "./validator";
import type {
  CalculationReport,
  ExpressionMetrics,
  RateSnapshot,
  TypedValue,
  ValidationResult,
} from "../types";

export interface CalculateOptions {
  rates: Record<string, number> | null;
  ratesDate: string | null;
  ratesSource: RateSnapshot["source"];
  preferredOutputCurrency?: string | null;
}

const EMPTY_METRICS: ExpressionMetrics = {
  tokens: 0,
  numbers: 0,
  currencies: 0,
  operators: 0,
  parenthesisGroups: 0,
  astDepth: 0,
  arithmeticOperations: 0,
  currencyConversions: 0,
};

function emptyValidation(): ValidationResult {
  return { valid: false, checks: [], errors: [] };
}

function failure(
  expression: string,
  tokens: CalculationReport["tokens"],
  error: string,
  type: CalculationReport["expressionType"],
  options: CalculateOptions,
): CalculationReport {
  return {
    expression,
    tokens,
    ast: null,
    expressionType: type,
    detectedCurrencies: [],
    validation: emptyValidation(),
    result: null,
    equivalents: [],
    relevantRates: [],
    metrics: { ...EMPTY_METRICS, tokens: tokens.length },
    error,
    ratesDate: options.ratesDate,
    ratesSource: options.ratesSource,
  };
}

export function calculate(expression: string, options: CalculateOptions): CalculationReport {
  const { rates, ratesDate, ratesSource, preferredOutputCurrency = null } = options;

  if (expression.trim().length === 0) {
    return {
      expression,
      tokens: [],
      ast: null,
      expressionType: "empty",
      detectedCurrencies: [],
      validation: emptyValidation(),
      result: null,
      equivalents: [],
      relevantRates: [],
      metrics: { ...EMPTY_METRICS },
      error: null,
      ratesDate,
      ratesSource,
    };
  }

  const parsed = parse(expression);
  if (!parsed.ok || !parsed.ast) {
    return failure(
      expression,
      parsed.tokens,
      parsed.error?.message ?? "Invalid expression.",
      "invalid",
      options,
    );
  }

  const validation = validate(parsed.ast);
  if (!validation.valid) {
    const report = failure(expression, parsed.tokens, validation.errors[0], "invalid", options);
    report.ast = parsed.ast;
    report.validation = validation;
    report.detectedCurrencies = detectCurrencies(parsed.ast);
    report.metrics = computeMetrics(parsed.tokens, parsed.ast, 0);
    return report;
  }

  const detected = detectCurrencies(parsed.ast);
  const needsRates = detected.length > 0;
  const expressionType = needsRates ? "money" : "number";

  if (needsRates && !rates) {
    const report = failure(
      expression,
      parsed.tokens,
      "Exchange rates are unavailable offline. Connect to refresh rates, or calculate with plain numbers.",
      "money",
      options,
    );
    report.ast = parsed.ast;
    report.validation = validation;
    report.detectedCurrencies = detected;
    report.metrics = computeMetrics(parsed.tokens, parsed.ast, 0);
    return report;
  }

  try {
    const result = evaluate(parsed.ast, rates ?? {});
    const outputCurrency =
      parsed.displayCurrency ??
      preferredOutputCurrency ??
      detected[0] ??
      (needsRates ? "INR" : undefined);

    if (result.value.kind === "money" && outputCurrency) {
      const from = result.value.currency!;
      if (from !== outputCurrency) {
        const converted = convertMoney(result.value.amount, from, outputCurrency, rates ?? {});
        result.conversions += 1;
        result.trace.push({
          type: "convert",
          title: `${prettyMoney(result.value.amount, from)} → ${prettyMoney(converted.amount, outputCurrency)}`,
          detail: `1 ${from} = ${converted.rate} ${outputCurrency}`,
          value: prettyMoney(converted.amount, outputCurrency),
        });
        result.value = { kind: "money", amount: converted.amount, currency: outputCurrency };
      }
      result.trace.push({
        type: "result",
        title: `Final result: ${prettyMoney(result.value.amount, result.value.currency!)}`,
        detail: `Displayed in ${result.value.currency}`,
        value: prettyMoney(result.value.amount, result.value.currency!),
      });
    } else {
      result.trace.push({
        type: "result",
        title: `Final result: ${result.value.amount}`,
        detail: "Scalar result",
        value: String(result.value.amount),
      });
    }

    const equivalents: TypedValue[] = [];
    if (result.value.kind === "money") {
      const targets = [...new Set([outputCurrency!, ...detected])];
      for (const target of targets) {
        if (target === result.value.currency) {
          equivalents.push({ ...result.value });
        } else {
          const converted = convertMoney(
            result.value.amount,
            result.value.currency!,
            target,
            rates ?? {},
          );
          equivalents.push({ kind: "money", amount: converted.amount, currency: target });
        }
      }
    }

    const relevantRates =
      result.value.kind === "money"
        ? detected
            .filter((code) => code !== result.value.currency)
            .map((code) => ({
              from: code,
              to: result.value.currency!,
              rate: rateBetween(code, result.value.currency!, rates ?? {}),
            }))
        : [];

    return {
      expression,
      tokens: parsed.tokens,
      ast: parsed.ast,
      displayCurrency: parsed.displayCurrency,
      expressionType,
      detectedCurrencies: detected,
      validation,
      result,
      equivalents,
      relevantRates,
      metrics: computeMetrics(parsed.tokens, parsed.ast, result.conversions),
      error: null,
      ratesDate,
      ratesSource,
    };
  } catch (err) {
    const message =
      err instanceof EvalFailure ? err.message : "Unable to calculate this expression.";
    const report = failure(expression, parsed.tokens, message, expressionType, options);
    report.ast = parsed.ast;
    report.validation = validation;
    report.detectedCurrencies = detected;
    report.metrics = computeMetrics(parsed.tokens, parsed.ast, 0);
    return report;
  }
}
