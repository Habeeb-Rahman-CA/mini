import { Program } from "./ast.js";
import { MiniValue } from "./environment.js";
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

