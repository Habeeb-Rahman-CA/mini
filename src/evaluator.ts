import {
  BinaryExpr,
  CallExpr,
  Expr,
  IndexExpr,
  ListExpr,
  UnaryExpr,
} from "./ast.js";
import {
  Environment,
  formatMiniValue,
  getMiniTypeName,
  isEqual,
  isTruthy,
  MiniUserFunction,
  MiniValue,
} from "./environment.js";
import { RuntimeError } from "./errors.js";
import { SourceLocation } from "./tokens.js";

export type UserFunctionInvoker = (
  fn: MiniUserFunction,
  args: MiniValue[],
  callLoc: SourceLocation
) => MiniValue;

export class Evaluator {
  private readonly source: string;
  private readonly invokeUserFunction: UserFunctionInvoker;

  constructor(source: string, invokeUserFunction: UserFunctionInvoker) {
    this.source = source;
    this.invokeUserFunction = invokeUserFunction;
  }

  public evaluate(expr: Expr, env: Environment): MiniValue {
    switch (expr.kind) {
      case "LiteralExpr":
        return expr.value;

      case "IdentifierExpr":
        return env.get(expr.name, expr.loc);

      case "ListExpr":
        return this.evalList(expr, env);

      case "IndexExpr":
        return this.evalIndex(expr, env);

      case "UnaryExpr":
        return this.evalUnary(expr, env);

      case "BinaryExpr":
        return this.evalBinary(expr, env);

      case "CallExpr":
        return this.evalCall(expr, env);
    }
  }

  private evalList(expr: ListExpr, env: Environment): MiniValue[] {
    return expr.elements.map((el) => this.evaluate(el, env));
  }

  private evalIndex(expr: IndexExpr, env: Environment): MiniValue {
    const target = this.evaluate(expr.target, env);
    const indexVal = this.evaluate(expr.index, env);

    if (typeof indexVal !== "number" || !Number.isInteger(indexVal)) {
      throw new RuntimeError(
        "Type Error",
        `Index must be an integer, but got ${getMiniTypeName(indexVal)} (${formatMiniValue(indexVal)})`,
        expr.index.loc,
        this.source,
        `Use a whole number index starting at 0, e.g. items at 0.`
      );
    }

    if (Array.isArray(target) || typeof target === "string") {
      const normalizedIndex =
        indexVal < 0 ? target.length + indexVal : indexVal;
      if (normalizedIndex < 0 || normalizedIndex >= target.length) {
        throw new RuntimeError(
          "Index Error",
          `Index ${indexVal} is out of bounds for ${getMiniTypeName(target)} of length ${target.length}`,
          expr.loc,
          this.source,
          target.length === 0
            ? `The ${getMiniTypeName(target)} is empty.`
            : `Valid indices are from 0 to ${target.length - 1} (or -${target.length} to -1).`
        );
      }
      return target[normalizedIndex];
    }

    throw new RuntimeError(
      "Type Error",
      `Cannot index into a value of type '${getMiniTypeName(target)}'`,
      expr.loc,
      this.source,
      `Indexing ('at' or '[...]') is only supported on lists and strings.`
    );
  }

  private evalUnary(expr: UnaryExpr, env: Environment): MiniValue {
    const val = this.evaluate(expr.operand, env);

    switch (expr.operator) {
      case "-": {
        if (typeof val !== "number") {
          throw new RuntimeError(
            "Type Error",
            `Cannot negate a ${getMiniTypeName(val)} (${formatMiniValue(val)})`,
            expr.loc,
            this.source,
            `The '-' (or 'negative') operator requires a number.`
          );
        }
        return -val;
      }

      case "not":
        return !isTruthy(val);

      case "length": {
        if (Array.isArray(val) || typeof val === "string") {
          return val.length;
        }
        throw new RuntimeError(
          "Type Error",
          `Cannot get 'length of' a ${getMiniTypeName(val)} (${formatMiniValue(val)})`,
          expr.loc,
          this.source,
          `'length of' works on strings and lists.`
        );
      }
    }
  }

  private evalBinary(expr: BinaryExpr, env: Environment): MiniValue {
    // Short-circuit logical operators
    if (expr.operator === "and") {
      const left = this.evaluate(expr.left, env);
      if (!isTruthy(left)) return false;
      return isTruthy(this.evaluate(expr.right, env));
    }

    if (expr.operator === "or") {
      const left = this.evaluate(expr.left, env);
      if (isTruthy(left)) return true;
      return isTruthy(this.evaluate(expr.right, env));
    }

    const left = this.evaluate(expr.left, env);
    const right = this.evaluate(expr.right, env);

    switch (expr.operator) {
      case "==":
        return isEqual(left, right);

      case "!=":
        return !isEqual(left, right);

      case "+": {
        if (typeof left === "number" && typeof right === "number") {
          return left + right;
        }
        if (typeof left === "string" || typeof right === "string") {
          return formatMiniValue(left) + formatMiniValue(right);
        }
        if (Array.isArray(left) && Array.isArray(right)) {
          return [...left, ...right];
        }
        throw new RuntimeError(
          "Type Error",
          `Cannot add ${getMiniTypeName(left)} and ${getMiniTypeName(right)}`,
          expr.loc,
          this.source,
          `Addition works on numbers, strings, or two lists.`
        );
      }

      case "-": {
        this.assertNumbers(left, right, "-", expr.loc);
        return (left as number) - (right as number);
      }

      case "*": {
        if (typeof left === "string" && typeof right === "number") {
          if (right < 0 || !Number.isInteger(right)) {
            throw new RuntimeError(
              "Type Error",
              `String repetition count must be a non-negative integer, got ${right}`,
              expr.loc,
              this.source
            );
          }
          return left.repeat(right);
        }
        this.assertNumbers(left, right, "*", expr.loc);
        return (left as number) * (right as number);
      }

      case "/": {
        this.assertNumbers(left, right, "/", expr.loc);
        if ((right as number) === 0) {
          throw new RuntimeError(
            "Zero Division Error",
            `Cannot divide ${formatMiniValue(left)} by zero`,
            expr.right.loc,
            this.source,
            `Check that the divisor is not 0 before dividing.`
          );
        }
        return (left as number) / (right as number);
      }

      case "%": {
        this.assertNumbers(left, right, "%", expr.loc);
        if ((right as number) === 0) {
          throw new RuntimeError(
            "Zero Division Error",
            `Cannot compute remainder when dividing by zero`,
            expr.right.loc,
            this.source,
            `Check that the divisor is not 0.`
          );
        }
        return (left as number) % (right as number);
      }

      case "^": {
        this.assertNumbers(left, right, "^", expr.loc);
        return Math.pow(left as number, right as number);
      }

      case ">": {
        this.assertComparable(left, right, ">", expr.loc);
        return (left as number | string) > (right as number | string);
      }

      case "<": {
        this.assertComparable(left, right, "<", expr.loc);
        return (left as number | string) < (right as number | string);
      }

      case ">=": {
        this.assertComparable(left, right, ">=", expr.loc);
        return (left as number | string) >= (right as number | string);
      }

      case "<=": {
        this.assertComparable(left, right, "<=", expr.loc);
        return (left as number | string) <= (right as number | string);
      }
    }
  }

  private evalCall(expr: CallExpr, env: Environment): MiniValue {
    const callable = env.getFunction(expr.callee, expr.loc);
    const evaluatedArgs = expr.args.map((arg) => this.evaluate(arg, env));

    if (callable.kind === "builtin") {
      if (
        evaluatedArgs.length < callable.minArgs ||
        evaluatedArgs.length > callable.maxArgs
      ) {
        const expectedDesc =
          callable.minArgs === callable.maxArgs
            ? `${callable.minArgs} argument${callable.minArgs === 1 ? "" : "s"}`
            : `${callable.minArgs} to ${callable.maxArgs} arguments`;
        throw new RuntimeError(
          "Argument Error",
          `Built-in function '${callable.name}' expects ${expectedDesc}, but got ${evaluatedArgs.length}`,
          expr.loc,
          this.source
        );
      }
      return callable.fn(evaluatedArgs, expr.loc, this.source);
    }

    if (evaluatedArgs.length !== callable.params.length) {
      throw new RuntimeError(
        "Argument Error",
        `Function '${callable.name}' expects ${callable.params.length} argument${
          callable.params.length === 1 ? "" : "s"
        } (${callable.params.join(", ")}), but got ${evaluatedArgs.length}`,
        expr.loc,
        this.source,
        `Call '${callable.name}' with ${callable.params.length} value${
          callable.params.length === 1 ? "" : "s"
        }.`
      );
    }

    return this.invokeUserFunction(callable, evaluatedArgs, expr.loc);
  }

  private assertNumbers(
    left: MiniValue,
    right: MiniValue,
    op: string,
    loc: SourceLocation
  ): void {
    if (typeof left !== "number" || typeof right !== "number") {
      throw new RuntimeError(
        "Type Error",
        `Operator '${op}' requires numbers, but got ${getMiniTypeName(left)} (${formatMiniValue(left)}) and ${getMiniTypeName(right)} (${formatMiniValue(right)})`,
        loc,
        this.source,
        `Convert values to numbers or check variable types.`
      );
    }
  }

  private assertComparable(
    left: MiniValue,
    right: MiniValue,
    op: string,
    loc: SourceLocation
  ): void {
    const bothNumbers = typeof left === "number" && typeof right === "number";
    const bothStrings = typeof left === "string" && typeof right === "string";
    if (!bothNumbers && !bothStrings) {
      throw new RuntimeError(
        "Type Error",
        `Cannot compare ${getMiniTypeName(left)} (${formatMiniValue(left)}) and ${getMiniTypeName(right)} (${formatMiniValue(right)}) with '${op}'`,
        loc,
        this.source,
        `Comparison operators ('>', '<', '>=', '<=') require two numbers or two strings.`
      );
    }
  }
}

