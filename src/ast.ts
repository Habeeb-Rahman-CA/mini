import { SourceLocation } from "./tokens.js";

export type BinaryOperator =
  | "+"
  | "-"
  | "*"
  | "/"
  | "%"
  | "^"
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "and"
  | "or";

export type UnaryOperator = "-" | "not" | "length";

// ============================================================================
// Expression Nodes
// ============================================================================

export interface LiteralExpr {
  kind: "LiteralExpr";
  value: number | string | boolean | null;
  loc: SourceLocation;
}

export interface IdentifierExpr {
  kind: "IdentifierExpr";
  name: string;
  loc: SourceLocation;
}

export interface UnaryExpr {
  kind: "UnaryExpr";
  operator: UnaryOperator;
  operand: Expr;
  loc: SourceLocation;
}

export interface BinaryExpr {
  kind: "BinaryExpr";
  operator: BinaryOperator;
  left: Expr;
  right: Expr;
  loc: SourceLocation;
}

export interface CallExpr {
  kind: "CallExpr";
  callee: string;
  args: Expr[];
  loc: SourceLocation;
}

export interface ListExpr {
  kind: "ListExpr";
  elements: Expr[];
  loc: SourceLocation;
}

export interface IndexExpr {
  kind: "IndexExpr";
  target: Expr;
  index: Expr;
  loc: SourceLocation;
}

export type Expr =
  | LiteralExpr
  | IdentifierExpr
  | UnaryExpr
  | BinaryExpr
  | CallExpr
  | ListExpr
  | IndexExpr;

// ============================================================================
// Statement Nodes
// ============================================================================

export interface Program {
  kind: "Program";
  body: Stmt[];
  loc: SourceLocation;
}

export interface AssignStmt {
  kind: "AssignStmt";
  name: string;
  index?: Expr;
  value: Expr;
  loc: SourceLocation;
}

export interface MutateNumberStmt {
  kind: "MutateNumberStmt";
  name: string;
  operator: "increase" | "decrease";
  delta: Expr;
  loc: SourceLocation;
}

export interface PushStmt {
  kind: "PushStmt";
  value: Expr;
  target: string;
  loc: SourceLocation;
}

export interface ShowStmt {
  kind: "ShowStmt";
  values: Expr[];
  loc: SourceLocation;
}

export interface FunctionDeclStmt {
  kind: "FunctionDeclStmt";
  name: string;
  params: string[];
  body: Stmt[];
  isSingleExpr: boolean;
  loc: SourceLocation;
}

export interface GiveStmt {
  kind: "GiveStmt";
  value: Expr | null;
  loc: SourceLocation;
}

export interface ConditionalBranch {
  condition: Expr;
  body: Stmt[];
  loc: SourceLocation;
}

export interface IfStmt {
  kind: "IfStmt";
  branches: ConditionalBranch[];
  elseBranch: Stmt[] | null;
  loc: SourceLocation;
}

export interface RepeatStmt {
  kind: "RepeatStmt";
  count: Expr;
  body: Stmt[];
  loc: SourceLocation;
}

export interface WhileStmt {
  kind: "WhileStmt";
  condition: Expr;
  body: Stmt[];
  loc: SourceLocation;
}

export interface ForRangeStmt {
  kind: "ForRangeStmt";
  variable: string;
  start: Expr;
  end: Expr;
  step: Expr | null;
  body: Stmt[];
  loc: SourceLocation;
}

export interface ForEachStmt {
  kind: "ForEachStmt";
  variable: string;
  iterable: Expr;
  body: Stmt[];
  loc: SourceLocation;
}

export interface LoopControlStmt {
  kind: "LoopControlStmt";
  action: "stop" | "skip";
  loc: SourceLocation;
}

export interface ExprStmt {
  kind: "ExprStmt";
  expression: Expr;
  loc: SourceLocation;
}

export type Stmt =
  | AssignStmt
  | MutateNumberStmt
  | PushStmt
  | ShowStmt
  | FunctionDeclStmt
  | GiveStmt
  | IfStmt
  | RepeatStmt
  | WhileStmt
  | ForRangeStmt
  | ForEachStmt
  | LoopControlStmt
  | ExprStmt;

