import type { ASTNode, TypeCheck, ValidationResult, ValueType } from "../types";

function check(node: ASTNode, errors: string[]): TypeCheck {
  switch (node.type) {
    case "number":
      return { node, resultType: "number", children: [] };
    case "money":
      return { node, resultType: "money", currency: node.currency, children: [] };
    case "percent": {
      const child = check(node.operand, errors);
      if (child.resultType === "money") {
        errors.push(
          'A percentage of a monetary value (like "$5%") is not supported. Use a plain percentage after + or − (e.g. "100 USD + 5%").',
        );
      }
      return { node, resultType: "number", children: [child] };
    }
    case "unary": {
      const child = check(node.operand, errors);
      return { node, resultType: child.resultType, currency: child.currency, children: [child] };
    }
    case "binary": {
      const left = check(node.left, errors);
      const right = check(node.right, errors);
      const combined = combine(node, left, right, errors);
      return { node, ...combined, children: [left, right] };
    }
  }
}

function combine(
  node: Extract<ASTNode, { type: "binary" }>,
  left: TypeCheck,
  right: TypeCheck,
  errors: string[],
): { resultType: ValueType; currency?: string } {
  const op = node.operator;
  if (node.right.type === "percent") {
    return { resultType: left.resultType, currency: left.currency };
  }
  if (left.resultType === "number" && right.resultType === "number") {
    return { resultType: "number" };
  }
  if (left.resultType === "money" && right.resultType === "money") {
    if (op === "add" || op === "subtract") {
      return { resultType: "money", currency: left.currency };
    }
    errors.push(
      "Both operands are monetary values. This calculator only supports multiplying or dividing a monetary value by a scalar number.",
    );
    return { resultType: "money", currency: left.currency };
  }
  const moneySide =
    left.resultType === "money" ? left : right.resultType === "money" ? right : null;
  if (moneySide) {
    if (op === "multiply") return { resultType: "money", currency: moneySide.currency };
    if (op === "divide") {
      if (right.resultType === "money") {
        errors.push(
          "Both operands are monetary values. This calculator only supports multiplying or dividing a monetary value by a scalar number.",
        );
        return { resultType: "money", currency: left.currency };
      }
      return { resultType: "money", currency: moneySide.currency };
    }
    errors.push(
      `Cannot ${op === "add" ? "add" : "subtract"} a plain number to a monetary value. ` +
        'Only combine money with money, or scale money by a number (e.g. "100 USD / 2").',
    );
    return { resultType: "money", currency: moneySide.currency };
  }
  return { resultType: "number" };
}

export function validate(ast: ASTNode): ValidationResult {
  const errors: string[] = [];
  const root = check(ast, errors);
  return {
    valid: errors.length === 0,
    rootType: errors.length === 0 ? root.resultType : undefined,
    rootCurrency: errors.length === 0 ? root.currency : undefined,
    checks: [root],
    errors,
  };
}
