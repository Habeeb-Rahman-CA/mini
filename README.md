# Mini Programming Language (`minilang`)

[![CI](https://github.com/Habeeb-Rahman-CA/mini/actions/workflows/ci.yml/badge.svg)](https://github.com/Habeeb-Rahman-CA/mini/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)

**Mini (`minilang`)** is a readable, natural-English programming language implemented from scratch in TypeScript and Node.js (without `eval()`). It lets you write programs using clear, concise English phrases while seamlessly supporting familiar mathematical notation when you want it.

- **Documentation & Live Browser Playground**: [`docs/index.html`](docs/index.html) (`https://habeeb-rahman-ca.github.io/mini/`)
- **VS Code Extension**: [`editors/vscode-mini/`](editors/vscode-mini/)
- **Contributing Guide**: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Security Policy**: [`SECURITY.md`](SECURITY.md)

---

## Quick Example

```mini
make add(a, b) = a + b
assign x to the total of 10 and 5
show add(x, 2)
```

**Output:**
```text
17
```

---

## Installation & CLI Usage

### 1. Install Globally via npm

```bash
npm install -g minilang-eng
```

Once installed globally, both `minilang` and `mini` commands are available in any terminal across Linux, macOS, and Windows:

```bash
# Run a .mini file
minilang run examples/hello.mini
minilang examples/hello.mini

# Start the interactive REPL
minilang repl

# Check syntax without executing (with optional JSON output for tooling/IDEs)
minilang check examples/hello.mini
minilang check --json examples/hello.mini

# Evaluate inline Mini code
minilang -e 'assign x to the total of 10 and 5; show x'

# Inspect Lexer Tokens or Parsed AST
minilang --tokens examples/hello.mini
minilang --ast examples/hello.mini

# Configure safe execution limits
minilang --max-iterations 50000 --max-depth 500 --timeout 3000 run examples/hello.mini

# Show version or help
minilang --version
minilang --help
```

### 2. Local Development & Standalone Builds

```bash
# Clone & install dependencies
git clone https://github.com/Habeeb-Rahman-CA/mini.git
cd mini
npm install

# Compile TypeScript, browser playground bundle, and VS Code diagnostics engine
npm run build

# Run the automated test suite and validate all example programs
npm test
npm run check:examples

# Build single-file standalone CLI bundles (dist/standalone/minilang.mjs & .cjs)
npm run build:standalone
```

---

## Architecture Overview

Mini is built from scratch in TypeScript with a five-stage pipeline:

1. **Lexer ([`src/lexer.ts`](src/lexer.ts) & [`src/tokens.ts`](src/tokens.ts))**: Scans source text into tokens, tracks line/column source locations, handles comments (`#`, `//`, `note:`), and merges multi-word natural English operators (such as `is greater than`, `is equal to`, `divided by`, `to the power of`) into single semantic tokens.
2. **Parser & AST ([`src/parser.ts`](src/parser.ts) & [`src/ast.ts`](src/ast.ts))**: A recursive-descent parser with full operator precedence that constructs a strongly-typed Abstract Syntax Tree (`Program`, `Stmt`, `Expr`).
3. **Expression Evaluator ([`src/evaluator.ts`](src/evaluator.ts))**: Evaluates AST expression nodes (`LiteralExpr`, `IdentifierExpr`, `UnaryExpr`, `BinaryExpr`, `CallExpr`, `ListExpr`, `IndexExpr`) with runtime type checking and short-circuit boolean logic.
4. **Environment & Interpreter ([`src/environment.ts`](src/environment.ts) & [`src/interpreter.ts`](src/interpreter.ts))**: Manages lexically scoped variables and closures, executes statements, enforces safe execution limits (`maxLoopIterations`, `maxCallDepth`, `maxExecutionTimeMs`, `maxOutputLines`), and provides 17 built-in functions.
5. **Diagnostics & CLI ([`src/errors.ts`](src/errors.ts) & [`src/cli.ts`](src/cli.ts))**: Formats errors with source line snippets, caret underlines (`^~~~`), and Levenshtein `"Did you mean ...?"` suggestions, plus a CLI and interactive REPL.

---

## Language Reference

### 1. Comments

Use `#`, `//`, or `note:` for single-line comments:

```mini
# This is a comment
// This is also a comment
note: Natural-English note comment
```

### 2. Variables & Assignment

Assign values using `assign ... to ...` (or `set ... to ...`, `let ... be ...`, or `=`):

```mini
assign x to 10
assign message to "Hello, Mini!"
assign is_ready to true

# Update numbers in place
increase x by 5
decrease x by 2
```

### 3. Arithmetic (Natural English & Symbolic)

Mini supports prefix English phrases, infix English words, and standard math symbols:

| Operation | Prefix English | Infix English | Symbolic |
| :--- | :--- | :--- | :--- |
| **Addition** | `the total of a and b` / `the sum of a and b` | `a plus b` / `a added to b` | `a + b` |
| **Subtraction** | `the difference of a and b` | `a minus b` | `a - b` |
| **Multiplication** | `the product of a and b` | `a times b` / `a multiplied by b` | `a * b` |
| **Division** | `the quotient of a and b` | `a divided by b` / `a over b` | `a / b` |
| **Remainder** | `the remainder of a and b` | `a modulo b` / `a mod b` | `a % b` |
| **Exponent** | — | `a to the power of b` | `a ^ b` / `a ** b` |

> Note: The leading article `the` is always optional (`total of 10 and 5` and `the total of 10 and 5` both work).

### 4. Comparisons & Logic

| Meaning | Natural English | Symbolic |
| :--- | :--- | :--- |
| Equal | `is equal to`, `equals`, `is` | `==` |
| Not Equal | `is not equal to`, `is not`, `isn't` | `!=` |
| Greater Than | `is greater than`, `is more than`, `exceeds`, `is above` | `>` |
| Less Than | `is less than`, `is under`, `is below` | `<` |
| Greater or Equal | `is at least`, `is greater than or equal to` | `>=` |
| Less or Equal | `is at most`, `is less than or equal to` | `<=` |
| Logical AND / OR / NOT | `and`, `or`, `not` | `&&`, `||`, `!` |

### 5. Output

Use `show` (or `print` / `say`) to display one or more values:

```mini
show "The answer is", 42
```

### 6. Functions

#### Single-line Functions
```mini
make add(a, b) = a + b
make square(n) = the product of n and n

show add(10, 5)
show square(6)
```

#### Multi-line Functions (with `give` / `return`)
```mini
make factorial(n)
  if n is at most 1
    give 1
  end
  give n * factorial(n - 1)
end

show factorial(5)
```

### 7. Conditionals

#### Multi-line `if ... otherwise if ... otherwise ... end`
```mini
if score is at least 90
  show "Grade: A"
otherwise if score is at least 80
  show "Grade: B"
otherwise
  show "Keep practicing!"
end
```

#### Single-line `if ... then ... otherwise ...`
```mini
if x is greater than 10 then show "large" otherwise show "small"
```

### 8. Loops

#### `repeat N times`
```mini
repeat 3 times
  show "Hip hip hooray!"
end
```

#### `while` Loop
```mini
assign count to 1
while count is at most 5
  show count
  increase count by 1
end
```

#### `for ... from ... to ... [by ...]` Loop
```mini
for i from 1 to 5
  show i
end

for n from 10 to 2 by -2
  show n
end
```

#### `for each ... in ...` Loop
```mini
assign colors to list of "red", "green", "blue"
for each color in colors
  show color
end
```

#### Loop Control (`stop` & `skip`)
- `stop` (or `break`): Exits the current loop immediately.
- `skip` (or `continue`): Skips to the next iteration of the loop.

### 9. Lists & Built-in Functions

```mini
assign numbers to list of 10, 20, 30
push 40 to numbers
show length of numbers      # 4
show numbers at 0           # 10
show numbers at -1          # 40
assign numbers at 1 to 25   # [10, 25, 30, 40]
```

**Built-in Standard Library Functions:**
- **Math**: `abs(n)`, `round(n, [decimals])`, `floor(n)`, `ceil(n)`, `sqrt(n)`, `min(...)`, `max(...)`
- **Strings & Lists**: `length(x)`, `upper(s)`, `lower(s)`, `trim(s)`, `split(s, sep)`, `join(list, [sep])`, `range(start, end, [step])`
- **Types & Conversion**: `type(x)`, `number(x)`, `text(x)`

---

## VS Code Extension

The [`editors/vscode-mini/`](editors/vscode-mini/) directory contains a complete Visual Studio Code extension with:
- Syntax highlighting (`syntaxes/mini.tmLanguage.json`)
- Dark and light `.mini` file icons (`icons/mini-dark.svg`, `icons/mini-light.svg`)
- Code snippets (`snippets/mini.code-snippets`)
- Live syntax & lexer error diagnostics in the **Problems** pane (`out/extension.js`)
- One-click **Mini: Run Current .mini File** button in the editor toolbar

---

## Practical Examples

Explore the [`examples/`](examples/) folder:
- [`examples/hello.mini`](examples/hello.mini) — Functions, `the total of`, and `show`
- [`examples/arithmetic.mini`](examples/arithmetic.mini) — Prefix and infix natural-English math
- [`examples/fibonacci.mini`](examples/fibonacci.mini) — Recursive Fibonacci & list building
- [`examples/fizzbuzz.mini`](examples/fizzbuzz.mini) — Classic FizzBuzz with `remainder of` and `otherwise if`
- [`examples/prime_checker.mini`](examples/prime_checker.mini) — Prime number sieve using `while` loops and functions
- [`examples/shopping_cart.mini`](examples/shopping_cart.mini) — Receipt subtotal, bulk discount, and tax calculator
- [`examples/gradebook.mini`](examples/gradebook.mini) — Student grade statistics and letter grade classification
- [`examples/temperature_converter.mini`](examples/temperature_converter.mini) — Celsius to Fahrenheit and Kelvin conversion table

---

## License

Released under the [MIT License](LICENSE).

## License

Released under the [MIT License](LICENSE).

