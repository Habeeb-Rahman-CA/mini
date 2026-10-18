#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { formatMiniValue } from "./environment.js";
import { MiniError } from "./errors.js";
import { checkMini, VERSION } from "./index.js";
import { Interpreter, InterpreterOptions } from "./interpreter.js";
import { Lexer } from "./lexer.js";
import { Parser } from "./parser.js";

export interface CliIO {
  stdout: (msg: string) => void;
  stderr: (msg: string) => void;
}

const defaultIO: CliIO = {
  stdout: (msg: string) => console.log(msg),
  stderr: (msg: string) => console.error(msg),
};

function printHelp(io: CliIO): void {
  io.stdout(`Mini Programming Language (minilang) v${VERSION}
A readable, natural-English programming language.

Usage:
  minilang run <file.mini>          Execute a .mini source file
  minilang <file.mini>              Execute a .mini source file
  minilang repl                     Start the interactive Mini REPL
  minilang check <file.mini>        Validate syntax of a .mini file without running it
  minilang -e "<code>"              Evaluate inline Mini code
  minilang --tokens <file.mini>     Display lexer tokens for a file
  minilang --ast <file.mini>        Display parsed AST as JSON for a file
  minilang --version, -v            Display version number
  minilang --help, -h               Display this help message

Safety & Diagnostic Options:
  --json                            Output diagnostics as JSON (with 'check')
  --max-iterations <n>              Set maximum loop iterations (default: 100000)
  --max-depth <n>                   Set maximum recursion depth (default: 1000)
  --timeout <ms>                    Set execution timeout in ms (default: 5000, 0=none)

Aliases:
  Both 'minilang' and 'mini' commands are supported.

Example:
  make add(a, b) = a + b
  assign x to the total of 10 and 5
  show add(x, 2)
`);
}

interface ExecuteOptions {
  showTokens?: boolean;
  showAst?: boolean;
  checkOnly?: boolean;
  jsonOutput?: boolean;
  interpreterOptions?: InterpreterOptions;
  io?: CliIO;
}

export function executeSource(
  source: string,
  fileName: string,
  options: ExecuteOptions = {}
): number {
  const io = options.io ?? defaultIO;

  if (options.checkOnly) {
    const result = checkMini(source, fileName);
    if (options.jsonOutput) {
      io.stdout(JSON.stringify(result, null, 2));
      return result.valid ? 0 : 1;
    }
    if (result.valid) {
      io.stdout(`OK: ${fileName} has valid syntax.`);
      return 0;
    }
    for (const diag of result.diagnostics) {
      io.stderr(diag.formatted);
    }
    return 1;
  }

  try {
    const lexer = new Lexer(source, fileName);
    const tokens = lexer.tokenize();

    if (options.showTokens) {
      io.stdout("=== Tokens ===");
      for (const tok of tokens) {
        const lit =
          tok.literal !== undefined
            ? ` (literal=${JSON.stringify(tok.literal)})`
            : "";
        io.stdout(
          `[${tok.loc.line}:${tok.loc.column}] ${tok.type.padEnd(12)} ${JSON.stringify(tok.lexeme)}${lit}`
        );
      }
      if (!options.showAst) return 0;
    }

    const parser = new Parser(tokens, source);
    const ast = parser.parse();

    if (options.showAst) {
      io.stdout("=== AST ===");
      io.stdout(JSON.stringify(ast, null, 2));
      return 0;
    }

    const interpreter = new Interpreter({
      ...options.interpreterOptions,
      source,
      onOutput: options.interpreterOptions?.onOutput ?? ((line) => io.stdout(line)),
    });
    interpreter.interpret(ast);
    return 0;
  } catch (err) {
    if (err instanceof MiniError) {
      io.stderr(err.format());
      return 1;
    }
    io.stderr(`Unexpected Error: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

export function startRepl(io: CliIO = defaultIO): void {
  io.stdout(`Mini Programming Language v${VERSION} — Interactive REPL`);
  io.stdout(`Type 'help' for commands, or 'exit' / 'quit' to leave.\n`);

  const interpreter = new Interpreter({
    onOutput: (line) => io.stdout(line),
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "mini> ",
  });

  let buffer: string[] = [];
  let openBlocks = 0;

  const countBlockDelta = (line: string): number => {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("//") ||
      /^note:/i.test(trimmed)
    ) {
      return 0;
    }
    let delta = 0;
    if (
      /^(if|when|repeat|while|for)\b/i.test(trimmed) &&
      !/\bthen\s+(assign|set|let|show|print|say|give|return|increase|decrease|push|stop|break|skip|continue)\b/i.test(
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
    if (buffer.length === 0) {
      if (trimmed === "exit" || trimmed === "quit") {
        rl.close();
        return;
      }
      if (trimmed === "help") {
        io.stdout(
          `REPL Commands:\n  help            Show this message\n  clear           Clear multi-line input buffer\n  exit / quit     Exit the REPL\n\nExamples:\n  make add(a, b) = a + b\n  assign x to the total of 10 and 5\n  show add(x, 2)`
        );
        rl.prompt();
        return;
      }
      if (trimmed === "clear") {
        buffer = [];
        openBlocks = 0;
        rl.setPrompt("mini> ");
        rl.prompt();
        return;
      }
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

      if (
        interpreter.outputs.length === prevOutputsLen &&
        result !== null &&
        ast.body.length === 1 &&
        ast.body[0].kind === "ExprStmt"
      ) {
        io.stdout(formatMiniValue(result));
      }
    } catch (err) {
      if (err instanceof MiniError) {
        io.stderr(err.format());
      } else {
        io.stderr(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    process.exit(0);
  });
}

export function runCli(
  argv: string[] = process.argv.slice(2),
  io: CliIO = defaultIO
): number {
  if (argv.length === 0) {
    startRepl(io);
    return 0;
  }

  let showTokens = false;
  let showAst = false;
  let checkOnly = false;
  let jsonOutput = false;
  let evalCode: string | undefined;
  let targetFile: string | undefined;
  let maxLoopIterations: number | undefined;
  let maxCallDepth: number | undefined;
  let maxExecutionTimeMs: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h" || (arg === "help" && !targetFile)) {
      printHelp(io);
      return 0;
    }

    if (
      arg === "--version" ||
      arg === "-v" ||
      (arg === "version" && !targetFile)
    ) {
      io.stdout(VERSION);
      return 0;
    }

    if (arg === "repl" && !targetFile && evalCode === undefined) {
      startRepl(io);
      return 0;
    }

    if (arg === "run" && !targetFile) {
      continue;
    }

    if ((arg === "check" && !targetFile) || arg === "--check") {
      checkOnly = true;
      continue;
    }

    if (arg === "--json") {
      jsonOutput = true;
      continue;
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
        io.stderr("Error: Missing code string after -e / --eval");
        return 1;
      }
      continue;
    }

    if (arg === "--max-iterations") {
      const val = Number(argv[++i]);
      if (!Number.isInteger(val) || val < 1) {
        io.stderr("Error: --max-iterations requires a positive integer");
        return 1;
      }
      maxLoopIterations = val;
      continue;
    }

    if (arg === "--max-depth") {
      const val = Number(argv[++i]);
      if (!Number.isInteger(val) || val < 1) {
        io.stderr("Error: --max-depth requires a positive integer");
        return 1;
      }
      maxCallDepth = val;
      continue;
    }

    if (arg === "--timeout") {
      const val = Number(argv[++i]);
      if (Number.isNaN(val) || val < 0) {
        io.stderr("Error: --timeout requires a non-negative number of milliseconds");
        return 1;
      }
      maxExecutionTimeMs = val;
      continue;
    }

    if (arg.startsWith("-")) {
      io.stderr(
        `Error: Unknown option '${arg}'. Run 'minilang --help' for usage.`
      );
      return 1;
    }

    targetFile = arg;
  }

  const interpreterOptions: InterpreterOptions = {
    maxLoopIterations,
    maxCallDepth,
    maxExecutionTimeMs,
  };

  if (evalCode !== undefined) {
    return executeSource(evalCode, "<eval>", {
      showTokens,
      showAst,
      checkOnly,
      jsonOutput,
      interpreterOptions,
      io,
    });
  }

  if (!targetFile) {
    printHelp(io);
    return 1;
  }

  const resolvedPath = path.resolve(process.cwd(), targetFile);
  if (!fs.existsSync(resolvedPath)) {
    io.stderr(`Error: File not found: '${targetFile}'`);
    return 1;
  }

  const source = fs.readFileSync(resolvedPath, "utf-8");
  return executeSource(source, targetFile, {
    showTokens,
    showAst,
    checkOnly,
    jsonOutput,
    interpreterOptions,
    io,
  });
}

function isDirectInvocation(): boolean {
  if (!process.argv[1]) return false;
  try {
    const currentFile = fs.realpathSync(fileURLToPath(import.meta.url));
    const invokedFile = fs.realpathSync(process.argv[1]);
    if (currentFile === invokedFile) return true;
  } catch {
    // Fallback to basename matching if realpath fails on virtual/packaged fs
  }
  const base = path.basename(process.argv[1]).toLowerCase();
  return (
    base === "cli.js" ||
    base === "cli.ts" ||
    base === "mini" ||
    base === "minilang" ||
    base === "mini.cmd" ||
    base === "minilang.cmd"
  );
}

if (isDirectInvocation()) {
  const args = process.argv.slice(2);
  const isInteractiveRepl =
    args.length === 0 || (args.length === 1 && args[0] === "repl");
  const exitCode = runCli(args);
  if (!isInteractiveRepl) {
    process.exit(exitCode);
  }
}
