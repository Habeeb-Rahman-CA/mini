import {
  AssignStmt,
  BinaryOperator,
  ConditionalBranch,
  Expr,
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
import { ParseError } from "./errors.js";
import { SourceLocation, Token, TokenType } from "./tokens.js";

const CONTEXTUAL_IDENTIFIER_TOKENS = new Set<TokenType>([
  TokenType.IDENTIFIER,
  TokenType.TOTAL,
  TokenType.DIFFERENCE,
  TokenType.PRODUCT,
  TokenType.QUOTIENT,
  TokenType.REMAINDER,
  TokenType.LENGTH,
  TokenType.LIST,
  TokenType.TIMES,
]);

export class Parser {
  private readonly tokens: Token[];
  private readonly source: string;
  private current: number = 0;

  constructor(tokens: Token[], source: string = "") {
    this.tokens = tokens;
    this.source = source;
  }

  public parse(): Program {
    const body: Stmt[] = [];
    this.skipNewlines();

    const startLoc: SourceLocation =
      this.tokens.length > 0
        ? this.tokens[0].loc
        : { file: "<stdin>", line: 1, column: 1, length: 1 };

    while (!this.isAtEnd()) {
      body.push(this.parseStatement());
      this.skipNewlines();
    }

    return {
      kind: "Program",
      body,
      loc: startLoc,
    };
  }

  // ==========================================================================
  // Statements
  // ==========================================================================

  private parseStatement(): Stmt {
    this.skipNewlines();
    const tok = this.peek();

    switch (tok.type) {
      case TokenType.MAKE:
        return this.parseFunctionDecl();

      case TokenType.ASSIGN:
      case TokenType.SET:
        return this.parseAssignOrSet();

      case TokenType.LET:
        return this.parseLet();

      case TokenType.INCREASE:
      case TokenType.DECREASE:
        return this.parseMutateNumber();

      case TokenType.PUSH:
        return this.parsePush();

      case TokenType.SHOW:
        return this.parseShow();

      case TokenType.GIVE:
        return this.parseGive();

      case TokenType.IF:
        return this.parseIf();

      case TokenType.REPEAT:
        return this.parseRepeat();

      case TokenType.WHILE:
        return this.parseWhile();

      case TokenType.FOR:
        return this.parseFor();

      case TokenType.STOP: {
        const stopTok = this.advance();
        this.expectStatementEnd("stop");
        const stmt: LoopControlStmt = {
          kind: "LoopControlStmt",
          action: "stop",
          loc: stopTok.loc,
        };
        return stmt;
      }

      case TokenType.SKIP: {
        const skipTok = this.advance();
        this.expectStatementEnd("skip");
        const stmt: LoopControlStmt = {
          kind: "LoopControlStmt",
          action: "skip",
          loc: skipTok.loc,
        };
        return stmt;
      }

      case TokenType.END:
        throw new ParseError(
          `Unexpected 'end' without a matching block`,
          tok.loc,
          this.source,
          `Remove this extra 'end' or check if an earlier 'if', 'repeat', 'while', 'for', or 'make' block was already closed.`
        );

      case TokenType.OTHERWISE:
        throw new ParseError(
          `Unexpected '${tok.lexeme}' outside of an 'if' statement`,
          tok.loc,
          this.source,
          `'${tok.lexeme}' must be inside an 'if ... end' block.`
        );

      default:
        // Check for direct assignment: `<name> = <expr>` or `<name>[<idx>] = <expr>` or `<name> at <idx> = <expr>`
        if (this.isContextualIdentifier(tok)) {
          const savedPos = this.current;
          const nameTok = this.advance();

          if (this.match(TokenType.EQUALS)) {
            const value = this.parseExpression();
            this.expectStatementEnd("assignment");
            return {
              kind: "AssignStmt",
              name: nameTok.lexeme,
              value,
              loc: nameTok.loc,
            };
          }

          if (this.match(TokenType.LBRACKET)) {
            const indexExpr = this.parseExpression();
            this.consume(
              TokenType.RBRACKET,
              "Expected ']' after list index",
              "Close the index with ']'."
            );
            if (this.match(TokenType.EQUALS, TokenType.TO)) {
              const value = this.parseExpression();
              this.expectStatementEnd("index assignment");
              return {
                kind: "AssignStmt",
                name: nameTok.lexeme,
                index: indexExpr,
                value,
                loc: nameTok.loc,
              };
            }
          }

          if (this.match(TokenType.AT)) {
            const indexExpr = this.parseUnary();
            if (this.match(TokenType.EQUALS, TokenType.TO)) {
              const value = this.parseExpression();
              this.expectStatementEnd("index assignment");
              return {
                kind: "AssignStmt",
                name: nameTok.lexeme,
                index: indexExpr,
                value,
                loc: nameTok.loc,
              };
            }
          }

          // Rewind and parse as expression statement
          this.current = savedPos;
        }

        return this.parseExpressionStatement();
    }
  }

  /**
   * Parses:
   *   make add(a, b) = a + b
   * or multi-line:
   *   make add(a, b) [do|:]
   *     ...
   *     give a + b
   *   end
   */
  private parseFunctionDecl(): FunctionDeclStmt {
    const makeTok = this.advance(); // consume 'make' / 'define'
    const nameTok = this.consumeIdentifier(
      "Expected a function name after 'make'",
      "Example: make add(a, b) = a + b"
    );

    const params: string[] = [];
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          const paramTok = this.consumeIdentifier(
            "Expected parameter name in function declaration",
            "Example: make add(a, b) = a + b"
          );
          params.push(paramTok.lexeme);
        } while (this.match(TokenType.COMMA));
      }
      this.consume(
        TokenType.RPAREN,
        "Expected ')' after function parameters",
        "Close the parameter list with ')'."
      );
    }

    // Single-line function: `make add(a, b) = a + b`
    if (this.match(TokenType.EQUALS)) {
      const expr = this.parseExpression();
      this.expectStatementEnd("function declaration");
      const giveStmt: GiveStmt = {
        kind: "GiveStmt",
        value: expr,
        loc: expr.loc,
      };
      return {
        kind: "FunctionDeclStmt",
        name: nameTok.lexeme,
        params,
        body: [giveStmt],
        isSingleExpr: true,
        loc: makeTok.loc,
      };
    }

    // Multi-line function: `make add(a, b) [do|:] ... end`
    this.match(TokenType.DO, TokenType.COLON);
    this.expectNewlineOrEOF("function header", "Use '=' for a one-line function (e.g. make add(a, b) = a + b) or start a multi-line body on the next line and close it with 'end'.");

    const body = this.parseBlockUntil([TokenType.END], makeTok);
    this.consume(
      TokenType.END,
      `Expected 'end' to close function '${nameTok.lexeme}'`,
      `Add 'end' after the body of '${nameTok.lexeme}'.`
    );
    this.expectStatementEnd("function declaration");

    return {
      kind: "FunctionDeclStmt",
      name: nameTok.lexeme,
      params,
      body,
      isSingleExpr: false,
      loc: makeTok.loc,
    };
  }

  /**
   * Parses:
   *   assign x to 10
   *   set x to 10
   *   assign items at 0 to 42
   *   assign items[0] to 42
   */
  private parseAssignOrSet(): AssignStmt {
    const kwTok = this.advance(); // 'assign' or 'set'
    const nameTok = this.consumeIdentifier(
      `Expected a variable name after '${kwTok.lexeme}'`,
      `Example: ${kwTok.lexeme} x to 10`
    );

    let indexExpr: Expr | undefined;
    if (this.match(TokenType.AT)) {
      indexExpr = this.parseUnary();
    } else if (this.match(TokenType.LBRACKET)) {
      indexExpr = this.parseExpression();
      this.consume(
        TokenType.RBRACKET,
        "Expected ']' after index expression",
        "Close the index with ']'."
      );
    }

    if (!this.match(TokenType.TO, TokenType.EQUALS, TokenType.BE)) {
      throw new ParseError(
        `Expected 'to' after variable '${nameTok.lexeme}' in '${kwTok.lexeme}' statement`,
        this.peek().loc,
        this.source,
        `Example: ${kwTok.lexeme} ${nameTok.lexeme} to 10`
      );
    }

    const value = this.parseExpression();
    this.expectStatementEnd("assignment");

    return {
      kind: "AssignStmt",
      name: nameTok.lexeme,
      index: indexExpr,
      value,
      loc: kwTok.loc,
    };
  }

  /**
   * Parses:
   *   let x be 10
   *   let x = 10
   *   let x to 10
   */
  private parseLet(): AssignStmt {
    const letTok = this.advance();
    const nameTok = this.consumeIdentifier(
      "Expected a variable name after 'let'",
      "Example: let x be 10"
    );

    if (!this.match(TokenType.BE, TokenType.EQUALS, TokenType.TO)) {
      throw new ParseError(
        `Expected 'be' or '=' after variable '${nameTok.lexeme}'`,
        this.peek().loc,
        this.source,
        `Example: let ${nameTok.lexeme} be 10`
      );
    }

    const value = this.parseExpression();
    this.expectStatementEnd("let statement");

    return {
      kind: "AssignStmt",
      name: nameTok.lexeme,
      value,
      loc: letTok.loc,
    };
  }

  /**
   * Parses:
   *   increase count by 1
   *   decrease score by 5
   */
  private parseMutateNumber(): MutateNumberStmt {
    const opTok = this.advance();
    const operator =
      opTok.type === TokenType.INCREASE ? "increase" : "decrease";
    const nameTok = this.consumeIdentifier(
      `Expected variable name after '${operator}'`,
      `Example: ${operator} count by 1`
    );

    let delta: Expr;
    if (this.match(TokenType.BY)) {
      delta = this.parseExpression();
    } else {
      // Default to 1 if 'by <expr>' is omitted, e.g., `increase count`
      delta = {
        kind: "LiteralExpr",
        value: 1,
        loc: opTok.loc,
      };
    }

    this.expectStatementEnd(`${operator} statement`);

    return {
      kind: "MutateNumberStmt",
      name: nameTok.lexeme,
      operator,
      delta,
      loc: opTok.loc,
    };
  }

  /**
   * Parses:
   *   push 42 to items
   */
  private parsePush(): PushStmt {
    const pushTok = this.advance();
    const value = this.parseExpression();

    if (!this.match(TokenType.TO, TokenType.IN)) {
      throw new ParseError(
        `Expected 'to' after value in 'push' statement`,
        this.peek().loc,
        this.source,
        `Example: push 42 to items`
      );
    }

    const targetTok = this.consumeIdentifier(
      "Expected list variable name after 'to'",
      "Example: push 42 to items"
    );

    this.expectStatementEnd("push statement");

    return {
      kind: "PushStmt",
      value,
      target: targetTok.lexeme,
      loc: pushTok.loc,
    };
  }

  /**
   * Parses:
   *   show add(x, 2)
   *   show "Result:", x
   */
  private parseShow(): ShowStmt {
    const showTok = this.advance();
    const values: Expr[] = [];

    if (!this.isStatementTerminator(this.peek())) {
      do {
        values.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    } else {
      throw new ParseError(
        `Expected an expression after '${showTok.lexeme}'`,
        showTok.loc,
        this.source,
        `Example: show "Hello, world!" or show x`
      );
    }

    this.expectStatementEnd("show statement");

    return {
      kind: "ShowStmt",
      values,
      loc: showTok.loc,
    };
  }

  /**
   * Parses:
   *   give a + b
   *   return x
   */
  private parseGive(): GiveStmt {
    const giveTok = this.advance();
    let value: Expr | null = null;

    if (!this.isStatementTerminator(this.peek())) {
      value = this.parseExpression();
    }

    this.expectStatementEnd("give statement");

    return {
      kind: "GiveStmt",
      value,
      loc: giveTok.loc,
    };
  }

  /**
   * Parses single-line and multi-line conditionals:
   *   if x is greater than 10 then show "big" otherwise show "small"
   * or:
   *   if x is greater than 10 [then|do|:]
   *     show "big"
   *   otherwise if x is 10 [then|do|:]
   *     show "ten"
   *   otherwise [do|:]
   *     show "small"
   *   end
   */
  private parseIf(): IfStmt {
    const ifTok = this.advance();
    const firstCondition = this.parseExpression();

    const hadConnector = this.match(
      TokenType.THEN,
      TokenType.DO,
      TokenType.COLON
    );

    // Check if single-line `if <cond> then <stmt> [otherwise <stmt>]`
    if (hadConnector && !this.isStatementTerminator(this.peek())) {
      const thenStmt = this.parseInlineStatement();
      const branches: ConditionalBranch[] = [
        {
          condition: firstCondition,
          body: [thenStmt],
          loc: ifTok.loc,
        },
      ];
      let elseBranch: Stmt[] | null = null;
      if (this.match(TokenType.OTHERWISE)) {
        const elseStmt = this.parseInlineStatement();
        elseBranch = [elseStmt];
      }
      this.expectStatementEnd("single-line if statement");
      return {
        kind: "IfStmt",
        branches,
        elseBranch,
        loc: ifTok.loc,
      };
    }

    // Multi-line `if ... end`
    this.expectNewlineOrEOF(
      "if condition",
      "Put the body of the 'if' block on the next line and close the block with 'end', or use 'then' for a single-line conditional."
    );

    const branches: ConditionalBranch[] = [];
    const firstBody = this.parseBlockUntil(
      [TokenType.OTHERWISE, TokenType.END],
      ifTok
    );
    branches.push({
      condition: firstCondition,
      body: firstBody,
      loc: ifTok.loc,
    });

    let elseBranch: Stmt[] | null = null;

    while (this.check(TokenType.OTHERWISE)) {
      const otherwiseTok = this.advance();
      if (this.match(TokenType.IF)) {
        const elifCond = this.parseExpression();
        this.match(TokenType.THEN, TokenType.DO, TokenType.COLON);
        this.expectNewlineOrEOF("otherwise if condition");
        const elifBody = this.parseBlockUntil(
          [TokenType.OTHERWISE, TokenType.END],
          otherwiseTok
        );
        branches.push({
          condition: elifCond,
          body: elifBody,
          loc: otherwiseTok.loc,
        });
      } else {
        this.match(TokenType.DO, TokenType.THEN, TokenType.COLON);
        this.expectNewlineOrEOF("otherwise");
        elseBranch = this.parseBlockUntil([TokenType.END], otherwiseTok);
        break;
      }
    }

    this.consume(
      TokenType.END,
      "Expected 'end' to close 'if' block",
      `Add 'end' to close the 'if' statement started on line ${ifTok.loc.line}.`
    );
    this.expectStatementEnd("if block");

    return {
      kind: "IfStmt",
      branches,
      elseBranch,
      loc: ifTok.loc,
    };
  }

  /**
   * Parses:
   *   repeat 5 times [do|:]
   *     ...
   *   end
   */
  private parseRepeat(): RepeatStmt {
    const repeatTok = this.advance();
    const count = this.parseExpression();
    this.match(TokenType.TIMES);
    this.match(TokenType.DO, TokenType.COLON);
    this.expectNewlineOrEOF(
      "repeat header",
      "Example:\n  repeat 5 times\n    show \"hello\"\n  end"
    );

    const body = this.parseBlockUntil([TokenType.END], repeatTok);
    this.consume(
      TokenType.END,
      "Expected 'end' to close 'repeat' loop",
      `Add 'end' to close the 'repeat' loop started on line ${repeatTok.loc.line}.`
    );
    this.expectStatementEnd("repeat loop");

    return {
      kind: "RepeatStmt",
      count,
      body,
      loc: repeatTok.loc,
    };
  }

  /**
   * Parses:
   *   while count is less than 5 [do|:]
   *     ...
   *   end
   */
  private parseWhile(): WhileStmt {
    const whileTok = this.advance();
    const condition = this.parseExpression();
    this.match(TokenType.DO, TokenType.COLON);
    this.expectNewlineOrEOF(
      "while condition",
      "Put the loop body on the next line and close it with 'end'."
    );

    const body = this.parseBlockUntil([TokenType.END], whileTok);
    this.consume(
      TokenType.END,
      "Expected 'end' to close 'while' loop",
      `Add 'end' to close the 'while' loop started on line ${whileTok.loc.line}.`
    );
    this.expectStatementEnd("while loop");

    return {
      kind: "WhileStmt",
      condition,
      body,
      loc: whileTok.loc,
    };
  }

  /**
   * Parses:
   *   for i from 1 to 10 [by 2] [do|:] ... end
   * or:
   *   for [each] item in items [do|:] ... end
   */
  private parseFor(): ForRangeStmt | ForEachStmt {
    const forTok = this.advance();
    const hasEach = this.match(TokenType.EACH);

    const varTok = this.consumeIdentifier(
      "Expected loop variable name after 'for'",
      "Example: for i from 1 to 5 or for each item in items"
    );

    if (this.match(TokenType.IN)) {
      const iterable = this.parseExpression();
      this.match(TokenType.DO, TokenType.COLON);
      this.expectNewlineOrEOF("for-each header");

      const body = this.parseBlockUntil([TokenType.END], forTok);
      this.consume(
        TokenType.END,
        "Expected 'end' to close 'for' loop",
        `Add 'end' to close the 'for' loop started on line ${forTok.loc.line}.`
      );
      this.expectStatementEnd("for loop");

      return {
        kind: "ForEachStmt",
        variable: varTok.lexeme,
        iterable,
        body,
        loc: forTok.loc,
      };
    }

    if (hasEach) {
      throw new ParseError(
        `Expected 'in' after '${varTok.lexeme}' in 'for each' loop`,
        this.peek().loc,
        this.source,
        `Example: for each ${varTok.lexeme} in items`
      );
    }

    if (!this.match(TokenType.FROM, TokenType.EQUALS)) {
      throw new ParseError(
        `Expected 'from' or 'in' after loop variable '${varTok.lexeme}'`,
        this.peek().loc,
        this.source,
        `Use 'for ${varTok.lexeme} from 1 to 10' or 'for each ${varTok.lexeme} in list'.`
      );
    }

    const start = this.parseExpression();
    this.consume(
      TokenType.TO,
      "Expected 'to' in 'for ... from <start> to <end>' loop",
      `Example: for ${varTok.lexeme} from 1 to 10`
    );
    const end = this.parseExpression();

    let step: Expr | null = null;
    if (this.match(TokenType.BY)) {
      step = this.parseExpression();
    }

    this.match(TokenType.DO, TokenType.COLON);
    this.expectNewlineOrEOF("for loop header");

    const body = this.parseBlockUntil([TokenType.END], forTok);
    this.consume(
      TokenType.END,
      "Expected 'end' to close 'for' loop",
      `Add 'end' to close the 'for' loop started on line ${forTok.loc.line}.`
    );
    this.expectStatementEnd("for loop");

    return {
      kind: "ForRangeStmt",
      variable: varTok.lexeme,
      start,
      end,
      step,
      body,
      loc: forTok.loc,
    };
  }

  private parseInlineStatement(): Stmt {
    const tok = this.peek();
    switch (tok.type) {
      case TokenType.ASSIGN:
      case TokenType.SET:
        return this.parseInlineAssign();
      case TokenType.SHOW:
        return this.parseInlineShow();
      case TokenType.GIVE:
        return this.parseInlineGive();
      case TokenType.INCREASE:
      case TokenType.DECREASE:
        return this.parseInlineMutate();
      case TokenType.STOP: {
        const t = this.advance();
        return { kind: "LoopControlStmt", action: "stop", loc: t.loc };
      }
      case TokenType.SKIP: {
        const t = this.advance();
        return { kind: "LoopControlStmt", action: "skip", loc: t.loc };
      }
      default: {
        const expr = this.parseExpression();
        return { kind: "ExprStmt", expression: expr, loc: expr.loc };
      }
    }
  }

  private parseInlineAssign(): AssignStmt {
    const kwTok = this.advance();
    const nameTok = this.consumeIdentifier(
      `Expected variable name after '${kwTok.lexeme}'`
    );
    this.consume(
      TokenType.TO,
      `Expected 'to' after '${nameTok.lexeme}'`,
      `Example: assign ${nameTok.lexeme} to 10`
    );
    const value = this.parseExpression();
    return {
      kind: "AssignStmt",
      name: nameTok.lexeme,
      value,
      loc: kwTok.loc,
    };
  }

  private parseInlineShow(): ShowStmt {
    const showTok = this.advance();
    const values: Expr[] = [this.parseExpression()];
    while (this.match(TokenType.COMMA)) {
      values.push(this.parseExpression());
    }
    return {
      kind: "ShowStmt",
      values,
      loc: showTok.loc,
    };
  }

  private parseInlineGive(): GiveStmt {
    const giveTok = this.advance();
    const value =
      this.isStatementTerminator(this.peek()) || this.check(TokenType.OTHERWISE)
        ? null
        : this.parseExpression();
    return {
      kind: "GiveStmt",
      value,
      loc: giveTok.loc,
    };
  }

  private parseInlineMutate(): MutateNumberStmt {
    const opTok = this.advance();
    const operator =
      opTok.type === TokenType.INCREASE ? "increase" : "decrease";
    const nameTok = this.consumeIdentifier(
      `Expected variable name after '${operator}'`
    );
    let delta: Expr = { kind: "LiteralExpr", value: 1, loc: opTok.loc };
    if (this.match(TokenType.BY)) {
      delta = this.parseExpression();
    }
    return {
      kind: "MutateNumberStmt",
      name: nameTok.lexeme,
      operator,
      delta,
      loc: opTok.loc,
    };
  }

  private parseExpressionStatement(): Stmt {
    const startTok = this.peek();
    const expr = this.parseExpression();

    // If there are leftover tokens on the same line after an identifier expression,
    // give a helpful syntax error rather than a generic message.
    if (!this.isStatementTerminator(this.peek())) {
      const leftover = this.peek();
      if (expr.kind === "IdentifierExpr") {
        throw new ParseError(
          `Unknown command or invalid statement starting with '${expr.name}'`,
          startTok.loc,
          this.source,
          `Valid commands include 'assign <var> to <value>', 'make <fn>(...) = ...', 'show <value>', 'if ...', 'repeat ...', 'while ...', 'for ...'.`
        );
      }
      throw new ParseError(
        `Unexpected '${leftover.lexeme}' after expression`,
        leftover.loc,
        this.source,
        `Check for a missing operator (like '+', 'and', 'is equal to') or put the next statement on a new line.`
      );
    }

    this.expectStatementEnd("expression");
    return {
      kind: "ExprStmt",
      expression: expr,
      loc: expr.loc,
    };
  }

  private parseBlockUntil(
    stopTokens: TokenType[],
    openingToken: Token
  ): Stmt[] {
    const statements: Stmt[] = [];
    this.skipNewlines();

    while (
      !this.isAtEnd() &&
      !stopTokens.some((type) => this.check(type))
    ) {
      statements.push(this.parseStatement());
      this.skipNewlines();
    }

    if (this.isAtEnd()) {
      throw new ParseError(
        `Unclosed '${openingToken.lexeme}' block starting on line ${openingToken.loc.line}`,
        openingToken.loc,
        this.source,
        `Add 'end' to close the '${openingToken.lexeme}' block.`
      );
    }

    return statements;
  }

  // ==========================================================================
  // Expressions (Recursive Descent with Operator Precedence)
  // ==========================================================================

  public parseExpression(): Expr {
    return this.parseOr();
  }

  private parseOr(): Expr {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = {
        kind: "BinaryExpr",
        operator: "or",
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parseAnd(): Expr {
    let left = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const right = this.parseEquality();
      left = {
        kind: "BinaryExpr",
        operator: "and",
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parseEquality(): Expr {
    let left = this.parseComparison();

    while (this.check(TokenType.EQ) || this.check(TokenType.NEQ)) {
      const opTok = this.advance();
      const operator: BinaryOperator =
        opTok.type === TokenType.EQ ? "==" : "!=";
      const right = this.parseComparison();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parseComparison(): Expr {
    let left = this.parseAdditive();

    while (
      this.check(TokenType.GT) ||
      this.check(TokenType.LT) ||
      this.check(TokenType.GTE) ||
      this.check(TokenType.LTE)
    ) {
      const opTok = this.advance();
      let operator: BinaryOperator;
      switch (opTok.type) {
        case TokenType.GT:
          operator = ">";
          break;
        case TokenType.LT:
          operator = "<";
          break;
        case TokenType.GTE:
          operator = ">=";
          break;
        case TokenType.LTE:
          operator = "<=";
          break;
        default:
          operator = ">";
      }
      const right = this.parseAdditive();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parseAdditive(): Expr {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const opTok = this.advance();
      const operator: BinaryOperator =
        opTok.type === TokenType.PLUS ? "+" : "-";
      const right = this.parseMultiplicative();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parseMultiplicative(): Expr {
    let left = this.parsePower();

    while (
      this.check(TokenType.STAR) ||
      this.check(TokenType.SLASH) ||
      this.check(TokenType.PERCENT) ||
      (this.check(TokenType.TIMES) && this.canStartExpression(this.peekNext()))
    ) {
      const opTok = this.advance();
      let operator: BinaryOperator;
      if (opTok.type === TokenType.STAR || opTok.type === TokenType.TIMES) {
        operator = "*";
      } else if (opTok.type === TokenType.SLASH) {
        operator = "/";
      } else {
        operator = "%";
      }
      const right = this.parsePower();
      left = {
        kind: "BinaryExpr",
        operator,
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parsePower(): Expr {
    const left = this.parseUnary();

    if (this.match(TokenType.CARET)) {
      const right = this.parsePower(); // right-associative
      return {
        kind: "BinaryExpr",
        operator: "^",
        left,
        right,
        loc: left.loc,
      };
    }

    return left;
  }

  private parseUnary(): Expr {
    if (this.match(TokenType.MINUS)) {
      const opTok = this.previous();
      const operand = this.parseUnary();
      return {
        kind: "UnaryExpr",
        operator: "-",
        operand,
        loc: opTok.loc,
      };
    }

    if (this.match(TokenType.NOT)) {
      const opTok = this.previous();
      const operand = this.parseUnary();
      return {
        kind: "UnaryExpr",
        operator: "not",
        operand,
        loc: opTok.loc,
      };
    }

    return this.parsePrefixEnglish();
  }

  /**
   * Handles natural-English prefix constructs:
   * - `[the] total of <expr> and <expr>`       -> a + b
   * - `[the] sum of <expr> and <expr>`         -> a + b
   * - `[the] difference of <expr> and <expr>`  -> a - b
   * - `[the] product of <expr> and <expr>`     -> a * b
   * - `[the] quotient of <expr> and <expr>`    -> a / b
   * - `[the] remainder of <expr> and <expr>`   -> a % b
   * - `[the] length of <expr>`                 -> length(x)
   * - `[the] list of <item1>, <item2>, ...`    -> [item1, item2, ...]
   */
  private parsePrefixEnglish(): Expr {
    // Strip optional article 'the' / 'a' / 'an'
    const hasThe = this.match(TokenType.THE);
    const startLoc = hasThe ? this.previous().loc : this.peek().loc;

    const current = this.peek();

    // Check for `<op> of <left> and <right>`
    if (
      (current.type === TokenType.TOTAL ||
        current.type === TokenType.DIFFERENCE ||
        current.type === TokenType.PRODUCT ||
        current.type === TokenType.QUOTIENT ||
        current.type === TokenType.REMAINDER) &&
      this.peekNext().type === TokenType.OF
    ) {
      const opTok = this.advance(); // consume total/difference/product/quotient/remainder
      this.advance(); // consume 'of'

      const left = this.parseAdditive();
      if (!this.match(TokenType.AND, TokenType.COMMA)) {
        throw new ParseError(
          `Expected 'and' between operands in '${opTok.lexeme} of ... and ...'`,
          this.peek().loc,
          this.source,
          `Example: the ${opTok.lexeme.toLowerCase()} of 10 and 5`
        );
      }
      const right = this.parseAdditive();

      let operator: BinaryOperator;
      switch (opTok.type) {
        case TokenType.TOTAL:
          operator = "+";
          break;
        case TokenType.DIFFERENCE:
          operator = "-";
          break;
        case TokenType.PRODUCT:
          operator = "*";
          break;
        case TokenType.QUOTIENT:
          operator = "/";
          break;
        case TokenType.REMAINDER:
          operator = "%";
          break;
        default:
          operator = "+";
      }

      return {
        kind: "BinaryExpr",
        operator,
        left,
        right,
        loc: startLoc,
      };
    }

    // Check for `[the] length of <expr>`
    if (
      current.type === TokenType.LENGTH &&
      this.peekNext().type === TokenType.OF
    ) {
      this.advance(); // consume 'length' / 'size'
      this.advance(); // consume 'of'
      const operand = this.parseUnary();
      return {
        kind: "UnaryExpr",
        operator: "length",
        operand,
        loc: startLoc,
      };
    }

    // Check for `[the] list of <item1>, <item2>, ...`
    if (
      current.type === TokenType.LIST &&
      this.peekNext().type === TokenType.OF
    ) {
      this.advance(); // consume 'list'
      this.advance(); // consume 'of'
      const elements: Expr[] = [];
      if (!this.isStatementTerminator(this.peek())) {
        do {
          elements.push(this.parseAdditive());
        } while (this.match(TokenType.COMMA));
      }
      return {
        kind: "ListExpr",
        elements,
        loc: startLoc,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expr {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.LBRACKET)) {
        const index = this.parseExpression();
        this.consume(
          TokenType.RBRACKET,
          "Expected ']' after index",
          "Close the index bracket with ']'."
        );
        expr = {
          kind: "IndexExpr",
          target: expr,
          index,
          loc: expr.loc,
        };
      } else if (this.match(TokenType.AT)) {
        const index = this.parsePower();
        expr = {
          kind: "IndexExpr",
          target: expr,
          index,
          loc: expr.loc,
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): Expr {
    const tok = this.peek();

    if (
      tok.type === TokenType.NUMBER ||
      tok.type === TokenType.STRING ||
      tok.type === TokenType.BOOLEAN ||
      tok.type === TokenType.NOTHING
    ) {
      this.advance();
      return {
        kind: "LiteralExpr",
        value: tok.literal ?? null,
        loc: tok.loc,
      };
    }

    // List literal: `[1, 2, 3]`
    if (this.match(TokenType.LBRACKET)) {
      const bracketTok = this.previous();
      const elements: Expr[] = [];
      this.skipNewlines();
      if (!this.check(TokenType.RBRACKET)) {
        do {
          this.skipNewlines();
          if (this.check(TokenType.RBRACKET)) break;
          elements.push(this.parseExpression());
          this.skipNewlines();
        } while (this.match(TokenType.COMMA));
      }
      this.consume(
        TokenType.RBRACKET,
        "Expected ']' to close list literal",
        "Add ']' at the end of the list."
      );
      return {
        kind: "ListExpr",
        elements,
        loc: bracketTok.loc,
      };
    }

    // Grouped expression: `(a + b)`
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(
        TokenType.RPAREN,
        "Expected ')' after grouped expression",
        "Add a closing ')'."
      );
      return expr;
    }

    // Identifier or Function Call: `x` or `add(x, 2)`
    if (this.isContextualIdentifier(tok)) {
      const identTok = this.advance();

      if (this.match(TokenType.LPAREN)) {
        const args: Expr[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(
          TokenType.RPAREN,
          `Expected ')' after arguments to '${identTok.lexeme}'`,
          `Close the function call '${identTok.lexeme}(...)' with ')'.`
        );
        return {
          kind: "CallExpr",
          callee: identTok.lexeme,
          args,
          loc: identTok.loc,
        };
      }

      return {
        kind: "IdentifierExpr",
        name: identTok.lexeme,
        loc: identTok.loc,
      };
    }

    throw new ParseError(
      `Expected a value or expression, but found '${tok.lexeme || "end of input"}'`,
      tok.loc,
      this.source,
      `Expressions can be numbers (10), strings ("hello"), variables (x), function calls (add(1, 2)), or English phrases (the total of 10 and 5).`
    );
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private isContextualIdentifier(tok: Token): boolean {
    return CONTEXTUAL_IDENTIFIER_TOKENS.has(tok.type);
  }

  private canStartExpression(tok: Token): boolean {
    return (
      tok.type === TokenType.NUMBER ||
      tok.type === TokenType.STRING ||
      tok.type === TokenType.BOOLEAN ||
      tok.type === TokenType.NOTHING ||
      tok.type === TokenType.LPAREN ||
      tok.type === TokenType.LBRACKET ||
      tok.type === TokenType.MINUS ||
      tok.type === TokenType.NOT ||
      tok.type === TokenType.THE ||
      this.isContextualIdentifier(tok)
    );
  }

  private consumeIdentifier(message: string, hint?: string): Token {
    const tok = this.peek();
    if (this.isContextualIdentifier(tok)) {
      return this.advance();
    }
    throw new ParseError(message, tok.loc, this.source, hint);
  }

  private isStatementTerminator(tok: Token): boolean {
    return (
      tok.type === TokenType.NEWLINE ||
      tok.type === TokenType.EOF ||
      tok.type === TokenType.END ||
      tok.type === TokenType.OTHERWISE
    );
  }

  private expectStatementEnd(context: string): void {
    if (this.isAtEnd()) return;
    if (this.match(TokenType.NEWLINE)) {
      this.skipNewlines();
      return;
    }
    if (this.check(TokenType.END) || this.check(TokenType.OTHERWISE)) {
      return;
    }
    const unexpected = this.peek();
    throw new ParseError(
      `Unexpected '${unexpected.lexeme}' after ${context}`,
      unexpected.loc,
      this.source,
      `Put the next statement on a new line or check your expression syntax.`
    );
  }

  private expectNewlineOrEOF(context: string, hint?: string): void {
    if (this.isAtEnd()) return;
    if (this.match(TokenType.NEWLINE)) {
      this.skipNewlines();
      return;
    }
    const unexpected = this.peek();
    throw new ParseError(
      `Expected a new line after ${context}, but found '${unexpected.lexeme}'`,
      unexpected.loc,
      this.source,
      hint
    );
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // keep consuming
    }
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string, hint?: string): Token {
    if (this.check(type)) return this.advance();
    const tok = this.peek();
    throw new ParseError(message, tok.loc, this.source, hint);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return type === TokenType.EOF;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private peekNext(): Token {
    if (this.current + 1 >= this.tokens.length) {
      return this.tokens[this.tokens.length - 1];
    }
    return this.tokens[this.current + 1];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}

