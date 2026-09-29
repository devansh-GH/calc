import { SYMBOL_TO_CODE } from "./currencies";
import type { Token } from "../types";

const MULTI_CHAR_SYMBOLS = Object.keys(SYMBOL_TO_CODE)
  .filter((s) => s.length > 1)
  .sort((a, b) => b.length - a.length);

const SINGLE_CHAR_SYMBOLS = new Set(
  Object.keys(SYMBOL_TO_CODE).filter((s) => s.length === 1 && !/[A-Za-z]/.test(s)),
);

const OPERATOR_MAP: Record<string, string> = {
  "+": "+",
  "-": "-",
  "*": "*",
  "/": "/",
  "×": "*",
  "÷": "/",
  "−": "-",
  "–": "-",
  ":": "/",
};

export interface TokenizeResult {
  tokens: Token[];
  error: { message: string; position: number } | null;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}

function isLetter(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
}

export function tokenize(input: string): TokenizeResult {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === ",") {
      i += 1;
      continue;
    }

    if (isDigit(ch) || (ch === "." && isDigit(input[i + 1] ?? ""))) {
      const start = i;
      let seenDot = false;
      while (i < input.length && (isDigit(input[i]) || input[i] === ".")) {
        if (input[i] === ".") {
          if (seenDot) break;
          seenDot = true;
        }
        i += 1;
      }
      tokens.push({ kind: "number", value: input.slice(start, i), start, end: i });
      continue;
    }

    if (isLetter(ch)) {
      const start = i;
      while (i < input.length && isLetter(input[i])) i += 1;
      tokens.push({ kind: "word", value: input.slice(start, i), start, end: i });
      continue;
    }

    if (ch === "(") {
      tokens.push({ kind: "lparen", value: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen", value: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }
    if (ch === "%") {
      tokens.push({ kind: "percent", value: ch, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    const op = OPERATOR_MAP[ch];
    if (op !== undefined) {
      tokens.push({ kind: "operator", value: op, start: i, end: i + 1 });
      i += 1;
      continue;
    }

    let matched: string | null = null;
    for (const sym of MULTI_CHAR_SYMBOLS) {
      if (input.startsWith(sym, i)) {
        matched = sym;
        break;
      }
    }
    if (matched === null && SINGLE_CHAR_SYMBOLS.has(ch)) matched = ch;
    if (matched !== null) {
      tokens.push({ kind: "symbol", value: matched, start: i, end: i + matched.length });
      i += matched.length;
      continue;
    }

    return {
      tokens,
      error: { message: `Unexpected character "${ch}"`, position: i },
    };
  }

  return { tokens, error: null };
}
