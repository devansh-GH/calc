import { currencySymbol } from "./currencies";
import type { ASTNode, EvalResult, TraceStep, TypedValue } from "../types";

export class EvalFailure extends Error {}

export function toUSD(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === "USD") return amount;
  const rate = rates[currency];
  if (rate === undefined || !(rate > 0)) {
    throw new EvalFailure(`Rate for ${currency} is unavailable.`);
  }
  return amount / rate;
}

export function fromUSD(usd: number, currency: string, rates: Record<string, number>): number {
  if (currency === "USD") return usd;
  const rate = rates[currency];
  if (rate === undefined || !(rate > 0)) {
    throw new EvalFailure(`Rate for ${currency} is unavailable.`);
  }
  return usd * rate;
}

export function convertMoney(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): { amount: number; rate: number } {
  if (from === to) return { amount, rate: 1 };
  const rate = rateBetween(from, to, rates);
  return { amount: amount * rate, rate };
}

export function rateBetween(from: string, to: string, rates: Record<string, number>): number {
  const fromRate = from === "USD" ? 1 : rates[from];
  const toRate = to === "USD" ? 1 : rates[to];
  if (fromRate === undefined || !(fromRate > 0))
    throw new EvalFailure(`Rate for ${from} is unavailable.`);
  if (toRate === undefined || !(toRate > 0))
    throw new EvalFailure(`Rate for ${to} is unavailable.`);
  return toRate / fromRate;
}

function group(value: number): string {
  const rounded =
    Math.abs(value) >= 1000 ? Math.round(value * 100) / 100 : Math.round(value * 10000) / 10000;
  const [int, frac] = String(rounded).split(".");
  const sign = value < 0 && rounded !== 0 ? "-" : "";
  const grouped = Math.abs(Number(int))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === undefined ? `${sign}${grouped}` : `${sign}${grouped}.${frac}`;
}

export function prettyMoney(amount: number, currency: string): string {
  const symbol = currencySymbol(currency);
  return symbol ? `${symbol}${group(amount)}` : `${group(amount)} ${currency}`;
}

const OP_SYMBOL: Record<string, string> = { add: "+", subtract: "−", multiply: "×", divide: "÷" };

class Evaluator {
  trace: TraceStep[] = [];
  operations = 0;
  conversions = 0;

  constructor(private readonly rates: Record<string, number>) {}

  run(node: ASTNode): TypedValue {
    switch (node.type) {
      case "number":
        return { kind: "number", amount: node.value };
      case "money":
        this.trace.push({
          type: "resolve",
          title: `Resolve ${prettyMoney(node.amount, node.currency)}`,
          detail: `${node.amount} ${node.currency}`,
          value: prettyMoney(node.amount, node.currency),
        });
        return { kind: "money", amount: node.amount, currency: node.currency };
      case "percent": {
        const operand = this.run(node.operand);
        if (operand.kind !== "number") {
          throw new EvalFailure('A percentage of a monetary value (like "$5%") is not supported.');
        }
        return { kind: "number", amount: operand.amount / 100 };
      }
      case "unary": {
        const operand = this.run(node.operand);
        return { ...operand, amount: node.operator === "minus" ? -operand.amount : operand.amount };
      }
      case "binary":
        return this.binary(node);
    }
  }

  private binary(node: Extract<ASTNode, { type: "binary" }>): TypedValue {
    if (node.right.type === "percent") {
      return this.binaryPercent(node.operator, node.left, node.right.operand);
    }
    const left = this.run(node.left);
    const right = this.run(node.right);
    this.operations += 1;

    if (left.kind === "number" && right.kind === "number") {
      const amount = applyScalar(node.operator, left.amount, right.amount);
      this.trace.push({
        type: "arithmetic",
        title: `${group(left.amount)} ${OP_SYMBOL[node.operator]} ${group(right.amount)}`,
        detail: "Scalar arithmetic",
        value: group(amount),
      });
      return { kind: "number", amount };
    }

    if (left.kind === "money" && right.kind === "money") {
      const converted = convertMoney(right.amount, right.currency!, left.currency!, this.rates);
      this.conversions += 1;
      this.trace.push({
        type: "convert",
        title: `${prettyMoney(right.amount, right.currency!)} → ${prettyMoney(converted.amount, left.currency!)}`,
        detail: `1 ${right.currency} = ${group(converted.rate)} ${left.currency}`,
        value: prettyMoney(converted.amount, left.currency!),
      });
      const amount = applyScalar(node.operator, left.amount, converted.amount);
      this.trace.push({
        type: "arithmetic",
        title: `${prettyMoney(left.amount, left.currency!)} ${OP_SYMBOL[node.operator]} ${prettyMoney(converted.amount, left.currency!)}`,
        detail: "Add monetary values",
        value: prettyMoney(amount, left.currency!),
      });
      return { kind: "money", amount, currency: left.currency };
    }

    const value = computeMixed(node.operator, left, right);
    this.trace.push({
      type: "arithmetic",
      title: `${describe(left)} ${OP_SYMBOL[node.operator]} ${describe(right)}`,
      detail:
        node.operator === "multiply" || node.operator === "divide"
          ? "Scale monetary value"
          : "Combine money and scalar",
      value: prettyMoney(value.amount, value.currency!),
    });
    return value;
  }

  private binaryPercent(op: string, leftNode: ASTNode, pctNode: ASTNode): TypedValue {
    const left = this.run(leftNode);
    const pct = this.run(pctNode);
    if (pct.kind !== "number") {
      throw new EvalFailure('A percentage of a monetary value (like "$5%") is not supported.');
    }
    this.operations += 1;
    const fraction = pct.amount / 100;
    if (op === "add" || op === "subtract") {
      const share = left.amount * fraction;
      const amount = op === "add" ? left.amount + share : left.amount - share;
      const leftText = describe(left);
      const result: TypedValue =
        left.kind === "money"
          ? { kind: "money", amount, currency: left.currency }
          : { kind: "number", amount };
      this.trace.push({
        type: "arithmetic",
        title: `${leftText} ${op === "add" ? "+" : "−"} ${group(pct.amount)}% of ${leftText}`,
        detail: left.kind === "money" ? "Percentage of monetary value" : "Percentage of scalar",
        value: left.kind === "money" ? prettyMoney(amount, left.currency!) : group(amount),
      });
      return result;
    }
    const amount =
      op === "multiply" ? left.amount * fraction : divideChecked(left.amount, fraction);
    const result: TypedValue =
      left.kind === "money"
        ? { kind: "money", amount, currency: left.currency }
        : { kind: "number", amount };
    this.trace.push({
      type: "arithmetic",
      title: `${describe(left)} ${op === "multiply" ? "×" : "÷"} ${group(pct.amount)}%`,
      detail: op === "multiply" ? "Multiply by percentage" : "Divide by percentage",
      value: left.kind === "money" ? prettyMoney(amount, left.currency!) : group(amount),
    });
    return result;
  }
}

function describe(v: TypedValue): string {
  return v.kind === "money" ? prettyMoney(v.amount, v.currency!) : group(v.amount);
}

function applyScalar(op: string, a: number, b: number): number {
  switch (op) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      return divideChecked(a, b);
    default:
      throw new EvalFailure("Unknown operator.");
  }
}

function divideChecked(a: number, b: number): number {
  if (b === 0) throw new EvalFailure("Division by zero.");
  return a / b;
}

function computeMixed(op: string, left: TypedValue, right: TypedValue): TypedValue {
  if (op === "multiply") {
    const money = left.kind === "money" ? left : right;
    const scalar = left.kind === "number" ? left.amount : (right as TypedValue).amount;
    return {
      kind: "money",
      amount: (money as TypedValue).amount * scalar,
      currency: (money as TypedValue).currency,
    };
  }
  if (op === "divide") {
    if (left.kind !== "money")
      throw new EvalFailure("Only a monetary value divided by a number is supported.");
    return {
      kind: "money",
      amount: applyScalar("divide", left.amount, (right as TypedValue).amount),
      currency: left.currency,
    };
  }
  throw new EvalFailure("Only + and − are supported between money values of this form.");
}

export function evaluate(ast: ASTNode, rates: Record<string, number>): EvalResult {
  const evaluator = new Evaluator(rates);
  const value = evaluator.run(ast);
  return {
    value,
    trace: evaluator.trace,
    operations: evaluator.operations,
    conversions: evaluator.conversions,
  };
}
