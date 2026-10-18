import {
  checkMini,
  Lexer,
  MiniError,
  Parser,
  runMini,
} from "./assets/mini-browser.js";

const EXAMPLES = {
  hello: `# Quick Intro Example
make add(a, b) = a + b
assign x to the total of 10 and 5
show add(x, 2)`,

  arithmetic: `# Natural English & Symbolic Arithmetic
assign a to the total of 10 and 5
assign b to the difference of 20 and 8
assign c to the product of 4 and 6
assign d to the quotient of 100 and 4
assign e to the remainder of 17 and 5

show "Total:", a
show "Difference:", b
show "Product:", c
show "Quotient:", d
show "Remainder:", e

assign power_val to 2 to the power of 8
show "2^8 =", power_val`,

  fibonacci: `# Recursive Fibonacci Sequence
make fib(n)
  if n is at most 1
    give n
  end
  give fib(n - 1) + fib(n - 2)
end

assign seq to []
for i from 0 to 9
  push fib(i) to seq
end
show "Fibonacci(0..9):", join(seq, ", ")`,

  fizzbuzz: `# FizzBuzz (1 to 15)
for n from 1 to 15
  if the remainder of n and 15 is equal to 0
    show "FizzBuzz"
  otherwise if the remainder of n and 3 is equal to 0
    show "Fizz"
  otherwise if the remainder of n and 5 is equal to 0
    show "Buzz"
  otherwise
    show n
  end
end`,

  primes: `# Prime Number Sieve up to 50
make is_prime(n)
  if n is less than 2
    give false
  end
  assign divisor to 2
  while the product of divisor and divisor is at most n
    if the remainder of n and divisor is equal to 0
      give false
    end
    increase divisor by 1
  end
  give true
end

assign primes to []
for candidate from 2 to 50
  if is_prime(candidate)
    push candidate to primes
  end
end

show "Found", length of primes, "primes:"
show join(primes, ", ")`,

  cart: `# Shopping Cart Receipt Calculator
make apply_discount(amount, percent) = amount - (amount * percent / 100)
make add_tax(amount, tax_rate) = round(amount * (1 + tax_rate / 100), 2)

assign prices to list of 29.99, 15.50, 42.00, 19.99
assign subtotal to 0

for each price in prices
  increase subtotal by price
end

assign subtotal to round(subtotal, 2)
show "Items:", length of prices
show "Subtotal: $" + subtotal

if subtotal is at least 100
  assign discounted to round(apply_discount(subtotal, 15), 2)
  show "15% Bulk Discount: $" + discounted
otherwise
  assign discounted to subtotal
end

show "Final Total (8% tax): $" + add_tax(discounted, 8)`,
};

// ============================================================================
// Base IntelliSense Dictionary (Keywords, Natural Phrases, Built-ins, Snippets)
// ============================================================================
const STATIC_COMPLETIONS = [
  // Statement Keywords & Snippets
  { label: "assign", insert: "assign ", kind: "kw", detail: "Assign variable" },
  {
    label: "assign ... to ...",
    insert: "assign x to ",
    kind: "snippet",
    detail: "Variable assignment",
  },
  {
    label: "make",
    insert: "make ",
    kind: "kw",
    detail: "Define a function",
  },
  {
    label: "make fn(a, b) = ...",
    insert: "make name(a, b) = a + b",
    kind: "snippet",
    detail: "One-line function",
  },
  {
    label: "show",
    insert: "show ",
    kind: "kw",
    detail: "Display output",
  },
  {
    label: "if ... end",
    insert: "if condition\n  show true\nend",
    kind: "snippet",
    detail: "Conditional block",
  },
  { label: "if", insert: "if ", kind: "kw", detail: "Conditional branch" },
  {
    label: "otherwise if",
    insert: "otherwise if ",
    kind: "kw",
    detail: "Else-if branch",
  },
  { label: "otherwise", insert: "otherwise", kind: "kw", detail: "Else branch" },
  { label: "then", insert: "then ", kind: "kw", detail: "Inline conditional" },
  { label: "give", insert: "give ", kind: "kw", detail: "Return value" },
  { label: "end", insert: "end", kind: "kw", detail: "Close block" },
  {
    label: "repeat ... times",
    insert: "repeat 5 times\n  \nend",
    kind: "snippet",
    detail: "Repeat N times loop",
  },
  { label: "while", insert: "while ", kind: "kw", detail: "While loop" },
  {
    label: "for i from 1 to 10",
    insert: "for i from 1 to 10\n  show i\nend",
    kind: "snippet",
    detail: "Range loop",
  },
  {
    label: "for each item in list",
    insert: "for each item in items\n  show item\nend",
    kind: "snippet",
    detail: "For-each loop",
  },
  {
    label: "increase",
    insert: "increase ",
    kind: "kw",
    detail: "Add to variable",
  },
  {
    label: "decrease",
    insert: "decrease ",
    kind: "kw",
    detail: "Subtract from variable",
  },
  { label: "push", insert: "push ", kind: "kw", detail: "Append to list" },
  { label: "stop", insert: "stop", kind: "kw", detail: "Break out of loop" },
  { label: "skip", insert: "skip", kind: "kw", detail: "Continue next iteration" },

  // Natural-English Arithmetic & Comparison Phrases
  {
    label: "the total of",
    insert: "the total of ",
    kind: "phrase",
    detail: "Addition (a + b)",
  },
  {
    label: "the sum of",
    insert: "the sum of ",
    kind: "phrase",
    detail: "Addition (a + b)",
  },
  {
    label: "the difference of",
    insert: "the difference of ",
    kind: "phrase",
    detail: "Subtraction (a - b)",
  },
  {
    label: "the product of",
    insert: "the product of ",
    kind: "phrase",
    detail: "Multiplication (a * b)",
  },
  {
    label: "the quotient of",
    insert: "the quotient of ",
    kind: "phrase",
    detail: "Division (a / b)",
  },
  {
    label: "the remainder of",
    insert: "the remainder of ",
    kind: "phrase",
    detail: "Modulo (a % b)",
  },
  {
    label: "length of",
    insert: "length of ",
    kind: "phrase",
    detail: "List or string length",
  },
  {
    label: "list of",
    insert: "list of ",
    kind: "phrase",
    detail: "Create a list",
  },
  {
    label: "is equal to",
    insert: "is equal to ",
    kind: "phrase",
    detail: "Equality (==)",
  },
  {
    label: "is not equal to",
    insert: "is not equal to ",
    kind: "phrase",
    detail: "Inequality (!=)",
  },
  {
    label: "is greater than",
    insert: "is greater than ",
    kind: "phrase",
    detail: "Greater than (>)",
  },
  {
    label: "is less than",
    insert: "is less than ",
    kind: "phrase",
    detail: "Less than (<)",
  },
  {
    label: "is at least",
    insert: "is at least ",
    kind: "phrase",
    detail: "Greater or equal (>=)",
  },
  {
    label: "is at most",
    insert: "is at most ",
    kind: "phrase",
    detail: "Less or equal (<=)",
  },
  {
    label: "to the power of",
    insert: "to the power of ",
    kind: "phrase",
    detail: "Exponentiation (^)",
  },
  {
    label: "multiplied by",
    insert: "multiplied by ",
    kind: "phrase",
    detail: "Multiplication (*)",
  },
  {
    label: "divided by",
    insert: "divided by ",
    kind: "phrase",
    detail: "Division (/)",
  },

  // Built-in Functions
  { label: "round(n, d)", insert: "round(", kind: "fn", detail: "Round number" },
  { label: "abs(n)", insert: "abs(", kind: "fn", detail: "Absolute value" },
  { label: "sqrt(n)", insert: "sqrt(", kind: "fn", detail: "Square root" },
  { label: "floor(n)", insert: "floor(", kind: "fn", detail: "Round down" },
  { label: "ceil(n)", insert: "ceil(", kind: "fn", detail: "Round up" },
  { label: "min(a, b)", insert: "min(", kind: "fn", detail: "Minimum value" },
  { label: "max(a, b)", insert: "max(", kind: "fn", detail: "Maximum value" },
  {
    label: "join(list, sep)",
    insert: "join(",
    kind: "fn",
    detail: "Join list into string",
  },
  {
    label: "split(str, sep)",
    insert: "split(",
    kind: "fn",
    detail: "Split string into list",
  },
  { label: "upper(str)", insert: "upper(", kind: "fn", detail: "Uppercase" },
  { label: "lower(str)", insert: "lower(", kind: "fn", detail: "Lowercase" },
  { label: "trim(str)", insert: "trim(", kind: "fn", detail: "Trim whitespace" },
  {
    label: "range(start, end)",
    insert: "range(",
    kind: "fn",
    detail: "Generate number list",
  },
  { label: "type(val)", insert: "type(", kind: "fn", detail: "Get value type" },
  {
    label: "number(val)",
    insert: "number(",
    kind: "fn",
    detail: "Convert to number",
  },
  {
    label: "text(val)",
    insert: "text(",
    kind: "fn",
    detail: "Convert to string",
  },
  { label: "true", insert: "true", kind: "kw", detail: "Boolean true" },
  { label: "false", insert: "false", kind: "kw", detail: "Boolean false" },
  { label: "nothing", insert: "nothing", kind: "kw", detail: "Null value" },
];

// ============================================================================
// Syntax Highlighter for Mini Code
// ============================================================================
const KEYWORDS_SET = new Set([
  "make",
  "define",
  "assign",
  "set",
  "let",
  "be",
  "to",
  "from",
  "by",
  "step",
  "in",
  "of",
  "the",
  "show",
  "print",
  "say",
  "give",
  "return",
  "increase",
  "decrease",
  "push",
  "if",
  "when",
  "then",
  "otherwise",
  "else",
  "do",
  "end",
  "repeat",
  "times",
  "time",
  "while",
  "for",
  "each",
  "every",
  "stop",
  "break",
  "skip",
  "continue",
  "and",
  "or",
  "not",
  "true",
  "false",
  "yes",
  "no",
  "nothing",
  "null",
]);

const PHRASE_WORDS_SET = new Set([
  "total",
  "sum",
  "difference",
  "product",
  "quotient",
  "ratio",
  "remainder",
  "length",
  "size",
  "list",
  "at",
  "plus",
  "minus",
  "over",
  "modulo",
  "mod",
  "equals",
  "is",
  "exceeds",
  "greater",
  "less",
  "than",
  "least",
  "most",
  "equal",
  "divided",
  "multiplied",
  "added",
  "power",
]);

const BUILTINS_SET = new Set([
  "abs",
  "round",
  "floor",
  "ceil",
  "sqrt",
  "min",
  "max",
  "upper",
  "lower",
  "trim",
  "split",
  "join",
  "length",
  "range",
  "type",
  "text",
  "number",
]);

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightMiniLine(line, errDiag) {
  const tokenRegex =
    /(#.*$|\/\/.*$|\bnote:.*$)|("(?:\\.|[^"\\])*"?|'(?:\\.|[^'\\])*'?)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|(==|!=|>=|<=|&&|\|\||\*\*|[=+\-*/%^><!])/gi;

  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(line)) !== null) {
    const [full, comment, str, num, word, sym] = match;
    const startCol = match.index + 1;
    const endCol = startCol + full.length;

    if (match.index > lastIndex) {
      result += escapeHtml(line.slice(lastIndex, match.index));
    }

    let cls = "";
    if (comment) {
      cls = "tok-comment";
    } else if (str) {
      cls = "tok-string";
    } else if (num) {
      cls = "tok-number";
    } else if (word) {
      const lower = word.toLowerCase();
      const nextChar = line.slice(match.index + full.length).trimStart()[0];
      if (BUILTINS_SET.has(lower) && nextChar === "(") {
        cls = "tok-builtin";
      } else if (nextChar === "(") {
        cls = "tok-fn";
      } else if (KEYWORDS_SET.has(lower)) {
        cls = "tok-keyword";
      } else if (PHRASE_WORDS_SET.has(lower)) {
        cls = "tok-phrase";
      }
    } else if (sym) {
      cls = "tok-op";
    }

    const isErrorSpan =
      errDiag &&
      endCol > errDiag.column &&
      startCol <= errDiag.column + Math.max(1, errDiag.length);

    const combinedClass = [cls, isErrorSpan ? "tok-error" : ""]
      .filter(Boolean)
      .join(" ");

    if (combinedClass) {
      result += `<span class="${combinedClass}">${escapeHtml(full)}</span>`;
    } else {
      result += escapeHtml(full);
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < line.length) {
    result += escapeHtml(line.slice(lastIndex));
  }

  return result;
}

function highlightMiniCode(code, diagnostics = []) {
  const errByLine = new Map();
  for (const d of diagnostics) {
    errByLine.set(d.line, d);
  }
  const lines = code.split("\n");
  return lines
    .map((line, idx) => highlightMiniLine(line, errByLine.get(idx + 1)))
    .join("\n");
}

// ============================================================================
// DOM Elements & Theme Toggle
// ============================================================================
const editorEl = document.getElementById("playground-code");
const highlightEl = document.getElementById("playground-highlight");
const backdropEl = document.getElementById("playground-backdrop");
const gutterEl = document.getElementById("playground-gutter");
const diagBarEl = document.getElementById("editor-diagnostic-bar");
const diagTextEl = document.getElementById("diagnostic-text");
const cursorPosEl = document.getElementById("cursor-pos");
const popupEl = document.getElementById("intellisense-popup");
const outputEl = document.getElementById("playground-output");
const selectEl = document.getElementById("playground-example");
const modeLabelEl = document.getElementById("playground-mode-label");
const timingEl = document.getElementById("playground-timing");
const runBtn = document.getElementById("btn-run");
const tokensBtn = document.getElementById("btn-tokens");
const astBtn = document.getElementById("btn-ast");
const themeToggleBtn = document.getElementById("theme-toggle");

const savedTheme = localStorage.getItem("mini-docs-theme");
if (savedTheme === "light") {
  document.documentElement.setAttribute("data-theme", "light");
}

themeToggleBtn?.addEventListener("click", () => {
  const isLight =
    document.documentElement.getAttribute("data-theme") === "light";
  if (isLight) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("mini-docs-theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("mini-docs-theme", "light");
  }
});

// Highlight static documentation <pre><code> blocks & add Copy buttons
document.querySelectorAll("pre").forEach((pre) => {
  if (pre.id === "playground-backdrop") return;

  const codeEl = pre.querySelector("code");
  if (codeEl) {
    const raw = codeEl.textContent || "";
    if (
      raw.includes("assign ") ||
      raw.includes("make ") ||
      raw.includes("show ") ||
      raw.includes("repeat ") ||
      raw.includes("for ")
    ) {
      codeEl.innerHTML = highlightMiniCode(raw);
    }
  }

  const wrapper = document.createElement("div");
  wrapper.className = "pre-wrapper";
  pre.parentNode.insertBefore(wrapper, pre);
  wrapper.appendChild(pre);

  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.textContent = "Copy";
  btn.addEventListener("click", () => {
    const text = pre.innerText;
    navigator.clipboard?.writeText(text);
    btn.textContent = "Copied";
    setTimeout(() => {
      btn.textContent = "Copy";
    }, 1400);
  });
  wrapper.appendChild(btn);
});

// ============================================================================
// Live Editor Synchronization, Diagnostics & IntelliSense
// ============================================================================
let activeCompletions = [];
let selectedCompletionIndex = 0;

function extractDocumentSymbols(code) {
  const dynamicItems = [];
  const seen = new Set();

  // Extract functions: make <name>(<params>)
  const fnRegex = /\b(?:make|define)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/gi;
  let m;
  while ((m = fnRegex.exec(code)) !== null) {
    const fnName = m[1];
    const params = m[2].trim();
    if (!seen.has(fnName)) {
      seen.add(fnName);
      dynamicItems.push({
        label: `${fnName}(${params})`,
        insert: `${fnName}(`,
        kind: "fn",
        detail: "User function",
      });
    }
  }

  // Extract variables: assign/set/let/for <name>
  const varRegex =
    /\b(?:assign|set|let|for(?:\s+each)?|increase|decrease)\s+([a-zA-Z_][a-zA-Z0-9_]*)\b/gi;
  while ((m = varRegex.exec(code)) !== null) {
    const varName = m[1];
    if (!KEYWORDS_SET.has(varName.toLowerCase()) && !seen.has(varName)) {
      seen.add(varName);
      dynamicItems.push({
        label: varName,
        insert: varName,
        kind: "var",
        detail: "Variable",
      });
    }
  }

  return dynamicItems;
}

function updateEditorView() {
  if (!editorEl || !highlightEl || !gutterEl) return;
  const code = editorEl.value;
  const checkRes = checkMini(code, "playground.mini");

  // Render syntax-highlighted HTML with trailing newline so last empty line renders
  highlightEl.innerHTML =
    highlightMiniCode(code, checkRes.diagnostics) +
    (code.endsWith("\n") ? " " : "");

  // Render line numbers gutter
  const lineCount = code.split("\n").length;
  const errLine = checkRes.diagnostics[0]?.line;
  const gutterLines = [];
  for (let i = 1; i <= lineCount; i++) {
    const cls =
      i === errLine
        ? "editor-gutter-line err-line"
        : "editor-gutter-line";
    gutterLines.push(`<div class="${cls}">${i}</div>`);
  }
  gutterEl.innerHTML = gutterLines.join("");

  // Update live diagnostic bar
  if (diagBarEl && diagTextEl) {
    if (checkRes.valid) {
      diagBarEl.classList.remove("has-error");
      diagTextEl.textContent = "✓ Syntax valid";
    } else {
      const d = checkRes.diagnostics[0];
      diagBarEl.classList.add("has-error");
      diagTextEl.textContent = `Ln ${d.line}:${d.column} — ${d.category}: ${d.message}${
        d.hint ? ` (${d.hint})` : ""
      }`;
    }
  }
}

function updateCursorPosition() {
  if (!editorEl || !cursorPosEl) return;
  const pos = editorEl.selectionStart || 0;
  const before = editorEl.value.slice(0, pos);
  const lines = before.split("\n");
  const ln = lines.length;
  const col = lines[lines.length - 1].length + 1;
  cursorPosEl.textContent = `Ln ${ln}, Col ${col}`;
}

function getCurrentWordPrefix() {
  const pos = editorEl.selectionStart || 0;
  const before = editorEl.value.slice(0, pos);
  const linePart = before.split("\n").pop() || "";
  const match = linePart.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
  return match ? match[1] : "";
}

function showIntelliSense(force = false) {
  if (!editorEl || !popupEl) return;
  const prefix = getCurrentWordPrefix();
  if (!force && prefix.length < 1) {
    hideIntelliSense();
    return;
  }

  const lowerPrefix = prefix.toLowerCase();
  const dynamicSymbols = extractDocumentSymbols(editorEl.value);
  const allCandidates = [...dynamicSymbols, ...STATIC_COMPLETIONS];

  activeCompletions = allCandidates
    .filter((item) => {
      if (!lowerPrefix) return true;
      return (
        item.label.toLowerCase().startsWith(lowerPrefix) ||
        item.insert.toLowerCase().startsWith(lowerPrefix)
      );
    })
    .filter((item) => item.insert.trim() !== prefix)
    .slice(0, 8);

  if (activeCompletions.length === 0) {
    hideIntelliSense();
    return;
  }

  selectedCompletionIndex = 0;
  renderIntelliSenseItems();

  // Position popup near cursor line/column
  const pos = editorEl.selectionStart || 0;
  const lines = editorEl.value.slice(0, pos).split("\n");
  const row = lines.length - 1;
  const col = lines[lines.length - 1].length;

  const topPx = Math.min(240, 16 + (row + 1) * 23 - editorEl.scrollTop);
  const leftPx = Math.min(260, 48 + col * 7.8);

  popupEl.style.top = `${Math.max(24, topPx)}px`;
  popupEl.style.left = `${Math.max(48, leftPx)}px`;
  popupEl.classList.add("visible");
}

function renderIntelliSenseItems() {
  if (!popupEl) return;
  popupEl.innerHTML = activeCompletions
    .map(
      (item, idx) => `
      <div class="intellisense-item ${
        idx === selectedCompletionIndex ? "active" : ""
      }" data-idx="${idx}" role="option">
        <div class="intellisense-left">
          <span class="intellisense-kind">${item.kind}</span>
          <span>${escapeHtml(item.label)}</span>
        </div>
        <span class="intellisense-detail">${escapeHtml(item.detail)}</span>
      </div>`
    )
    .join("");

  popupEl.querySelectorAll(".intellisense-item").forEach((el) => {
    el.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const idx = Number(el.getAttribute("data-idx"));
      applyCompletion(activeCompletions[idx]);
    });
  });
}

function hideIntelliSense() {
  popupEl?.classList.remove("visible");
  activeCompletions = [];
}

function applyCompletion(item) {
  if (!item || !editorEl) return;
  const pos = editorEl.selectionStart || 0;
  const prefix = getCurrentWordPrefix();
  const start = pos - prefix.length;
  const before = editorEl.value.slice(0, start);
  const after = editorEl.value.slice(pos);

  editorEl.value = before + item.insert + after;
  const newCursor = start + item.insert.length;
  editorEl.setSelectionRange(newCursor, newCursor);
  editorEl.focus();

  hideIntelliSense();
  updateEditorView();
  updateCursorPosition();
}

function executePlayground(mode = "run") {
  const code = editorEl.value;
  outputEl.className = "playground-output";
  const t0 = performance.now();

  try {
    if (mode === "tokens") {
      if (modeLabelEl) modeLabelEl.textContent = "LEXER TOKENS";
      const tokens = new Lexer(code, "playground.mini").tokenize();
      const formatted = tokens
        .map(
          (t) =>
            `[${t.loc.line}:${t.loc.column}] ${t.type.padEnd(12)} ${JSON.stringify(t.lexeme)}`
        )
        .join("\n");
      outputEl.textContent = formatted;
      if (timingEl)
        timingEl.textContent = `${tokens.length} tokens · ${(performance.now() - t0).toFixed(1)}ms`;
      return;
    }

    if (mode === "ast") {
      if (modeLabelEl) modeLabelEl.textContent = "AST (JSON)";
      const tokens = new Lexer(code, "playground.mini").tokenize();
      const ast = new Parser(tokens, code).parse();
      outputEl.textContent = JSON.stringify(ast, null, 2);
      if (timingEl)
        timingEl.textContent = `${ast.body.length} statements · ${(performance.now() - t0).toFixed(1)}ms`;
      return;
    }

    if (modeLabelEl) modeLabelEl.textContent = "STDOUT";
    const lines = [];
    runMini(code, {
      file: "playground.mini",
      onOutput: (line) => lines.push(line),
      maxExecutionTimeMs: 2500,
      maxLoopIterations: 50000,
    });
    outputEl.textContent =
      lines.length > 0 ? lines.join("\n") : "(Program finished with no output)";
    if (timingEl)
      timingEl.textContent = `${(performance.now() - t0).toFixed(1)}ms`;
  } catch (err) {
    outputEl.classList.add("output-error");
    if (timingEl) timingEl.textContent = "Error";
    if (err instanceof MiniError) {
      outputEl.textContent = err.format();
    } else {
      outputEl.textContent = String(err);
    }
  }
}

if (editorEl && selectEl) {
  editorEl.value = EXAMPLES.hello;
  updateEditorView();
  executePlayground("run");

  editorEl.addEventListener("input", () => {
    updateEditorView();
    updateCursorPosition();
    showIntelliSense(false);
  });

  editorEl.addEventListener("scroll", () => {
    if (backdropEl) {
      backdropEl.scrollTop = editorEl.scrollTop;
      backdropEl.scrollLeft = editorEl.scrollLeft;
    }
    if (gutterEl) {
      gutterEl.scrollTop = editorEl.scrollTop;
    }
  });

  editorEl.addEventListener("click", () => {
    updateCursorPosition();
    hideIntelliSense();
  });

  editorEl.addEventListener("keyup", (e) => {
    if (
      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
    ) {
      updateCursorPosition();
    }
  });

  editorEl.addEventListener("blur", () => {
    setTimeout(hideIntelliSense, 150);
  });

  editorEl.addEventListener("keydown", (e) => {
    // Run shortcut: Ctrl+Enter / Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      hideIntelliSense();
      executePlayground("run");
      return;
    }

    // Manual IntelliSense trigger: Ctrl+Space
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault();
      showIntelliSense(true);
      return;
    }

    // Navigate IntelliSense popup when visible
    if (popupEl?.classList.contains("visible") && activeCompletions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedCompletionIndex =
          (selectedCompletionIndex + 1) % activeCompletions.length;
        renderIntelliSenseItems();
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedCompletionIndex =
          (selectedCompletionIndex - 1 + activeCompletions.length) %
          activeCompletions.length;
        renderIntelliSenseItems();
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        applyCompletion(activeCompletions[selectedCompletionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        hideIntelliSense();
        return;
      }
    }

    // Tab inserts 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const start = editorEl.selectionStart;
      const end = editorEl.selectionEnd;
      editorEl.value =
        editorEl.value.slice(0, start) + "  " + editorEl.value.slice(end);
      editorEl.selectionStart = editorEl.selectionEnd = start + 2;
      updateEditorView();
      updateCursorPosition();
    }
  });

  selectEl.addEventListener("change", () => {
    const key = selectEl.value;
    if (EXAMPLES[key]) {
      editorEl.value = EXAMPLES[key];
      hideIntelliSense();
      updateEditorView();
      updateCursorPosition();
      executePlayground("run");
    }
  });

  runBtn?.addEventListener("click", () => executePlayground("run"));
  tokensBtn?.addEventListener("click", () => executePlayground("tokens"));
  astBtn?.addEventListener("click", () => executePlayground("ast"));
}
