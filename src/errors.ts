import { SourceLocation } from "./tokens.js";

export type ErrorCategory =
  | "Lexer Error"
  | "Syntax Error"
  | "Runtime Error"
  | "Name Error"
  | "Type Error"
  | "Zero Division Error"
  | "Index Error"
  | "Argument Error";

export class MiniError extends Error {
  public readonly category: ErrorCategory;
  public readonly loc: SourceLocation;
  public readonly sourceLines: string[];
  public readonly hint?: string;

  constructor(
    category: ErrorCategory,
    message: string,
    loc: SourceLocation,
    sourceCode: string = "",
    hint?: string
  ) {
    super(message);
    this.name = "MiniError";
    this.category = category;
    this.loc = loc;
    this.sourceLines = sourceCode ? sourceCode.split(/\r?\n/) : [];
    this.hint = hint;
  }

  public format(): string {
    const { file, line, column, length } = this.loc;
    const header = `${this.category}: ${this.message}`;
    const locationLine = `  --> ${file}:${line}:${column}`;

    const lineText =
      line >= 1 && line <= this.sourceLines.length
        ? this.sourceLines[line - 1]
        : undefined;

    if (lineText === undefined) {
      return this.hint
        ? `${header}\n${locationLine}\n  Hint: ${this.hint}`
        : `${header}\n${locationLine}`;
    }

    const lineNumStr = String(line);
    const gutterWidth = Math.max(lineNumStr.length, 2);
    const paddedLineNum = lineNumStr.padStart(gutterWidth, " ");
    const emptyGutter = " ".repeat(gutterWidth);

    const caretOffset = Math.max(0, column - 1);
    const caretLength = Math.max(1, length);
    const underline =
      " ".repeat(caretOffset) +
      "^" +
      (caretLength > 1 ? "~".repeat(caretLength - 1) : "");

    const lines = [
      header,
      locationLine,
      ` ${emptyGutter} |`,
      ` ${paddedLineNum} | ${lineText}`,
      ` ${emptyGutter} | ${underline}`,
    ];

    if (this.hint) {
      lines.push(`  Hint: ${this.hint}`);
    }

    return lines.join("\n");
  }
}

export class LexerError extends MiniError {
  constructor(
    message: string,
    loc: SourceLocation,
    sourceCode: string,
    hint?: string
  ) {
    super("Lexer Error", message, loc, sourceCode, hint);
    this.name = "LexerError";
  }
}

export class ParseError extends MiniError {
  constructor(
    message: string,
    loc: SourceLocation,
    sourceCode: string,
    hint?: string
  ) {
    super("Syntax Error", message, loc, sourceCode, hint);
    this.name = "ParseError";
  }
}

export class RuntimeError extends MiniError {
  constructor(
    category: ErrorCategory,
    message: string,
    loc: SourceLocation,
    sourceCode: string,
    hint?: string
  ) {
    super(category, message, loc, sourceCode, hint);
    this.name = "RuntimeError";
  }
}

/**
 * Computes Levenshtein distance between two strings for helpful "Did you mean?" suggestions.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

export function findClosestMatch(
  target: string,
  candidates: Iterable<string>,
  maxDistance: number = 2
): string | undefined {
  let bestMatch: string | undefined;
  let bestDist = maxDistance + 1;

  for (const candidate of candidates) {
    if (candidate === target) continue;
    const dist = levenshteinDistance(target, candidate);
    if (dist <= maxDistance && dist < bestDist) {
      bestDist = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

