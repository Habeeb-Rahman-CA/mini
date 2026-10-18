import {
  AssignStmt,
  ForEachStmt,
  ForRangeStmt,
  FunctionDeclStmt,
  GiveStmt,
  IfStmt,
  LoopControlStmt,
  MutateNumberStmt,
  Program,
  PushStmt,
  RepeatStmt,
  ShowStmt,
  Stmt,
  WhileStmt,
} from "./ast.js";
import {
  Environment,
  formatMiniValue,
  getMiniTypeName,
  isTruthy,
  MiniUserFunction,
  MiniValue,
} from "./environment.js";
import { RuntimeError } from "./errors.js";
import { Evaluator } from "./evaluator.js";
import { SourceLocation } from "./tokens.js";

class GiveSignal {
  constructor(
    public readonly value: MiniValue,
    public readonly loc: SourceLocation
  ) {}
}

class LoopSignal {
  constructor(
    public readonly action: "stop" | "skip",
    public readonly loc: SourceLocation
  ) {}
}

export interface InterpreterOptions {
  source?: string;
  onOutput?: (line: string) => void;
  maxCallDepth?: number;
  maxLoopIterations?: number;
  maxExecutionTimeMs?: number;
  maxOutputLines?: number;
}

export class Interpreter {
  private readonly source: string;
  private readonly onOutput: (line: string) => void;
  private readonly maxCallDepth: number;
  private readonly maxLoopIterations: number;
  private readonly maxExecutionTimeMs: number;
  private readonly maxOutputLines: number;
  private callDepth: number = 0;
  private loopDepth: number = 0;
  private executionStartTime: number = 0;

  public readonly globalEnv: Environment;
  public readonly evaluator: Evaluator;
  public readonly outputs: string[] = [];

  constructor(options: InterpreterOptions = {}) {
    this.source = options.source ?? "";
    this.onOutput = options.onOutput ?? ((line: string) => console.log(line));
    this.maxCallDepth = options.maxCallDepth ?? 1000;
    this.maxLoopIterations = options.maxLoopIterations ?? 100_000;
    this.maxExecutionTimeMs = options.maxExecutionTimeMs ?? 5000;
    this.maxOutputLines = options.maxOutputLines ?? 10_000;

    this.globalEnv = new Environment(undefined, this.source);
    this.registerBuiltins();

    this.evaluator = new Evaluator(
      this.source,
      (fn, args, callLoc) => this.executeUserFunction(fn, args, callLoc)
    );
  }

  public interpret(program: Program): MiniValue {
    let lastValue: MiniValue = null;
    this.executionStartTime = Date.now();
    try {
      for (const stmt of program.body) {
        lastValue = this.executeStatement(stmt, this.globalEnv);
      }
    } catch (signal) {
      if (signal instanceof GiveSignal) {
        throw new RuntimeError(
          "Runtime Error",
          `'give' (or 'return') can only be used inside a function`,
          signal.loc,
          this.source,
          `Wrap this statement inside a 'make <name>(...) ... end' function.`
        );
      }
      if (signal instanceof LoopSignal) {
        throw new RuntimeError(
          "Runtime Error",
          `'${signal.action}' can only be used inside a loop`,
          signal.loc,
          this.source,
          `Use '${signal.action}' inside a 'repeat', 'while', or 'for' loop.`
        );
      }
      throw signal;
    }
    return lastValue;
  }

  private executeStatement(stmt: Stmt, env: Environment): MiniValue {
    this.checkTimeLimit(stmt.loc);
    switch (stmt.kind) {
      case "AssignStmt":
        return this.executeAssign(stmt, env);

      case "MutateNumberStmt":
        return this.executeMutateNumber(stmt, env);

      case "PushStmt":
        return this.executePush(stmt, env);

      case "ShowStmt":
        return this.executeShow(stmt, env);

      case "FunctionDeclStmt":
        return this.executeFunctionDecl(stmt, env);

      case "GiveStmt":
        return this.executeGive(stmt, env);

      case "IfStmt":
        return this.executeIf(stmt, env);

      case "RepeatStmt":
        return this.executeRepeat(stmt, env);

      case "WhileStmt":
        return this.executeWhile(stmt, env);

      case "ForRangeStmt":
        return this.executeForRange(stmt, env);

      case "ForEachStmt":
        return this.executeForEach(stmt, env);

      case "LoopControlStmt":
        return this.executeLoopControl(stmt);

      case "ExprStmt":
        return this.evaluator.evaluate(stmt.expression, env);
    }
  }

  private executeAssign(stmt: AssignStmt, env: Environment): MiniValue {
    const val = this.evaluator.evaluate(stmt.value, env);

    if (stmt.index !== undefined) {
      const target = env.get(stmt.name, stmt.loc);
      if (!Array.isArray(target)) {
        throw new RuntimeError(
          "Type Error",
          `Cannot assign by index to '${stmt.name}' because it is a ${getMiniTypeName(target)}, not a list`,
          stmt.loc,
          this.source
        );
      }
      const idx = this.evaluator.evaluate(stmt.index, env);
      if (typeof idx !== "number" || !Number.isInteger(idx)) {
        throw new RuntimeError(
          "Type Error",
          `List index must be an integer, got ${getMiniTypeName(idx)}`,
          stmt.index.loc,
          this.source
        );
      }
      const normIdx = idx < 0 ? target.length + idx : idx;
      if (normIdx < 0 || normIdx >= target.length) {
        throw new RuntimeError(
          "Index Error",
          `Index ${idx} is out of bounds for list '${stmt.name}' of length ${target.length}`,
          stmt.index.loc,
          this.source
        );
      }
      target[normIdx] = val;
      return val;
    }

    env.assign(stmt.name, val);
    return val;
  }

  private executeMutateNumber(
    stmt: MutateNumberStmt,
    env: Environment
  ): MiniValue {
    const currentVal = env.get(stmt.name, stmt.loc);
    if (typeof currentVal !== "number") {
      throw new RuntimeError(
        "Type Error",
        `Cannot '${stmt.operator}' variable '${stmt.name}' because its value is a ${getMiniTypeName(currentVal)} (${formatMiniValue(currentVal)})`,
        stmt.loc,
        this.source,
        `'${stmt.operator}' only works on numeric variables.`
      );
    }

    const deltaVal = this.evaluator.evaluate(stmt.delta, env);
    if (typeof deltaVal !== "number") {
      throw new RuntimeError(
        "Type Error",
        `Amount to '${stmt.operator}' must be a number, but got ${getMiniTypeName(deltaVal)} (${formatMiniValue(deltaVal)})`,
        stmt.delta.loc,
        this.source
      );
    }

    const updated =
      stmt.operator === "increase"
        ? currentVal + deltaVal
        : currentVal - deltaVal;
    env.assign(stmt.name, updated);
    return updated;
  }

  private executePush(stmt: PushStmt, env: Environment): MiniValue {
    const target = env.get(stmt.target, stmt.loc);
    if (!Array.isArray(target)) {
      throw new RuntimeError(
        "Type Error",
        `Cannot push to '${stmt.target}' because it is a ${getMiniTypeName(target)}, not a list`,
        stmt.loc,
        this.source,
        `Initialize '${stmt.target}' as a list first, e.g.: assign ${stmt.target} to []`
      );
    }
    const item = this.evaluator.evaluate(stmt.value, env);
    target.push(item);
    return target;
  }

  private executeShow(stmt: ShowStmt, env: Environment): MiniValue {
    if (this.maxOutputLines > 0 && this.outputs.length >= this.maxOutputLines) {
      throw new RuntimeError(
        "Runtime Error",
        `Program exceeded maximum output limit (${this.maxOutputLines} lines)`,
        stmt.loc,
        this.source,
        `Check for an unintended loop printing too many lines.`
      );
    }
    const evaluated = stmt.values.map((expr) =>
      this.evaluator.evaluate(expr, env)
    );
    const formatted = evaluated.map((v) => formatMiniValue(v)).join(" ");
    this.outputs.push(formatted);
    this.onOutput(formatted);
    return evaluated[evaluated.length - 1] ?? null;
  }

  private executeFunctionDecl(
    stmt: FunctionDeclStmt,
    env: Environment
  ): MiniValue {
    const userFn: MiniUserFunction = {
      kind: "user",
      name: stmt.name,
      params: stmt.params,
      body: stmt.body,
      closure: env,
      loc: stmt.loc,
    };
    env.defineFunction(stmt.name, userFn);
    return null;
  }

  private executeGive(stmt: GiveStmt, env: Environment): never {
    const value =
      stmt.value !== null ? this.evaluator.evaluate(stmt.value, env) : null;
    throw new GiveSignal(value, stmt.loc);
  }

  private executeIf(stmt: IfStmt, env: Environment): MiniValue {
    for (const branch of stmt.branches) {
      const condVal = this.evaluator.evaluate(branch.condition, env);
      if (isTruthy(condVal)) {
        return this.executeBlock(branch.body, env);
      }
    }

    if (stmt.elseBranch !== null) {
      return this.executeBlock(stmt.elseBranch, env);
    }

    return null;
  }

  private executeRepeat(stmt: RepeatStmt, env: Environment): MiniValue {
    const countVal = this.evaluator.evaluate(stmt.count, env);
    if (typeof countVal !== "number" || !Number.isInteger(countVal)) {
      throw new RuntimeError(
        "Type Error",
        `Repeat count must be an integer, but got ${getMiniTypeName(countVal)} (${formatMiniValue(countVal)})`,
        stmt.count.loc,
        this.source,
        `Use a whole number in 'repeat <N> times'.`
      );
    }

    if (countVal < 0) {
      throw new RuntimeError(
        "Runtime Error",
        `Repeat count cannot be negative (${countVal})`,
        stmt.count.loc,
        this.source
      );
    }

    let lastValue: MiniValue = null;
    this.loopDepth++;
    try {
      for (let i = 0; i < countVal; i++) {
        this.checkIterationLimit(i, stmt.loc);
        try {
          lastValue = this.executeBlock(stmt.body, env);
        } catch (sig) {
          if (sig instanceof LoopSignal) {
            if (sig.action === "stop") break;
            if (sig.action === "skip") continue;
          }
          throw sig;
        }
      }
    } finally {
      this.loopDepth--;
    }

    return lastValue;
  }

  private executeWhile(stmt: WhileStmt, env: Environment): MiniValue {
    let lastValue: MiniValue = null;
    let iterations = 0;

    this.loopDepth++;
    try {
      while (isTruthy(this.evaluator.evaluate(stmt.condition, env))) {
        this.checkIterationLimit(iterations++, stmt.loc);
        try {
          lastValue = this.executeBlock(stmt.body, env);
        } catch (sig) {
          if (sig instanceof LoopSignal) {
            if (sig.action === "stop") break;
            if (sig.action === "skip") continue;
          }
          throw sig;
        }
      }
    } finally {
      this.loopDepth--;
    }

    return lastValue;
  }

  private executeForRange(stmt: ForRangeStmt, env: Environment): MiniValue {
    const startVal = this.evaluator.evaluate(stmt.start, env);
    const endVal = this.evaluator.evaluate(stmt.end, env);

    if (typeof startVal !== "number" || typeof endVal !== "number") {
      throw new RuntimeError(
        "Type Error",
        `'for' loop range bounds must be numbers, got ${getMiniTypeName(startVal)} and ${getMiniTypeName(endVal)}`,
        stmt.loc,
        this.source
      );
    }

    let stepVal: number;
    if (stmt.step !== null) {
      const evaluatedStep = this.evaluator.evaluate(stmt.step, env);
      if (typeof evaluatedStep !== "number") {
        throw new RuntimeError(
          "Type Error",
          `'for' loop step must be a number, got ${getMiniTypeName(evaluatedStep)}`,
          stmt.step.loc,
          this.source
        );
      }
      if (evaluatedStep === 0) {
        throw new RuntimeError(
          "Runtime Error",
          `'for' loop step cannot be zero`,
          stmt.step.loc,
          this.source
        );
      }
      stepVal = evaluatedStep;
    } else {
      stepVal = startVal <= endVal ? 1 : -1;
    }

    let lastValue: MiniValue = null;
    let iterations = 0;
    const loopEnv = new Environment(env, this.source);

    this.loopDepth++;
    try {
      for (
        let current = startVal;
        stepVal > 0 ? current <= endVal : current >= endVal;
        current += stepVal
      ) {
        this.checkIterationLimit(iterations++, stmt.loc);
        loopEnv.defineLocal(stmt.variable, current);
        try {
          lastValue = this.executeBlock(stmt.body, loopEnv);
        } catch (sig) {
          if (sig instanceof LoopSignal) {
            if (sig.action === "stop") break;
            if (sig.action === "skip") continue;
          }
          throw sig;
        }
      }
    } finally {
      this.loopDepth--;
    }

    return lastValue;
  }

  private executeForEach(stmt: ForEachStmt, env: Environment): MiniValue {
    const iterableVal = this.evaluator.evaluate(stmt.iterable, env);

    let items: MiniValue[];
    if (Array.isArray(iterableVal)) {
      items = iterableVal;
    } else if (typeof iterableVal === "string") {
      items = Array.from(iterableVal);
    } else {
      throw new RuntimeError(
        "Type Error",
        `Cannot iterate over ${getMiniTypeName(iterableVal)} (${formatMiniValue(iterableVal)})`,
        stmt.iterable.loc,
        this.source,
        `'for each' requires a list or a string.`
      );
    }

    let lastValue: MiniValue = null;
    const loopEnv = new Environment(env, this.source);

    this.loopDepth++;
    try {
      for (let i = 0; i < items.length; i++) {
        this.checkIterationLimit(i, stmt.loc);
        loopEnv.defineLocal(stmt.variable, items[i]);
        try {
          lastValue = this.executeBlock(stmt.body, loopEnv);
        } catch (sig) {
          if (sig instanceof LoopSignal) {
            if (sig.action === "stop") break;
            if (sig.action === "skip") continue;
          }
          throw sig;
        }
      }
    } finally {
      this.loopDepth--;
    }

    return lastValue;
  }

  private executeLoopControl(stmt: LoopControlStmt): never {
    if (this.loopDepth === 0) {
      throw new RuntimeError(
        "Runtime Error",
        `'${stmt.action}' cannot be used outside of a loop`,
        stmt.loc,
        this.source,
        `Use '${stmt.action}' inside a 'repeat', 'while', or 'for' loop.`
      );
    }
    throw new LoopSignal(stmt.action, stmt.loc);
  }

  private executeBlock(statements: Stmt[], env: Environment): MiniValue {
    let lastValue: MiniValue = null;
    for (const stmt of statements) {
      lastValue = this.executeStatement(stmt, env);
    }
    return lastValue;
  }

  private executeUserFunction(
    fn: MiniUserFunction,
    args: MiniValue[],
    callLoc: SourceLocation
  ): MiniValue {
    if (this.callDepth >= this.maxCallDepth) {
      throw new RuntimeError(
        "Runtime Error",
        `Maximum function call depth (${this.maxCallDepth}) exceeded in '${fn.name}'`,
        callLoc,
        this.source,
        `Check for infinite recursion in '${fn.name}' (make sure there is a base case).`
      );
    }

    const fnEnv = new Environment(fn.closure, this.source);
    for (let i = 0; i < fn.params.length; i++) {
      fnEnv.defineLocal(fn.params[i], args[i]);
    }

    this.callDepth++;
    try {
      let lastValue: MiniValue = null;
      for (const stmt of fn.body) {
        lastValue = this.executeStatement(stmt, fnEnv);
      }
      return lastValue;
    } catch (sig) {
      if (sig instanceof GiveSignal) {
        return sig.value;
      }
      throw sig;
    } finally {
      this.callDepth--;
    }
  }

  private checkIterationLimit(iteration: number, loc: SourceLocation): void {
    if (iteration >= this.maxLoopIterations) {
      throw new RuntimeError(
        "Runtime Error",
        `Loop exceeded maximum iteration limit (${this.maxLoopIterations})`,
        loc,
        this.source,
        `Check your loop condition to make sure the loop eventually terminates.`
      );
    }
    this.checkTimeLimit(loc);
  }

  private checkTimeLimit(loc: SourceLocation): void {
    if (
      this.maxExecutionTimeMs > 0 &&
      this.executionStartTime > 0 &&
      Date.now() - this.executionStartTime > this.maxExecutionTimeMs
    ) {
      throw new RuntimeError(
        "Runtime Error",
        `Execution timed out after ${this.maxExecutionTimeMs}ms`,
        loc,
        this.source,
        `Optimize long-running loops/recursion or increase the timeout with --timeout <ms>.`
      );
    }
  }

  private registerBuiltins(): void {
    const def = (
      name: string,
      minArgs: number,
      maxArgs: number,
      fn: (args: MiniValue[], loc: SourceLocation, src: string) => MiniValue
    ) => {
      this.globalEnv.defineFunction(name, {
        kind: "builtin",
        name,
        minArgs,
        maxArgs,
        fn,
      });
    };

    const requireNum = (
      val: MiniValue,
      fnName: string,
      loc: SourceLocation,
      src: string
    ): number => {
      if (typeof val !== "number") {
        throw new RuntimeError(
          "Type Error",
          `Function '${fnName}' expects a number, but got ${getMiniTypeName(val)} (${formatMiniValue(val)})`,
          loc,
          src
        );
      }
      return val;
    };

    const requireStr = (
      val: MiniValue,
      fnName: string,
      loc: SourceLocation,
      src: string
    ): string => {
      if (typeof val !== "string") {
        throw new RuntimeError(
          "Type Error",
          `Function '${fnName}' expects a string, but got ${getMiniTypeName(val)} (${formatMiniValue(val)})`,
          loc,
          src
        );
      }
      return val;
    };

    def("abs", 1, 1, ([x], loc, src) => Math.abs(requireNum(x, "abs", loc, src)));
    def("round", 1, 2, ([x, decimals], loc, src) => {
      const n = requireNum(x, "round", loc, src);
      if (decimals === undefined) return Math.round(n);
      const d = requireNum(decimals, "round", loc, src);
      const factor = Math.pow(10, d);
      return Math.round(n * factor) / factor;
    });
    def("floor", 1, 1, ([x], loc, src) =>
      Math.floor(requireNum(x, "floor", loc, src))
    );
    def("ceil", 1, 1, ([x], loc, src) =>
      Math.ceil(requireNum(x, "ceil", loc, src))
    );
    def("sqrt", 1, 1, ([x], loc, src) => {
      const n = requireNum(x, "sqrt", loc, src);
      if (n < 0) {
        throw new RuntimeError(
          "Runtime Error",
          `Cannot compute square root of negative number (${n})`,
          loc,
          src
        );
      }
      return Math.sqrt(n);
    });
    def("min", 1, 64, (args, loc, src) => {
      const list =
        args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (list.length === 0) {
        throw new RuntimeError(
          "Argument Error",
          `'min' cannot be called on an empty list`,
          loc,
          src
        );
      }
      const nums = list.map((v) => requireNum(v, "min", loc, src));
      return Math.min(...nums);
    });
    def("max", 1, 64, (args, loc, src) => {
      const list =
        args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (list.length === 0) {
        throw new RuntimeError(
          "Argument Error",
          `'max' cannot be called on an empty list`,
          loc,
          src
        );
      }
      const nums = list.map((v) => requireNum(v, "max", loc, src));
      return Math.max(...nums);
    });

    def("upper", 1, 1, ([s], loc, src) =>
      requireStr(s, "upper", loc, src).toUpperCase()
    );
    def("lower", 1, 1, ([s], loc, src) =>
      requireStr(s, "lower", loc, src).toLowerCase()
    );
    def("trim", 1, 1, ([s], loc, src) =>
      requireStr(s, "trim", loc, src).trim()
    );
    def("split", 2, 2, ([s, sep], loc, src) =>
      requireStr(s, "split", loc, src).split(requireStr(sep, "split", loc, src))
    );
    def("join", 1, 2, ([list, sep], loc, src) => {
      if (!Array.isArray(list)) {
        throw new RuntimeError(
          "Type Error",
          `Function 'join' expects a list as first argument, got ${getMiniTypeName(list)}`,
          loc,
          src
        );
      }
      const separator =
        sep !== undefined ? requireStr(sep, "join", loc, src) : ", ";
      return list.map((item) => formatMiniValue(item)).join(separator);
    });

    def("length", 1, 1, ([x], loc, src) => {
      if (Array.isArray(x) || typeof x === "string") return x.length;
      throw new RuntimeError(
        "Type Error",
        `Function 'length' expects a list or string, got ${getMiniTypeName(x)}`,
        loc,
        src
      );
    });

    def("range", 2, 3, ([start, end, step], loc, src) => {
      const s = requireNum(start, "range", loc, src);
      const e = requireNum(end, "range", loc, src);
      const st =
        step !== undefined
          ? requireNum(step, "range", loc, src)
          : s <= e
          ? 1
          : -1;
      if (st === 0) {
        throw new RuntimeError(
          "Argument Error",
          `Function 'range' step cannot be 0`,
          loc,
          src
        );
      }
      const result: number[] = [];
      for (let i = s; st > 0 ? i <= e : i >= e; i += st) {
        result.push(i);
      }
      return result;
    });

    def("type", 1, 1, ([x]) => getMiniTypeName(x));
    def("text", 1, 1, ([x]) => formatMiniValue(x));
    def("number", 1, 1, ([x], loc, src) => {
      const parsed = Number(x);
      if (Number.isNaN(parsed)) {
        throw new RuntimeError(
          "Type Error",
          `Cannot convert '${formatMiniValue(x)}' to a number`,
          loc,
          src
        );
      }
      return parsed;
    });
  }
}

