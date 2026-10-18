#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { formatMiniValue } from "./environment.js";
import { MiniError } from "./errors.js";
import { Interpreter } from "./interpreter.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";

const VERSION = "1.0.0";

function printHelp(): void {
  console.log(`Mini Programming Language v${VERSION}
A readable, natural-English programming language.

Usage:
  mini <file.mini>              Run a .mini source file
  mini run <file.mini>          Run a .mini source file
  mini -e "<code>"              Evaluate inline Mini code
  mini --tokens <file.mini>     Display lexer tokens for a file
  mini --ast <file.mini>        Display parsed AST as JSON for a file
  mini                          Start an interactive Mini REPL
  mini --help, -h               Show this help message
  mini --version, -v            Show version number

Example:
  make add(a, b) = a + b
  assign x to the total of 10 and 5
  show add(x, 2)
`);
}

function executeSource(
  source: string,
  fileName: string,
  options: { showTokens?: boolean; showAst?: boolean } = {}
): number {
  try {
    const lexer = new Lexer(source, fileName);
    const tokens = lexer.tokenize();

    if (options.showTokens) {
      console.log("=== Tokens ===");
      for (const tok of tokens) {
        const lit =
          tok.literal !== undefined ? ` (literal=${JSON.stringify(tok.literal)})` : "";
        console.log(
          `[${tok.loc.line}:${tok.loc.column}] ${tok.type.padEnd(12)} ${JSON.stringify(tok.lexeme)}${lit}`
        );
      }
      if (!options.showAst) return 0;
    }

    const parser = new Parser(tokens, source);
    const ast = parser.parse();

    if (options.showAst) {
      console.log("=== AST ===");
      console.log(JSON.stringify(ast, null, 2));
      return 0;
    }

    const interpreter = new Interpreter({ source });
    interpreter.interpret(ast);
    return 0;
  } catch (err) {
    if (err instanceof MiniError) {
      console.error(err.format());
      return 1;
    }
    console.error("Unexpected Error:", err instanceof Error ? err.message : err);
    return 1;
  }
}

function startRepl(): void {
  console.log(`Mini Programming Language v${VERSION} — Interactive REPL`);
  console.log(`Type 'exit' or 'quit' to leave, or enter Mini statements.\n`);

  const interpreter = new Interpreter();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "mini> ",
  });

  let buffer: string[] = [];
  let openBlocks = 0;

  const countBlockDelta = (line: string): number => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return 0;
    let delta = 0;
    if (
      /^(if|repeat|while|for)\b/i.test(trimmed) &&
      !/\bthen\s+(assign|set|show|print|say|give|return|increase|decrease|stop|skip)\b/i.test(
        trimmed
      )
    ) {
      delta++;
    } else if (/^(make|define)\b/i.test(trimmed) && !trimmed.includes("=")) {
      delta++;
    }
    if (/^end\b/i.test(trimmed)) {
      delta--;
    }
    return delta;
  };

  rl.prompt();

  rl.on("line", (line: string) => {
    const trimmed = line.trim();
    if (buffer.length === 0 && (trimmed === "exit" || trimmed === "quit")) {
      rl.close();
      return;
    }

    buffer.push(line);
    openBlocks += countBlockDelta(line);

    if (openBlocks > 0) {
      rl.setPrompt("...   ");
      rl.prompt();
      return;
    }

    openBlocks = 0;
    const code = buffer.join("\n");
    buffer = [];
    rl.setPrompt("mini> ");

    if (!code.trim()) {
      rl.prompt();
      return;
    }

    try {
      const lexer = new Lexer(code, "<repl>");
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, code);
      const ast = parser.parse();
      const prevOutputsLen = interpreter.outputs.length;
      const result = interpreter.interpret(ast);

      // If no `show` output was printed and an expression evaluated to a non-null value, print it
      if (
        interpreter.outputs.length === prevOutputsLen &&
        result !== null &&
        ast.body.length === 1 &&
        ast.body[0].kind === "ExprStmt"
      ) {
        console.log(formatMiniValue(result));
      }
    } catch (err) {
      if (err instanceof MiniError) {
        console.error(err.format());
      } else {
        console.error("Error:", err instanceof Error ? err.message : err);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

export function runCli(argv: string[] = process.argv.slice(2)): number {
  if (argv.length === 0) {
    startRepl();
    return 0;
  }

  let showTokens = false;
  let showAst = false;
  let evalCode: string | undefined;
  let targetFile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      printHelp();
      return 0;
    }
    if (arg === "--version" || arg === "-v") {
      console.log(VERSION);
      return 0;
    }
    if (arg === "--tokens") {
      showTokens = true;
      continue;
    }
    if (arg === "--ast") {
      showAst = true;
      continue;
    }
    if (arg === "-e" || arg === "--eval") {
      evalCode = argv[++i];
      if (evalCode === undefined) {
        console.error("Error: Missing code string after -e / --eval");
        return 1;
      }
      continue;
    }
    if (arg === "run" && !targetFile) {
      continue;
    }
    if (arg.startsWith("-")) {
      console.error(`Error: Unknown option '${arg}'. Run 'mini --help' for usage.`);
      return 1;
    }
    targetFile = arg;
  }

  if (evalCode !== undefined) {
    return executeSource(evalCode, "<eval>", { showTokens, showAst });
  }

  if (!targetFile) {
    printHelp();
    return 1;
  }

  const resolvedPath = path.resolve(process.cwd(), targetFile);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File not found: '${targetFile}'`);
    return 1;
  }

  const source = fs.readFileSync(resolvedPath, "utf-8");
  return executeSource(source, targetFile, { showTokens, showAst });
}

// Run if invoked directly from command line
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("cli.js") ||
    process.argv[1].endsWith("cli.ts") ||
    process.argv[1].endsWith("mini"));

if (isMain) {
  const exitCode = runCli();
  if (process.argv.slice(2).length > 0) {
    process.exit(exitCode);
  }
}

