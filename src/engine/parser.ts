import { SYMBOL_TO_CODE, isKnownCurrencyCode } from "./currencies";
import { tokenize } from "./tokenizer";
import type { ASTNode, BinaryOperator, ParseResult, Token } from "../types";

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

function symbolToCode(symbol: string): string | null {
  return SYMBOL_TO_CODE[symbol] ?? null;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(offset = 0): Token | null {
    return this.tokens[this.pos + offset] ?? null;
  }

  private next(): Token {
    const token = this.tokens[this.pos];
    this.pos += 1;
    return token;
  }

  get consumed(): number {
    return this.pos;
  }

  parseExpression(minPrecedence = 0): ASTNode {
    let left = this.parseUnary();
    for (;;) {
      const op = this.peek();
      if (op?.kind !== "operator") return left;
      const precedence = PRECEDENCE[op.value] ?? 0;
      if (precedence < minPrecedence) return left;
      this.next();
      const right = this.parseExpression(precedence + 1);
      const operator = (
        { "+": "add", "-": "subtract", "*": "multiply", "/": "divide" } as Record<
          string,
          BinaryOperator
        >
      )[op.value];
      left = { type: "binary", operator, left, right };
    }
  }

  private parseUnary(): ASTNode {
    const token = this.peek();
    if (token?.kind === "operator" && (token.value === "+" || token.value === "-")) {
      this.next();
      const operand = this.parseUnary();
      if (token.value === "+") return operand;
      if (operand.type === "number") return { type: "number", value: -operand.value };
      if (operand.type === "money")
        return { type: "money", amount: -operand.amount, currency: operand.currency };
      return { type: "unary", operator: "minus", operand };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    const node = this.parsePrimary();
    if (this.peek()?.kind === "percent") {
      this.next();
      return { type: "percent", operand: node };
    }
    return node;
  }

  private parsePrimary(): ASTNode {
    const token = this.next();
    if (!token) {
      const at = this.tokens.length > 0 ? this.tokens[this.tokens.length - 1].end : 0;
      throw new ParseFailure('Incomplete expression: expected a number, currency, or "("', at);
    }

    if (token.kind === "number") {
      const next = this.peek();
      if (next?.kind === "word" && isKnownCurrencyCode(next.value)) {
        this.next();
        return {
          type: "money",
          amount: parseFloat(token.value),
          currency: next.value.toUpperCase(),
        };
      }
      if (next?.kind === "symbol") {
        const code = symbolToCode(next.value);
        if (!code) throw new ParseFailure(`Unknown currency symbol "${next.value}"`, next.start);
        this.next();
        return { type: "money", amount: parseFloat(token.value), currency: code };
      }
      return { type: "number", value: parseFloat(token.value) };
    }

    if (token.kind === "symbol") {
      const code = symbolToCode(token.value);
      if (!code) throw new ParseFailure(`Unknown currency symbol "${token.value}"`, token.start);
      const amount = this.peek();
      if (amount?.kind !== "number") {
        throw new ParseFailure(`Expected a number after "${token.value}"`, token.end);
      }
      this.next();
      return { type: "money", amount: parseFloat(amount.value), currency: code };
    }

    if (token.kind === "word") {
      const upper = token.value.toUpperCase();
      if (isKnownCurrencyCode(upper)) {
        const amount = this.peek();
        if (amount?.kind !== "number") {
          throw new ParseFailure(`Expected a number after "${token.value}"`, token.end);
        }
        this.next();
        return { type: "money", amount: parseFloat(amount.value), currency: upper };
      }
      throw new ParseFailure(`Unknown currency "${token.value}"`, token.start);
    }

    if (token.kind === "lparen") {
      if (this.peek() === null)
        throw new ParseFailure('Unbalanced parenthesis: missing ")"', token.start);
      const inner = this.parseExpression(0);
      const closing = this.peek();
      if (closing?.kind !== "rparen") {
        throw new ParseFailure('Unbalanced parenthesis: missing ")"', token.start);
      }
      this.next();
      return inner;
    }

    if (token.kind === "operator") {
      throw new ParseFailure(
        `Unexpected "${token.value}": expected a number, currency, or "("`,
        token.start,
      );
    }
    if (token.kind === "rparen") {
      throw new ParseFailure('Unbalanced parenthesis: unexpected ")"', token.start);
    }
    if (token.kind === "percent") {
      throw new ParseFailure('Misplaced "%": expected a number before it', token.start);
    }
    throw new ParseFailure("Invalid expression", token.start);
  }
}

export class ParseFailure extends Error {
  constructor(
    message: string,
    readonly position: number,
  ) {
    super(message);
  }
}

export function parse(input: string): ParseResult {
  const { tokens, error } = tokenize(input);
  if (error)
    return { ok: false, tokens, error: { message: error.message, position: error.position } };
  if (tokens.length === 0) return { ok: true, tokens, ast: undefined };

  const parser = new Parser(tokens);
  try {
    const ast = parser.parseExpression(0);
    let displayCurrency: string | undefined;
    const rest = tokens.slice(parser.consumed);
    if (rest.length > 0) {
      const [first, second] = rest;
      if (
        rest.length === 2 &&
        first.kind === "word" &&
        first.value.toLowerCase() === "in" &&
        second.kind === "word" &&
        isKnownCurrencyCode(second.value)
      ) {
        displayCurrency = second.value.toUpperCase();
      } else if (rest[0].kind === "word" && /^[A-Z]{3}$/.test(rest[0].value)) {
        return {
          ok: false,
          tokens,
          error: { message: `Unknown currency "${rest[0].value}"`, position: rest[0].start },
        };
      } else {
        const at = rest[0].start;
        const hint =
          rest[0].kind === "operator"
            ? `Unexpected "${rest[0].value}": the expression looks complete`
            : `Unexpected "${rest[0].value}" after a complete expression`;
        return { ok: false, tokens, error: { message: hint, position: at } };
      }
    }
    return { ok: true, tokens, ast, displayCurrency };
  } catch (err) {
    if (err instanceof ParseFailure) {
      return { ok: false, tokens, error: { message: err.message, position: err.position } };
    }
    throw err;
  }
}
