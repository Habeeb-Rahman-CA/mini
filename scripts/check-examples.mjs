#!/usr/bin/env node
/**
 * Validates syntax and executes every .mini program in the examples/ directory.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { checkMini, runMini } from "../dist/src/index.js";

const examplesDir = path.resolve(process.cwd(), "examples");
const files = fs
  .readdirSync(examplesDir)
  .filter((f) => f.endsWith(".mini"))
  .sort();

if (files.length === 0) {
  console.error("No .mini files found in examples/");
  process.exit(1);
}

console.log(`Validating and running ${files.length} example programs...`);
for (const file of files) {
  const fullPath = path.join(examplesDir, file);
  const source = fs.readFileSync(fullPath, "utf-8");

  const checkResult = checkMini(source, file);
  if (!checkResult.valid) {
    console.error(`Syntax check failed for ${file}:`);
    for (const d of checkResult.diagnostics) {
      console.error(d.formatted);
    }
    process.exit(1);
  }

  const outputs = [];
  runMini(source, {
    file,
    onOutput: (line) => outputs.push(line),
  });
  console.log(`  ✔ ${file.padEnd(28)} (${outputs.length} output line${outputs.length === 1 ? "" : "s"})`);
}
console.log("All example programs passed!");

