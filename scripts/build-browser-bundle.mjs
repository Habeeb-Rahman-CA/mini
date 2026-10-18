#!/usr/bin/env node
/**
 * Builds:
 * 1. A single-file, zero-dependency browser bundle of the Mini core engine
 *    for the interactive browser playground (docs/assets/mini-browser.js)
 *    that exposes `window.MiniLang` (works on https://, http://, and file://).
 * 2. A CommonJS bundle (editors/vscode-mini/out/mini-engine.cjs) for the
 *    VS Code extension's live diagnostics provider.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const DIST_SRC = path.join(ROOT, "dist", "src");
const OUT_DIR = path.join(ROOT, "docs", "assets");
const OUT_FILE = path.join(OUT_DIR, "mini-browser.js");
const VSCODE_OUT_DIR = path.join(ROOT, "editors", "vscode-mini", "out");
const VSCODE_ENGINE_FILE = path.join(VSCODE_OUT_DIR, "mini-engine.cjs");

const MODULE_ORDER = [
  "tokens.js",
  "errors.js",
  "lexer.js",
  "ast.js",
  "parser.js",
  "environment.js",
  "evaluator.js",
  "interpreter.js",
  "index.js",
];

function stripLocalImportsAndExports(code) {
  return code
    .replace(/^import\s+[\s\S]*?from\s+["']\.\/[^"']+["'];?\s*$/gm, "")
    .replace(/^export\s+\*\s+from\s+["']\.\/[^"']+["'];?\s*$/gm, "")
    .replace(/^export\s*\{\s*\};?\s*$/gm, "")
    .replace(/^export\s+(class|function|const|let|var)\s+/gm, "$1 ")
    .replace(/\/\/# sourceMappingURL=.*$/gm, "")
    .trim();
}

const chunks = [];

for (const modName of MODULE_ORDER) {
  const fullPath = path.join(DIST_SRC, modName);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing compiled module: ${fullPath}. Run 'npx tsc' first.`);
    process.exit(1);
  }
  const raw = fs.readFileSync(fullPath, "utf-8");
  chunks.push(`// --- ${modName} ---`);
  chunks.push(stripLocalImportsAndExports(raw));
}

const coreBody = chunks.join("\n\n");

const browserBundle = `/**
 * Mini Programming Language — Browser Engine Bundle (Auto-generated from TypeScript build)
 */
(function (globalScope) {
"use strict";

${coreBody}

globalScope.MiniLang = {
  TokenType,
  SINGLE_WORD_KEYWORDS,
  MiniError,
  LexerError,
  ParseError,
  RuntimeError,
  Lexer,
  Parser,
  Environment,
  Evaluator,
  Interpreter,
  VERSION,
  runMini,
  checkMini,
  formatMiniValue
};
})(typeof window !== "undefined" ? window : globalThis);
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, browserBundle, "utf-8");
console.log(`Built browser engine bundle: ${path.relative(ROOT, OUT_FILE)}`);

// Convert to CJS for the VS Code extension engine
const cjsCode = `"use strict";\n\n${coreBody}\n\nmodule.exports = { TokenType, SINGLE_WORD_KEYWORDS, MiniError, LexerError, ParseError, RuntimeError, Lexer, Parser, Environment, Evaluator, Interpreter, VERSION, runMini, checkMini };\n`;

fs.mkdirSync(VSCODE_OUT_DIR, { recursive: true });
fs.writeFileSync(VSCODE_ENGINE_FILE, cjsCode, "utf-8");
console.log(
  `Built VS Code extension engine: ${path.relative(ROOT, VSCODE_ENGINE_FILE)}`
);
