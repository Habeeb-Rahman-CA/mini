import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  Lexer,
  LexerError,
  MiniError,
  ParseError,
  Parser,
  runMini,
  RuntimeError,
  TokenType,
} from "../src/index.js";

function evalProgram(code: string): string[] {
  const outputs: string[] = [];
  runMini(code, { onOutput: (line) => outputs.push(line) });
  return outputs;
}

describe("Mini Programming Language", () => {
  it("executes the exact example from the specification", () => {
    const code = `
make add(a, b) = a + b
assign x to the total of 10 and 5
show add(x, 2)
`;
    const outputs = evalProgram(code);
    assert.deepEqual(outputs, ["17"]);
  });

  describe("Lexer", () => {
    it("tokenizes keywords, identifiers, numbers, strings, and multi-word phrases", () => {
      const lexer = new Lexer(
        `assign x to 10\nif x is greater than 5 then show "yes"`,
        "test.mini"
      );
      const tokens = lexer.tokenize();
      const types = tokens.map((t) => t.type);
      assert.deepEqual(types, [
        TokenType.ASSIGN,
        TokenType.IDENTIFIER,
        TokenType.TO,
        TokenType.NUMBER,
        TokenType.NEWLINE,
        TokenType.IF,
        TokenType.IDENTIFIER,
        TokenType.GT,
        TokenType.NUMBER,
        TokenType.THEN,
        TokenType.SHOW,
        TokenType.STRING,
        TokenType.EOF,
      ]);
    });

    it("supports #, //, and note: comments", () => {
      const code = `
# Hash comment
// Slash comment
note: English note comment
show 42
`;
      assert.deepEqual(evalProgram(code), ["42"]);
    });

    it("throws a helpful LexerError on unterminated strings", () => {
      assert.throws(
        () => evalProgram(`show "unterminated`),
        (err: unknown) => {
          assert.ok(err instanceof LexerError);
          const formatted = err.format();
          assert.match(formatted, /Lexer Error: Unterminated string literal/);
          assert.match(formatted, /Hint:/);
          return true;
        }
      );
    });
  });

  describe("Parser & AST", () => {
    it("produces a valid AST with FunctionDeclStmt, AssignStmt, and ShowStmt", () => {
      const code = `
make add(a, b) = a + b
assign x to the total of 10 and 5
show add(x, 2)
`;
      const tokens = new Lexer(code).tokenize();
      const ast = new Parser(tokens, code).parse();
      assert.equal(ast.kind, "Program");
      assert.equal(ast.body.length, 3);
      assert.equal(ast.body[0].kind, "FunctionDeclStmt");
      assert.equal(ast.body[1].kind, "AssignStmt");
      assert.equal(ast.body[2].kind, "ShowStmt");
    });

    it("throws a helpful ParseError when a block is missing 'end'", () => {
      const code = `
if 10 is greater than 5
  show "missing end"
`;
      assert.throws(
        () => evalProgram(code),
        (err: unknown) => {
          assert.ok(err instanceof ParseError);
          assert.match(err.format(), /Syntax Error: Unclosed 'if' block/);
          assert.match(err.format(), /Add 'end'/);
          return true;
        }
      );
    });
  });

  describe("Variables & Arithmetic (Expression Evaluator)", () => {
    it("supports prefix natural-English arithmetic phrases", () => {
      const code = `
show the total of 10 and 5
show the sum of 7 and 8
show the difference of 20 and 6
show the product of 6 and 7
show the quotient of 45 and 9
show the remainder of 17 and 5
`;
      assert.deepEqual(evalProgram(code), ["15", "15", "14", "42", "5", "2"]);
    });

    it("supports infix English and symbolic operators with proper precedence", () => {
      const code = `
show 2 plus 3 times 4
show (2 plus 3) multiplied by 4
show 100 divided by 4 minus 5
show 2 to the power of 10
show 17 modulo 5
`;
      assert.deepEqual(evalProgram(code), ["14", "20", "20", "1024", "2"]);
    });

    it("supports multiple variable assignment styles and in-place mutations", () => {
      const code = `
assign a to 10
set b to 20
let c be 30
d = 40
increase a by 5
decrease b by 3
show a, b, c, d
`;
      assert.deepEqual(evalProgram(code), ["15 17 30 40"]);
    });

    it("allows contextual words like 'total' or 'sum' as variable names", () => {
      const code = `
assign total to the total of 100 and 50
increase total by 25
show total
`;
      assert.deepEqual(evalProgram(code), ["175"]);
    });
  });

  describe("Conditionals", () => {
    it("evaluates multi-line if / otherwise if / otherwise blocks", () => {
      const code = `
make classify(score)
  if score is at least 90
    give "A"
  otherwise if score is at least 80
    give "B"
  otherwise if score is at least 70
    give "C"
  otherwise
    give "F"
  end
end

show classify(95)
show classify(82)
show classify(70)
show classify(50)
`;
      assert.deepEqual(evalProgram(code), ["A", "B", "C", "F"]);
    });

    it("evaluates single-line if ... then ... otherwise statements", () => {
      const code = `
assign x to 10
if x is equal to 10 then show "ten" otherwise show "not ten"
if x is less than 5 then show "small" otherwise show "large"
`;
      assert.deepEqual(evalProgram(code), ["ten", "large"]);
    });

    it("supports compound conditions with 'and', 'or', and 'not'", () => {
      const code = `
assign age to 25
assign has_ticket to true
if age is at least 18 and has_ticket
  show "allowed"
end
if not false and (10 is less than 5 or 20 is greater than 10)
  show "compound ok"
end
`;
      assert.deepEqual(evalProgram(code), ["allowed", "compound ok"]);
    });
  });

  describe("Functions & Recursion", () => {
    it("supports single-line, multi-line, and recursive functions", () => {
      const code = `
make square(n) = n * n

make factorial(n)
  if n is at most 1
    give 1
  end
  give n * factorial(n - 1)
end

show square(9)
show factorial(5)
`;
      assert.deepEqual(evalProgram(code), ["81", "120"]);
    });
  });

  describe("Loops", () => {
    it("executes 'repeat N times' loops", () => {
      const code = `
assign count to 0
repeat 4 times
  increase count by 3
end
show count
`;
      assert.deepEqual(evalProgram(code), ["12"]);
    });

    it("executes 'while' loops", () => {
      const code = `
assign n to 1
while n is less than 32
  assign n to n * 2
end
show n
`;
      assert.deepEqual(evalProgram(code), ["32"]);
    });

    it("executes 'for ... from ... to ...' loops with default and custom steps", () => {
      const code = `
assign sum to 0
for i from 1 to 5
  increase sum by i
end
show sum

assign countdown to []
for k from 6 to 2 by -2
  push k to countdown
end
show join(countdown, "-")
`;
      assert.deepEqual(evalProgram(code), ["15", "6-4-2"]);
    });

    it("executes 'for each' loops and 'stop' / 'skip' loop controls", () => {
      const code = `
assign nums to list of 1, 2, 3, 4, 5, 6, 7
assign kept to []

for each n in nums
  if n is equal to 2
    skip
  end
  if n is equal to 6
    stop
  end
  push n to kept
end

show join(kept, ",")
`;
      assert.deepEqual(evalProgram(code), ["1,3,4,5"]);
    });
  });

  describe("Lists, Strings & Built-in Functions", () => {
    it("supports list indexing, mutation, length, and built-in helpers", () => {
      const code = `
assign fruits to list of "apple", "banana", "cherry"
show length of fruits
show fruits at 1
show fruits at -1
assign fruits at 1 to "blueberry"
show join(fruits, " | ")
show upper("mini"), min(10, 3, 8), max(10, 3, 8), sqrt(49)
`;
      assert.deepEqual(evalProgram(code), [
        "3",
        "banana",
        "cherry",
        "apple | blueberry | cherry",
        "MINI 3 10 7",
      ]);
    });
  });

  describe("Meaningful Error Messages", () => {
    it("suggests closest variable name on Name Error", () => {
      const code = `
assign total_price to 50
show total_pric
`;
      assert.throws(
        () => evalProgram(code),
        (err: unknown) => {
          assert.ok(err instanceof RuntimeError);
          assert.equal(err.category, "Name Error");
          assert.match(err.format(), /Did you mean 'total_price'\?/);
          return true;
        }
      );
    });

    it("reports Zero Division Error with source line and caret", () => {
      const code = `show 10 divided by 0`;
      assert.throws(
        () => evalProgram(code),
        (err: unknown) => {
          assert.ok(err instanceof RuntimeError);
          assert.equal(err.category, "Zero Division Error");
          assert.match(err.format(), /Cannot divide 10 by zero/);
          return true;
        }
      );
    });

    it("reports Argument Error when calling a function with wrong number of arguments", () => {
      const code = `
make add(a, b) = a + b
show add(1)
`;
      assert.throws(
        () => evalProgram(code),
        (err: unknown) => {
          assert.ok(err instanceof MiniError);
          assert.equal(err.category, "Argument Error");
          assert.match(err.format(), /Function 'add' expects 2 arguments/);
          return true;
        }
      );
    });
  });

  describe("Examples Directory Verification", () => {
    it("executes all .mini files in examples/ without errors", () => {
      const examplesDir = path.resolve(process.cwd(), "examples");
      const files = fs
        .readdirSync(examplesDir)
        .filter((f) => f.endsWith(".mini"));

      assert.ok(files.length >= 6, "Expected at least 6 example .mini files");

      for (const file of files) {
        const fullPath = path.join(examplesDir, file);
        const source = fs.readFileSync(fullPath, "utf-8");
        const outputs: string[] = [];
        runMini(source, {
          file,
          onOutput: (line) => outputs.push(line),
        });
        assert.ok(
          outputs.length > 0,
          `Example ${file} should produce output`
        );
      }
    });
  });
});

