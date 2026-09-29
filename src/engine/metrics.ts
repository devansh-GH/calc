import type { ASTNode, ExpressionMetrics, Token } from "../types";

function depth(node: ASTNode): number {
  switch (node.type) {
    case "number":
    case "money":
      return 1;
    case "percent":
    case "unary":
      return 1 + depth(node.operand);
    case "binary":
      return 1 + Math.max(depth(node.left), depth(node.right));
  }
}

function countArithmetic(node: ASTNode): number {
  switch (node.type) {
    case "number":
    case "money":
      return 0;
    case "percent":
    case "unary":
      return countArithmetic(node.operand);
    case "binary":
      return 1 + countArithmetic(node.left) + countArithmetic(node.right);
  }
}

function countGroups(tokens: Token[]): number {
  let groups = 0;
  let depthCount = 0;
  for (const token of tokens) {
    if (token.kind === "lparen") {
      if (depthCount === 0) groups += 1;
      depthCount += 1;
    } else if (token.kind === "rparen") {
      depthCount = Math.max(0, depthCount - 1);
    }
  }
  return groups;
}

function collectCurrencies(node: ASTNode, into: Set<string>): void {
  switch (node.type) {
    case "money":
      into.add(node.currency);
      break;
    case "percent":
    case "unary":
      collectCurrencies(node.operand, into);
      break;
    case "binary":
      collectCurrencies(node.left, into);
      collectCurrencies(node.right, into);
      break;
    case "number":
      break;
  }
}

export function detectCurrencies(ast: ASTNode | null): string[] {
  const set = new Set<string>();
  if (ast) collectCurrencies(ast, set);
  return [...set];
}
export function computeMetrics(
  tokens: Token[],
  ast: ASTNode | null,
  conversions: number,
): ExpressionMetrics {
  return {
    tokens: tokens.length,
    numbers: tokens.filter((t) => t.kind === "number").length,
    currencies: detectCurrencies(ast).length,
    operators: tokens.filter((t) => t.kind === "operator" || t.kind === "percent").length,
    parenthesisGroups: countGroups(tokens),
    astDepth: ast ? depth(ast) : 0,
    arithmeticOperations: ast ? countArithmetic(ast) : 0,
    currencyConversions: conversions,
  };
}
