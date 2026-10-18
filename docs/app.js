import { Lexer, MiniError, Parser, runMini } from "./assets/mini-browser.js";

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

const editorEl = document.getElementById("playground-code");
const outputEl = document.getElementById("playground-output");
const selectEl = document.getElementById("playground-example");
const modeLabelEl = document.getElementById("playground-mode-label");
const timingEl = document.getElementById("playground-timing");
const runBtn = document.getElementById("btn-run");
const tokensBtn = document.getElementById("btn-tokens");
const astBtn = document.getElementById("btn-ast");
const themeToggleBtn = document.getElementById("theme-toggle");

// Theme Toggle (Minimalist Black vs White)
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

// Add Copy buttons to all <pre> blocks
document.querySelectorAll("pre").forEach((pre) => {
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
  executePlayground("run");

  selectEl.addEventListener("change", () => {
    const key = selectEl.value;
    if (EXAMPLES[key]) {
      editorEl.value = EXAMPLES[key];
      executePlayground("run");
    }
  });

  runBtn?.addEventListener("click", () => executePlayground("run"));
  tokensBtn?.addEventListener("click", () => executePlayground("tokens"));
  astBtn?.addEventListener("click", () => executePlayground("ast"));

  editorEl.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      executePlayground("run");
    }
  });
}
