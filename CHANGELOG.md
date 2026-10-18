# Changelog

All notable changes to the **Mini Programming Language (`minilang-cli`)** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-18

### Added
- **Core Language Engine**:
  - Full Lexer (`src/lexer.ts`) with multi-word natural-English phrase normalization (`is greater than`, `is equal to`, `is at least`, `divided by`, `to the power of`, etc.).
  - Recursive-descent Parser (`src/parser.ts`) and typed AST (`src/ast.ts`).
  - Expression Evaluator (`src/evaluator.ts`) and Statement Interpreter (`src/interpreter.ts`) built from scratch without `eval()`.
  - Prefix English arithmetic (`the total of`, `the sum of`, `the difference of`, `the product of`, `the quotient of`, `the remainder of`) alongside infix English and symbolic operators.
  - Single-line (`make add(a, b) = a + b`) and multi-line (`make ... end`) functions with lexical closures and recursion.
  - Conditionals (`if`, `otherwise if`, `otherwise`, `end`) and loops (`repeat N times`, `while`, `for ... from ... to ...`, `for each ... in ...`, `stop`, `skip`).
  - Lists, string manipulation, and 17 built-in standard library functions.
- **Diagnostics & Safety**:
  - Source-annotated `LexerError`, `ParseError`, and `RuntimeError` with caret underlines (`^~~~`) and Levenshtein `"Did you mean '...'?"` suggestions.
  - Safe execution limits for loop iterations (`--max-iterations`), recursion depth (`--max-depth`), execution timeout (`--timeout`), and output lines.
  - `checkMini()` static validation API (`minilang check` and `minilang check --json`).
- **CLI & Distribution**:
  - Cross-platform `minilang` and `mini` CLI commands (`run`, `repl`, `check`, `--tokens`, `--ast`, `-e`, `--version`, `--help`).
  - Single-file standalone bundles (`dist/standalone/minilang.mjs` and `dist/standalone/minilang.cjs`) and Node.js SEA configuration.
- **Editor Support & Documentation**:
  - VS Code Extension (`editors/vscode-mini/`) with syntax highlighting, file icons, code snippets, and live error diagnostics.
  - Interactive documentation website (`docs/`) with an embedded browser playground.

