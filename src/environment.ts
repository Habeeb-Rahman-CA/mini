import { Stmt } from "./ast.js";
import { findClosestMatch, RuntimeError } from "./errors.js";
import { SourceLocation } from "./tokens.js";

export type MiniValue = number | string | boolean | null | MiniValue[];

export interface MiniUserFunction {
  kind: "user";
  name: string;
  params: string[];
  body: Stmt[];
  closure: Environment;
  loc: SourceLocation;
}

export interface MiniBuiltinFunction {
  kind: "builtin";
  name: string;
  minArgs: number;
  maxArgs: number;
  fn: (args: MiniValue[], loc: SourceLocation, source: string) => MiniValue;
}

export type MiniCallable = MiniUserFunction | MiniBuiltinFunction;

export class Environment {
  private readonly values = new Map<string, MiniValue>();
  private readonly functions = new Map<string, MiniCallable>();
  public readonly parent?: Environment;
  private readonly source: string;

  constructor(parent?: Environment, source: string = "") {
    this.parent = parent;
    this.source = source || parent?.source || "";
  }

  /**
   * Defines or overwrites a variable in the current local scope (used for function parameters and loop variables).
   */
  public defineLocal(name: string, value: MiniValue): void {
    this.values.set(name, value);
  }

  /**
   * Assigns a variable. If the variable already exists in an enclosing scope, updates it there;
   * otherwise defines it in the current scope.
   */
  public assign(name: string, value: MiniValue): void {
    const targetEnv = this.resolveVariableEnv(name);
    if (targetEnv) {
      targetEnv.values.set(name, value);
    } else {
      this.values.set(name, value);
    }
  }

  /**
   * Looks up a variable value or throws a helpful Name Error with typo suggestions.
   */
  public get(name: string, loc: SourceLocation): MiniValue {
    const env = this.resolveVariableEnv(name);
    if (env) {
      return env.values.get(name)!;
    }

    const suggestion = findClosestMatch(name, this.getAllVariableNames());
    const hint = suggestion
      ? `Did you mean '${suggestion}'? Or initialize '${name}' first with: assign ${name} to <value>`
      : `Initialize '${name}' before using it, e.g.: assign ${name} to 0`;

    throw new RuntimeError(
      "Name Error",
      `Variable '${name}' is not defined`,
      loc,
      this.source,
      hint
    );
  }

  public defineFunction(name: string, callable: MiniCallable): void {
    this.functions.set(name, callable);
  }

  public getFunction(name: string, loc: SourceLocation): MiniCallable {
    const env = this.resolveFunctionEnv(name);
    if (env) {
      return env.functions.get(name)!;
    }

    const suggestion = findClosestMatch(name, this.getAllFunctionNames());
    const hint = suggestion
      ? `Did you mean '${suggestion}(...)'?`
      : `Define the function first with: make ${name}(...) = ...`;

    throw new RuntimeError(
      "Name Error",
      `Function '${name}' is not defined`,
      loc,
      this.source,
      hint
    );
  }

  private resolveVariableEnv(name: string): Environment | undefined {
    if (this.values.has(name)) {
      return this;
    }
    return this.parent?.resolveVariableEnv(name);
  }

  private resolveFunctionEnv(name: string): Environment | undefined {
    if (this.functions.has(name)) {
      return this;
    }
    return this.parent?.resolveFunctionEnv(name);
  }

  public getAllVariableNames(): Set<string> {
    const names = new Set<string>(this.values.keys());
    if (this.parent) {
      for (const k of this.parent.getAllVariableNames()) {
        names.add(k);
      }
    }
    return names;
  }

  public getAllFunctionNames(): Set<string> {
    const names = new Set<string>(this.functions.keys());
    if (this.parent) {
      for (const k of this.parent.getAllFunctionNames()) {
        names.add(k);
      }
    }
    return names;
  }
}

export function formatMiniValue(value: MiniValue): string {
  if (value === null) return "nothing";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    // Avoid floating point noise like 0.30000000000000004 while preserving normal decimals
    if (!Number.isInteger(value)) {
      return String(Number(value.toPrecision(12)));
    }
    return String(value);
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return (
      "[" +
      value
        .map((item) =>
          typeof item === "string" ? `"${item}"` : formatMiniValue(item)
        )
        .join(", ") +
      "]"
    );
  }
  return String(value);
}

export function getMiniTypeName(value: MiniValue): string {
  if (value === null) return "nothing";
  if (Array.isArray(value)) return "list";
  return typeof value;
}

export function isTruthy(value: MiniValue): boolean {
  if (value === null || value === false) return false;
  if (value === 0 || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export function isEqual(a: MiniValue, b: MiniValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  return a === b;
}

