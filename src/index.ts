import { Program } from "./ast.js";
import { MiniValue } from "./environment.js";
import { ErrorCategory, MiniError } from "./errors.js";
import { Interpreter, InterpreterOptions } from "./interpreter.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";
import { Token } from "./tokens.js";

export * from "./tokens.js";
export * from "./errors.js";
export * from "./lexer.js";
export * from "./ast.js";
export * from "./parser.js";
export * from "./environment.js";
export * from "./evaluator.js";
export * from "./interpreter.js";

export const VERSION = "1.0.0";

export interface RunMiniOptions extends InterpreterOptions {
  file?: string;
}

export interface RunMiniResult {
  tokens: Token[];
  ast: Program;
  outputs: string[];
  lastValue: MiniValue;
  interpreter: Interpreter;
}

export interface MiniDiagnostic {
  category: ErrorCategory;
  message: string;
  file: string;
  line: number;
  column: number;
  length: number;
  hint?: string;
  formatted: string;
}

export interface CheckMiniResult {
  valid: boolean;
  tokens?: Token[];
  ast?: Program;
  diagnostics: MiniDiagnostic[];
}

export function runMini(
  source: string,
  options: RunMiniOptions = {}
): RunMiniResult {
  const file = options.file ?? "<stdin>";
  const lexer = new Lexer(source, file);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens, source);
  const ast = parser.parse();

  const interpreter = new Interpreter({
    ...options,
    source,
  });
  const lastValue = interpreter.interpret(ast);

  return {
    tokens,
    ast,
    outputs: interpreter.outputs,
    lastValue,
    interpreter,
  };
}

/**
 * Validates Mini source code (Lexer + Parser) without executing statements.
 * Useful for CLI syntax checking (`minilang check`) and IDE/VS Code diagnostics.
 */
export function checkMini(
  source: string,
  file: string = "<stdin>"
): CheckMiniResult {
  try {
    const lexer = new Lexer(source, file);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    return {
      valid: true,
      tokens,
      ast,
      diagnostics: [],
    };
  } catch (err) {
    if (err instanceof MiniError) {
      return {
        valid: false,
        diagnostics: [
          {
            category: err.category,
            message: err.message,
            file: err.loc.file,
            line: err.loc.line,
            column: err.loc.column,
            length: err.loc.length,
            hint: err.hint,
            formatted: err.format(),
          },
        ],
      };
    }
    throw err;
  }
}
