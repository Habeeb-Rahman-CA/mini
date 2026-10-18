#!/usr/bin/env node
/**
 * Bundles the Mini CLI into a single self-contained file (dist/standalone/minilang.mjs)
 * and generates Node.js Single Executable Application (SEA) config for building
 * native standalone binaries on Linux, macOS, and Windows.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const DIST_SRC = path.join(ROOT, "dist", "src");
const STANDALONE_DIR = path.join(ROOT, "dist", "standalone");

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
  "cli.js",
];

function stripImportsAndExports(code, keepExport = false) {
  let cleaned = code
    .replace(/^#!/gm, "// #!")
    .replace(/^import\s+[\s\S]*?from\s+["']\.\/[^"']+["'];?\s*$/gm, "")
    .replace(/^import\s+[\s\S]*?from\s+["']node:[^"']+["'];?\s*$/gm, "")
    .replace(/^export\s+\*\s+from\s+["']\.\/[^"']+["'];?\s*$/gm, "")
    .replace(/^export\s*\{\s*\};?\s*$/gm, "")
    .replace(/\/\/# sourceMappingURL=.*$/gm, "");

  if (!keepExport) {
    cleaned = cleaned.replace(/^export\s+(class|function|const|let|var|enum)\s+/gm, "$1 ");
  }
  return cleaned.trim();
}

fs.mkdirSync(STANDALONE_DIR, { recursive: true });

const header = `#!/usr/bin/env node
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
`;

const bodyChunks = [header];
for (const file of MODULE_ORDER) {
  const fullPath = path.join(DIST_SRC, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`Missing ${fullPath}. Run 'npm run build:tsc' first.`);
    process.exit(1);
  }
  const content = fs.readFileSync(fullPath, "utf-8");
  bodyChunks.push(`// === ${file} ===\n` + stripImportsAndExports(content));
}

const mjsBundlePath = path.join(STANDALONE_DIR, "minilang.mjs");
fs.writeFileSync(mjsBundlePath, bodyChunks.join("\n\n") + "\n", {
  encoding: "utf-8",
  mode: 0o755,
});

// Also create a CommonJS wrapper for Node SEA (--experimental-sea-config)
const cjsBody = bodyChunks
  .slice(1)
  .join("\n\n")
  .replace(/fileURLToPath\(import\.meta\.url\)/g, "__filename");

const cjsHeader = `#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
`;

const cjsBundlePath = path.join(STANDALONE_DIR, "minilang.cjs");
fs.writeFileSync(cjsBundlePath, cjsHeader + "\n" + cjsBody + "\n", {
  encoding: "utf-8",
  mode: 0o755,
});

const seaConfig = {
  main: "dist/standalone/minilang.cjs",
  output: "dist/standalone/sea-prep.blob",
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: true,
};

const seaConfigPath = path.join(ROOT, "sea-config.json");
fs.writeFileSync(seaConfigPath, JSON.stringify(seaConfig, null, 2) + "\n", "utf-8");

console.log(`Built standalone single-file CLI bundles:`);
console.log(`  - ESM: ${path.relative(ROOT, mjsBundlePath)}`);
console.log(`  - CJS (Node SEA): ${path.relative(ROOT, cjsBundlePath)}`);
console.log(`  - SEA config: ${path.relative(ROOT, seaConfigPath)}`);
