export type CurrencyCode = string;

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
}

export type TokenKind = "number" | "word" | "operator" | "lparen" | "rparen" | "percent" | "symbol";

export interface Token {
  kind: TokenKind;
  value: string;
  start: number;
  end: number;
}

export type BinaryOperator = "add" | "subtract" | "multiply" | "divide";

export type ASTNode =
  | { type: "number"; value: number }
  | { type: "money"; amount: number; currency: string }
  | { type: "percent"; operand: ASTNode }
  | { type: "binary"; operator: BinaryOperator; left: ASTNode; right: ASTNode }
  | { type: "unary"; operator: "plus" | "minus"; operand: ASTNode };

export type ValueType = "number" | "money";

export interface TypedValue {
  kind: ValueType;
  amount: number;
  currency?: string;
}

export interface ParseError {
  message: string;
  position: number;
}

export interface ParseResult {
  ok: boolean;
  ast?: ASTNode;
  displayCurrency?: string;
  tokens: Token[];
  error?: ParseError;
}

export interface TypeCheck {
  node: ASTNode;
  resultType: ValueType;
  currency?: string;
  children: TypeCheck[];
}

export interface ValidationResult {
  valid: boolean;
  rootType?: ValueType;
  rootCurrency?: string;
  checks: TypeCheck[];
  errors: string[];
}

export type TraceStepType = "resolve" | "convert" | "arithmetic" | "result";

export interface TraceStep {
  type: TraceStepType;
  title: string;
  detail: string;
  value?: string;
}

export interface EvalResult {
  value: TypedValue;
  trace: TraceStep[];
  operations: number;
  conversions: number;
}

export interface RateSnapshot {
  date: string;
  fetchedAt: string;
  base: string;
  rates: Record<string, number>;
  source: "network" | "cache" | "none";
}

export interface ExpressionMetrics {
  tokens: number;
  numbers: number;
  currencies: number;
  operators: number;
  parenthesisGroups: number;
  astDepth: number;
  arithmeticOperations: number;
  currencyConversions: number;
}

export interface CalculationReport {
  expression: string;
  tokens: Token[];
  ast: ASTNode | null;
  displayCurrency?: string;
  expressionType: "empty" | "number" | "money" | "invalid" | "incomplete";
  detectedCurrencies: string[];
  validation: ValidationResult;
  result: EvalResult | null;
  equivalents: TypedValue[];
  relevantRates: { from: string; to: string; rate: number }[];
  metrics: ExpressionMetrics;
  error: string | null;
  ratesDate: string | null;
  ratesSource: RateSnapshot["source"];
}

export type ThemeMode = "system" | "light" | "dark";

export interface AppSettings {
  defaultOutputCurrency: string | null;
  decimalPrecision: number;
  showEquivalents: boolean;
  showKeypad: boolean;
  haptics: boolean;
}

export interface CacheStatus {
  rateDate: string | null;
  fetchedAt: string | null;
  status: "fresh" | "cached" | "updating" | "offline" | "empty";
  storage: string;
}
