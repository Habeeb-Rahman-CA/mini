# Contributing to Mini (`minilang`)

Thank you for your interest in contributing to the **Mini Programming Language**! Mini is designed to make programming approachable, readable, and expressive through natural English.

---

## Architecture Overview

Mini is implemented in strict TypeScript (`src/`) with zero external runtime dependencies:

1. **[`src/tokens.ts`](src/tokens.ts)** — Token enum (`TokenType`), `SourceLocation`, and single-word keyword map.
2. **[`src/lexer.ts`](src/lexer.ts)** — Character scanner and greedy multi-word English phrase normalizer (`MULTI_WORD_PHRASES`).
3. **[`src/ast.ts`](src/ast.ts)** — Discriminated union AST types for `Expr` and `Stmt`.
4. **[`src/parser.ts`](src/parser.ts)** — Recursive-descent parser with operator precedence.
5. **[`src/environment.ts`](src/environment.ts)** — Lexical scopes, closures, and runtime value helpers.
6. **[`src/evaluator.ts`](src/evaluator.ts)** — AST expression evaluator (no `eval()`).
7. **[`src/interpreter.ts`](src/interpreter.ts)** — Statement execution, control-flow signals, built-in standard library, and resource guards (`maxLoopIterations`, `maxCallDepth`, `maxExecutionTimeMs`, `maxOutputLines`).
8. **[`src/errors.ts`](src/errors.ts)** — Source-annotated error formatting and Levenshtein `"Did you mean?"` suggestions.
9. **[`src/cli.ts`](src/cli.ts)** — `minilang` / `mini` CLI and interactive REPL.

---

## Development Setup

### Prerequisites
- **Node.js** `>= 18.0.0` (tested on Node 20, 22, and 24 across Linux, macOS, and Windows)
- **npm** `>= 9.0.0`

### Install, Build & Test
```bash
git clone https://github.com/Habeeb-Rahman-CA/mini.git
cd mini
npm install
npm run build
npm test
npm run check:examples
```

---

## Adding a New Feature

1. **New Natural-English Phrase or Keyword**:
   - Single-word keywords go in `SINGLE_WORD_KEYWORDS` in `src/tokens.ts`.
   - Multi-word operator phrases go in `MULTI_WORD_PHRASES` in `src/lexer.ts` (keep longer phrases ordered before shorter prefixes).
   - Update `editors/vscode-mini/syntaxes/mini.tmLanguage.json` if new keywords should be syntax-highlighted.
2. **New Built-in Standard Library Function**:
   - Register it in `Interpreter.registerBuiltins()` in `src/interpreter.ts`.
   - Add unit tests in `tests/mini.test.ts` and document it in `README.md` and `docs/index.html`.
3. **Rebuild Bundles**:
   - Always run `npm run build` so `docs/assets/mini-browser.js` and `editors/vscode-mini/out/mini-engine.cjs` stay synchronized.

---

## Pull Request Checklist

- [ ] Code compiles cleanly with `npm run build` (strict TypeScript).
- [ ] All existing and new tests pass with `npm test`.
- [ ] All example `.mini` programs pass with `npm run check:examples`.
- [ ] Documentation (`README.md` / `docs/index.html`) is updated if user-facing syntax or CLI flags changed.

