"use strict";

// --- tokens.js ---

var TokenType;
(function (TokenType) {
    // Literals & Identifiers
    TokenType["NUMBER"] = "NUMBER";
    TokenType["STRING"] = "STRING";
    TokenType["BOOLEAN"] = "BOOLEAN";
    TokenType["NOTHING"] = "NOTHING";
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    // Statement & Declaration Keywords
    TokenType["MAKE"] = "MAKE";
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["SET"] = "SET";
    TokenType["LET"] = "LET";
    TokenType["BE"] = "BE";
    TokenType["TO"] = "TO";
    TokenType["FROM"] = "FROM";
    TokenType["BY"] = "BY";
    TokenType["IN"] = "IN";
    TokenType["OF"] = "OF";
    TokenType["THE"] = "THE";
    TokenType["SHOW"] = "SHOW";
    TokenType["GIVE"] = "GIVE";
    TokenType["INCREASE"] = "INCREASE";
    TokenType["DECREASE"] = "DECREASE";
    TokenType["PUSH"] = "PUSH";
    // Conditionals & Blocks
    TokenType["IF"] = "IF";
    TokenType["THEN"] = "THEN";
    TokenType["OTHERWISE"] = "OTHERWISE";
    TokenType["DO"] = "DO";
    TokenType["END"] = "END";
    // Loops
    TokenType["REPEAT"] = "REPEAT";
    TokenType["TIMES"] = "TIMES";
    TokenType["WHILE"] = "WHILE";
    TokenType["FOR"] = "FOR";
    TokenType["EACH"] = "EACH";
    TokenType["STOP"] = "STOP";
    TokenType["SKIP"] = "SKIP";
    // Prefix English Operations & Collections
    TokenType["TOTAL"] = "TOTAL";
    TokenType["DIFFERENCE"] = "DIFFERENCE";
    TokenType["PRODUCT"] = "PRODUCT";
    TokenType["QUOTIENT"] = "QUOTIENT";
    TokenType["REMAINDER"] = "REMAINDER";
    TokenType["LENGTH"] = "LENGTH";
    TokenType["LIST"] = "LIST";
    TokenType["AT"] = "AT";
    // Arithmetic Operators
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["STAR"] = "STAR";
    TokenType["SLASH"] = "SLASH";
    TokenType["PERCENT"] = "PERCENT";
    TokenType["CARET"] = "CARET";
    // Assignment & Comparison Operators
    TokenType["EQUALS"] = "EQUALS";
    TokenType["EQ"] = "EQ";
    TokenType["NEQ"] = "NEQ";
    TokenType["GT"] = "GT";
    TokenType["LT"] = "LT";
    TokenType["GTE"] = "GTE";
    TokenType["LTE"] = "LTE";
    // Logical & Unary Operators
    TokenType["AND"] = "AND";
    TokenType["OR"] = "OR";
    TokenType["NOT"] = "NOT";
    // Punctuation & Structure
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["COMMA"] = "COMMA";
    TokenType["COLON"] = "COLON";
    TokenType["NEWLINE"] = "NEWLINE";
    TokenType["EOF"] = "EOF";
})(TokenType || (TokenType = {}));
const SINGLE_WORD_KEYWORDS = {
    // Booleans & Null
    true: TokenType.BOOLEAN,
    false: TokenType.BOOLEAN,
    yes: TokenType.BOOLEAN,
    no: TokenType.BOOLEAN,
    nothing: TokenType.NOTHING,
    null: TokenType.NOTHING,
    // Declarations & Assignments
    make: TokenType.MAKE,
    define: TokenType.MAKE,
    assign: TokenType.ASSIGN,
    set: TokenType.SET,
    let: TokenType.LET,
    be: TokenType.BE,
    to: TokenType.TO,
    from: TokenType.FROM,
    by: TokenType.BY,
    step: TokenType.BY,
    in: TokenType.IN,
    of: TokenType.OF,
    the: TokenType.THE,
    // Output & Return & Mutation
    show: TokenType.SHOW,
    print: TokenType.SHOW,
    say: TokenType.SHOW,
    give: TokenType.GIVE,
    return: TokenType.GIVE,
    increase: TokenType.INCREASE,
    decrease: TokenType.DECREASE,
    push: TokenType.PUSH,
    // Conditionals & Blocks
    if: TokenType.IF,
    when: TokenType.IF,
    then: TokenType.THEN,
    otherwise: TokenType.OTHERWISE,
    else: TokenType.OTHERWISE,
    do: TokenType.DO,
    end: TokenType.END,
    // Loops
    repeat: TokenType.REPEAT,
    times: TokenType.TIMES,
    time: TokenType.TIMES,
    while: TokenType.WHILE,
    for: TokenType.FOR,
    each: TokenType.EACH,
    every: TokenType.EACH,
    stop: TokenType.STOP,
    break: TokenType.STOP,
    skip: TokenType.SKIP,
    continue: TokenType.SKIP,
    // Prefix English Math & Collections
    total: TokenType.TOTAL,
    sum: TokenType.TOTAL,
    difference: TokenType.DIFFERENCE,
    product: TokenType.PRODUCT,
    quotient: TokenType.QUOTIENT,
    ratio: TokenType.QUOTIENT,
    remainder: TokenType.REMAINDER,
    length: TokenType.LENGTH,
    size: TokenType.LENGTH,
    list: TokenType.LIST,
    at: TokenType.AT,
    // Single-word English Operators
    plus: TokenType.PLUS,
    minus: TokenType.MINUS,
    over: TokenType.SLASH,
    modulo: TokenType.PERCENT,
    mod: TokenType.PERCENT,
    equals: TokenType.EQ,
    is: TokenType.EQ,
    exceeds: TokenType.GT,
    and: TokenType.AND,
    or: TokenType.OR,
    not: TokenType.NOT,
    negative: TokenType.MINUS,
};

// --- errors.js ---

class MiniError extends Error {
    category;
    loc;
    sourceLines;
    hint;
    constructor(category, message, loc, sourceCode = "", hint) {
        super(message);
        this.name = "MiniError";
        this.category = category;
        this.loc = loc;
        this.sourceLines = sourceCode ? sourceCode.split(/\r?\n/) : [];
        this.hint = hint;
    }
    format() {
        const { file, line, column, length } = this.loc;
        const header = `${this.category}: ${this.message}`;
        const locationLine = `  --> ${file}:${line}:${column}`;
        const lineText = line >= 1 && line <= this.sourceLines.length
            ? this.sourceLines[line - 1]
            : undefined;
        if (lineText === undefined) {
            return this.hint
                ? `${header}\n${locationLine}\n  Hint: ${this.hint}`
                : `${header}\n${locationLine}`;
        }
        const lineNumStr = String(line);
        const gutterWidth = Math.max(lineNumStr.length, 2);
        const paddedLineNum = lineNumStr.padStart(gutterWidth, " ");
        const emptyGutter = " ".repeat(gutterWidth);
        const caretOffset = Math.max(0, column - 1);
        const caretLength = Math.max(1, length);
        const underline = " ".repeat(caretOffset) +
            "^" +
            (caretLength > 1 ? "~".repeat(caretLength - 1) : "");
        const lines = [
            header,
            locationLine,
            ` ${emptyGutter} |`,
            ` ${paddedLineNum} | ${lineText}`,
            ` ${emptyGutter} | ${underline}`,
        ];
        if (this.hint) {
            lines.push(`  Hint: ${this.hint}`);
        }
        return lines.join("\n");
    }
}
class LexerError extends MiniError {
    constructor(message, loc, sourceCode, hint) {
        super("Lexer Error", message, loc, sourceCode, hint);
        this.name = "LexerError";
    }
}
class ParseError extends MiniError {
    constructor(message, loc, sourceCode, hint) {
        super("Syntax Error", message, loc, sourceCode, hint);
        this.name = "ParseError";
    }
}
class RuntimeError extends MiniError {
    constructor(category, message, loc, sourceCode, hint) {
        super(category, message, loc, sourceCode, hint);
        this.name = "RuntimeError";
    }
}
/**
 * Computes Levenshtein distance between two strings for helpful "Did you mean?" suggestions.
 */
function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}
function findClosestMatch(target, candidates, maxDistance = 2) {
    let bestMatch;
    let bestDist = maxDistance + 1;
    for (const candidate of candidates) {
        if (candidate === target)
            continue;
        const dist = levenshteinDistance(target, candidate);
        if (dist <= maxDistance && dist < bestDist) {
            bestDist = dist;
            bestMatch = candidate;
        }
    }
    return bestMatch;
}

// --- lexer.js ---

/**
 * Multi-word natural English operator phrases ordered from longest to shortest
 * so greedy matching always picks the most specific phrase.
 */
const MULTI_WORD_PHRASES = [
    { words: ["is", "greater", "than", "or", "equal", "to"], type: TokenType.GTE },
    { words: ["is", "less", "than", "or", "equal", "to"], type: TokenType.LTE },
    { words: ["greater", "than", "or", "equal", "to"], type: TokenType.GTE },
    { words: ["less", "than", "or", "equal", "to"], type: TokenType.LTE },
    { words: ["is", "not", "equal", "to"], type: TokenType.NEQ },
    { words: ["to", "the", "power", "of"], type: TokenType.CARET },
    { words: ["is", "no", "less", "than"], type: TokenType.GTE },
    { words: ["is", "no", "more", "than"], type: TokenType.LTE },
    { words: ["is", "equal", "to"], type: TokenType.EQ },
    { words: ["not", "equal", "to"], type: TokenType.NEQ },
    { words: ["is", "greater", "than"], type: TokenType.GT },
    { words: ["is", "more", "than"], type: TokenType.GT },
    { words: ["is", "less", "than"], type: TokenType.LT },
    { words: ["is", "at", "least"], type: TokenType.GTE },
    { words: ["is", "at", "most"], type: TokenType.LTE },
    { words: ["as", "long", "as"], type: TokenType.WHILE },
    { words: ["equal", "to"], type: TokenType.EQ },
    { words: ["greater", "than"], type: TokenType.GT },
    { words: ["more", "than"], type: TokenType.GT },
    { words: ["less", "than"], type: TokenType.LT },
    { words: ["at", "least"], type: TokenType.GTE },
    { words: ["at", "most"], type: TokenType.LTE },
    { words: ["is", "not"], type: TokenType.NEQ },
    { words: ["is", "above"], type: TokenType.GT },
    { words: ["is", "below"], type: TokenType.LT },
    { words: ["is", "under"], type: TokenType.LT },
    { words: ["added", "to"], type: TokenType.PLUS },
    { words: ["multiplied", "by"], type: TokenType.STAR },
    { words: ["divided", "by"], type: TokenType.SLASH },
];
class Lexer {
    source;
    file;
    pos = 0;
    line = 1;
    column = 1;
    constructor(source, file = "<stdin>") {
        this.source = source;
        this.file = file;
    }
    tokenize() {
        const rawTokens = [];
        while (!this.isAtEnd()) {
            const ch = this.peek();
            // Skip horizontal whitespace
            if (ch === " " || ch === "\t" || ch === "\r") {
                this.advance();
                continue;
            }
            // Comments: '#' or '//'
            if (ch === "#" || (ch === "/" && this.peekNext() === "/")) {
                this.skipToEndOfLine();
                continue;
            }
            // Newline or statement separator ';'
            if (ch === "\n" || ch === ";") {
                const loc = this.currentLocation(1);
                const lexeme = ch === "\n" ? "\\n" : ";";
                if (ch === "\n") {
                    this.pos++;
                    this.line++;
                    this.column = 1;
                }
                else {
                    this.advance();
                }
                // Collapse consecutive NEWLINE tokens
                if (rawTokens.length > 0 &&
                    rawTokens[rawTokens.length - 1].type !== TokenType.NEWLINE) {
                    rawTokens.push({ type: TokenType.NEWLINE, lexeme, loc });
                }
                continue;
            }
            // String literals
            if (ch === '"' || ch === "'") {
                rawTokens.push(this.readString(ch));
                continue;
            }
            // Number literals
            if (this.isDigit(ch)) {
                rawTokens.push(this.readNumber());
                continue;
            }
            // Words / Identifiers / Keywords
            if (this.isAlpha(ch)) {
                const wordToken = this.readWord();
                if (wordToken) {
                    rawTokens.push(wordToken);
                }
                continue;
            }
            // Symbolic Operators & Punctuation
            rawTokens.push(this.readSymbol());
        }
        const mergedTokens = this.mergePhrases(rawTokens);
        mergedTokens.push({
            type: TokenType.EOF,
            lexeme: "",
            loc: {
                file: this.file,
                line: this.line,
                column: this.column,
                length: 1,
            },
        });
        return mergedTokens;
    }
    readString(quote) {
        const startLine = this.line;
        const startColumn = this.column;
        const startPos = this.pos;
        this.advance(); // consume opening quote
        let value = "";
        while (!this.isAtEnd() && this.peek() !== quote) {
            const ch = this.peek();
            if (ch === "\n") {
                throw new LexerError(`Unterminated string literal starting with ${quote}`, {
                    file: this.file,
                    line: startLine,
                    column: startColumn,
                    length: this.pos - startPos,
                }, this.source, `Add a closing ${quote} before the end of the line.`);
            }
            if (ch === "\\") {
                this.advance();
                if (this.isAtEnd())
                    break;
                const escaped = this.advance();
                switch (escaped) {
                    case "n":
                        value += "\n";
                        break;
                    case "t":
                        value += "\t";
                        break;
                    case "r":
                        value += "\r";
                        break;
                    case "\\":
                        value += "\\";
                        break;
                    case '"':
                        value += '"';
                        break;
                    case "'":
                        value += "'";
                        break;
                    default:
                        value += escaped;
                        break;
                }
            }
            else {
                value += this.advance();
            }
        }
        if (this.isAtEnd()) {
            throw new LexerError(`Unterminated string literal starting with ${quote}`, {
                file: this.file,
                line: startLine,
                column: startColumn,
                length: this.pos - startPos,
            }, this.source, `Close the string with a matching ${quote}.`);
        }
        this.advance(); // consume closing quote
        const rawLexeme = this.source.slice(startPos, this.pos);
        return {
            type: TokenType.STRING,
            lexeme: rawLexeme,
            literal: value,
            loc: {
                file: this.file,
                line: startLine,
                column: startColumn,
                length: rawLexeme.length,
            },
        };
    }
    readNumber() {
        const startColumn = this.column;
        const startPos = this.pos;
        while (!this.isAtEnd() && this.isDigit(this.peek())) {
            this.advance();
        }
        if (!this.isAtEnd() &&
            this.peek() === "." &&
            this.isDigit(this.peekNext())) {
            this.advance(); // consume '.'
            while (!this.isAtEnd() && this.isDigit(this.peek())) {
                this.advance();
            }
        }
        const lexeme = this.source.slice(startPos, this.pos);
        const numValue = Number(lexeme);
        return {
            type: TokenType.NUMBER,
            lexeme,
            literal: numValue,
            loc: {
                file: this.file,
                line: this.line,
                column: startColumn,
                length: lexeme.length,
            },
        };
    }
    readWord() {
        const startColumn = this.column;
        const startPos = this.pos;
        while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
            this.advance();
        }
        // Support contraction "isn't"
        if (this.source.slice(startPos, this.pos).toLowerCase() === "isn" &&
            this.peek() === "'" &&
            this.peekNext().toLowerCase() === "t") {
            this.advance(); // '
            this.advance(); // t
            const lexeme = this.source.slice(startPos, this.pos);
            return {
                type: TokenType.NEQ,
                lexeme,
                loc: {
                    file: this.file,
                    line: this.line,
                    column: startColumn,
                    length: lexeme.length,
                },
            };
        }
        const lexeme = this.source.slice(startPos, this.pos);
        const lower = lexeme.toLowerCase();
        // Support "note:" comment syntax
        if (lower === "note" && this.peek() === ":") {
            this.skipToEndOfLine();
            return null;
        }
        const loc = {
            file: this.file,
            line: this.line,
            column: startColumn,
            length: lexeme.length,
        };
        if (Object.prototype.hasOwnProperty.call(SINGLE_WORD_KEYWORDS, lower)) {
            const type = SINGLE_WORD_KEYWORDS[lower];
            let literal = undefined;
            if (type === TokenType.BOOLEAN) {
                literal = lower === "true" || lower === "yes";
            }
            else if (type === TokenType.NOTHING) {
                literal = null;
            }
            return { type, lexeme, literal, loc };
        }
        return {
            type: TokenType.IDENTIFIER,
            lexeme,
            loc,
        };
    }
    readSymbol() {
        const startColumn = this.column;
        const ch = this.advance();
        const next = this.peek();
        const makeToken = (type, lexeme) => ({
            type,
            lexeme,
            loc: {
                file: this.file,
                line: this.line,
                column: startColumn,
                length: lexeme.length,
            },
        });
        if (ch === "=" && next === "=") {
            this.advance();
            return makeToken(TokenType.EQ, "==");
        }
        if (ch === "!" && next === "=") {
            this.advance();
            return makeToken(TokenType.NEQ, "!=");
        }
        if (ch === ">" && next === "=") {
            this.advance();
            return makeToken(TokenType.GTE, ">=");
        }
        if (ch === "<" && next === "=") {
            this.advance();
            return makeToken(TokenType.LTE, "<=");
        }
        if (ch === "&" && next === "&") {
            this.advance();
            return makeToken(TokenType.AND, "&&");
        }
        if (ch === "|" && next === "|") {
            this.advance();
            return makeToken(TokenType.OR, "||");
        }
        if (ch === "*" && next === "*") {
            this.advance();
            return makeToken(TokenType.CARET, "**");
        }
        switch (ch) {
            case "=":
                return makeToken(TokenType.EQUALS, "=");
            case "+":
                return makeToken(TokenType.PLUS, "+");
            case "-":
                return makeToken(TokenType.MINUS, "-");
            case "*":
                return makeToken(TokenType.STAR, "*");
            case "/":
                return makeToken(TokenType.SLASH, "/");
            case "%":
                return makeToken(TokenType.PERCENT, "%");
            case "^":
                return makeToken(TokenType.CARET, "^");
            case ">":
                return makeToken(TokenType.GT, ">");
            case "<":
                return makeToken(TokenType.LT, "<");
            case "!":
                return makeToken(TokenType.NOT, "!");
            case "(":
                return makeToken(TokenType.LPAREN, "(");
            case ")":
                return makeToken(TokenType.RPAREN, ")");
            case "[":
                return makeToken(TokenType.LBRACKET, "[");
            case "]":
                return makeToken(TokenType.RBRACKET, "]");
            case ",":
                return makeToken(TokenType.COMMA, ",");
            case ":":
                return makeToken(TokenType.COLON, ":");
            default:
                throw new LexerError(`Unexpected character '${ch}'`, {
                    file: this.file,
                    line: this.line,
                    column: startColumn,
                    length: 1,
                }, this.source, `Remove '${ch}' or place it inside a quoted string.`);
        }
    }
    /**
     * Collapses multi-word English operator sequences (e.g. "is greater than",
     * "divided by", "is equal to") on the same line into single semantic tokens.
     */
    mergePhrases(tokens) {
        const result = [];
        let i = 0;
        while (i < tokens.length) {
            let matchedRule;
            for (const rule of MULTI_WORD_PHRASES) {
                if (i + rule.words.length > tokens.length)
                    continue;
                let matches = true;
                const firstLine = tokens[i].loc.line;
                for (let k = 0; k < rule.words.length; k++) {
                    const tok = tokens[i + k];
                    if (tok.loc.line !== firstLine ||
                        tok.type === TokenType.STRING ||
                        tok.type === TokenType.NUMBER ||
                        tok.lexeme.toLowerCase() !== rule.words[k]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) {
                    matchedRule = rule;
                    break;
                }
            }
            if (matchedRule) {
                const count = matchedRule.words.length;
                const first = tokens[i];
                const last = tokens[i + count - 1];
                const combinedLexeme = tokens
                    .slice(i, i + count)
                    .map((t) => t.lexeme)
                    .join(" ");
                const totalLength = last.loc.column + last.loc.length - first.loc.column;
                result.push({
                    type: matchedRule.type,
                    lexeme: combinedLexeme,
                    loc: {
                        file: first.loc.file,
                        line: first.loc.line,
                        column: first.loc.column,
                        length: Math.max(totalLength, combinedLexeme.length),
                    },
                });
                i += count;
            }
            else {
                result.push(tokens[i]);
                i++;
            }
        }
        return result;
    }
    skipToEndOfLine() {
        while (!this.isAtEnd() && this.peek() !== "\n") {
            this.advance();
        }
    }
    currentLocation(length) {
        return {
            file: this.file,
            line: this.line,
            column: this.column,
            length,
        };
    }
    isAtEnd() {
        return this.pos >= this.source.length;
    }
    peek() {
        return this.isAtEnd() ? "\0" : this.source[this.pos];
    }
    peekNext() {
        return this.pos + 1 >= this.source.length ? "\0" : this.source[this.pos + 1];
    }
    advance() {
        const ch = this.source[this.pos++];
        this.column++;
        return ch;
    }
    isDigit(ch) {
        return ch >= "0" && ch <= "9";
    }
    isAlpha(ch) {
        return ((ch >= "a" && ch <= "z") ||
            (ch >= "A" && ch <= "Z") ||
            ch === "_");
    }
    isAlphaNumeric(ch) {
        return this.isAlpha(ch) || this.isDigit(ch);
    }
}

// --- ast.js ---



// --- parser.js ---

const CONTEXTUAL_IDENTIFIER_TOKENS = new Set([
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
class Parser {
    tokens;
    source;
    current = 0;
    constructor(tokens, source = "") {
        this.tokens = tokens;
        this.source = source;
    }
    parse() {
        const body = [];
        this.skipNewlines();
        const startLoc = this.tokens.length > 0
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
    parseStatement() {
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
                const stmt = {
                    kind: "LoopControlStmt",
                    action: "stop",
                    loc: stopTok.loc,
                };
                return stmt;
            }
            case TokenType.SKIP: {
                const skipTok = this.advance();
                this.expectStatementEnd("skip");
                const stmt = {
                    kind: "LoopControlStmt",
                    action: "skip",
                    loc: skipTok.loc,
                };
                return stmt;
            }
            case TokenType.END:
                throw new ParseError(`Unexpected 'end' without a matching block`, tok.loc, this.source, `Remove this extra 'end' or check if an earlier 'if', 'repeat', 'while', 'for', or 'make' block was already closed.`);
            case TokenType.OTHERWISE:
                throw new ParseError(`Unexpected '${tok.lexeme}' outside of an 'if' statement`, tok.loc, this.source, `'${tok.lexeme}' must be inside an 'if ... end' block.`);
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
                        this.consume(TokenType.RBRACKET, "Expected ']' after list index", "Close the index with ']'.");
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
    parseFunctionDecl() {
        const makeTok = this.advance(); // consume 'make' / 'define'
        const nameTok = this.consumeIdentifier("Expected a function name after 'make'", "Example: make add(a, b) = a + b");
        const params = [];
        if (this.match(TokenType.LPAREN)) {
            if (!this.check(TokenType.RPAREN)) {
                do {
                    const paramTok = this.consumeIdentifier("Expected parameter name in function declaration", "Example: make add(a, b) = a + b");
                    params.push(paramTok.lexeme);
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RPAREN, "Expected ')' after function parameters", "Close the parameter list with ')'.");
        }
        // Single-line function: `make add(a, b) = a + b`
        if (this.match(TokenType.EQUALS)) {
            const expr = this.parseExpression();
            this.expectStatementEnd("function declaration");
            const giveStmt = {
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
        this.consume(TokenType.END, `Expected 'end' to close function '${nameTok.lexeme}'`, `Add 'end' after the body of '${nameTok.lexeme}'.`);
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
    parseAssignOrSet() {
        const kwTok = this.advance(); // 'assign' or 'set'
        const nameTok = this.consumeIdentifier(`Expected a variable name after '${kwTok.lexeme}'`, `Example: ${kwTok.lexeme} x to 10`);
        let indexExpr;
        if (this.match(TokenType.AT)) {
            indexExpr = this.parseUnary();
        }
        else if (this.match(TokenType.LBRACKET)) {
            indexExpr = this.parseExpression();
            this.consume(TokenType.RBRACKET, "Expected ']' after index expression", "Close the index with ']'.");
        }
        if (!this.match(TokenType.TO, TokenType.EQUALS, TokenType.BE)) {
            throw new ParseError(`Expected 'to' after variable '${nameTok.lexeme}' in '${kwTok.lexeme}' statement`, this.peek().loc, this.source, `Example: ${kwTok.lexeme} ${nameTok.lexeme} to 10`);
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
    parseLet() {
        const letTok = this.advance();
        const nameTok = this.consumeIdentifier("Expected a variable name after 'let'", "Example: let x be 10");
        if (!this.match(TokenType.BE, TokenType.EQUALS, TokenType.TO)) {
            throw new ParseError(`Expected 'be' or '=' after variable '${nameTok.lexeme}'`, this.peek().loc, this.source, `Example: let ${nameTok.lexeme} be 10`);
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
    parseMutateNumber() {
        const opTok = this.advance();
        const operator = opTok.type === TokenType.INCREASE ? "increase" : "decrease";
        const nameTok = this.consumeIdentifier(`Expected variable name after '${operator}'`, `Example: ${operator} count by 1`);
        let delta;
        if (this.match(TokenType.BY)) {
            delta = this.parseExpression();
        }
        else {
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
    parsePush() {
        const pushTok = this.advance();
        const value = this.parseExpression();
        if (!this.match(TokenType.TO, TokenType.IN)) {
            throw new ParseError(`Expected 'to' after value in 'push' statement`, this.peek().loc, this.source, `Example: push 42 to items`);
        }
        const targetTok = this.consumeIdentifier("Expected list variable name after 'to'", "Example: push 42 to items");
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
    parseShow() {
        const showTok = this.advance();
        const values = [];
        if (!this.isStatementTerminator(this.peek())) {
            do {
                values.push(this.parseExpression());
            } while (this.match(TokenType.COMMA));
        }
        else {
            throw new ParseError(`Expected an expression after '${showTok.lexeme}'`, showTok.loc, this.source, `Example: show "Hello, world!" or show x`);
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
    parseGive() {
        const giveTok = this.advance();
        let value = null;
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
    parseIf() {
        const ifTok = this.advance();
        const firstCondition = this.parseExpression();
        const hadConnector = this.match(TokenType.THEN, TokenType.DO, TokenType.COLON);
        // Check if single-line `if <cond> then <stmt> [otherwise <stmt>]`
        if (hadConnector && !this.isStatementTerminator(this.peek())) {
            const thenStmt = this.parseInlineStatement();
            const branches = [
                {
                    condition: firstCondition,
                    body: [thenStmt],
                    loc: ifTok.loc,
                },
            ];
            let elseBranch = null;
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
        this.expectNewlineOrEOF("if condition", "Put the body of the 'if' block on the next line and close the block with 'end', or use 'then' for a single-line conditional.");
        const branches = [];
        const firstBody = this.parseBlockUntil([TokenType.OTHERWISE, TokenType.END], ifTok);
        branches.push({
            condition: firstCondition,
            body: firstBody,
            loc: ifTok.loc,
        });
        let elseBranch = null;
        while (this.check(TokenType.OTHERWISE)) {
            const otherwiseTok = this.advance();
            if (this.match(TokenType.IF)) {
                const elifCond = this.parseExpression();
                this.match(TokenType.THEN, TokenType.DO, TokenType.COLON);
                this.expectNewlineOrEOF("otherwise if condition");
                const elifBody = this.parseBlockUntil([TokenType.OTHERWISE, TokenType.END], otherwiseTok);
                branches.push({
                    condition: elifCond,
                    body: elifBody,
                    loc: otherwiseTok.loc,
                });
            }
            else {
                this.match(TokenType.DO, TokenType.THEN, TokenType.COLON);
                this.expectNewlineOrEOF("otherwise");
                elseBranch = this.parseBlockUntil([TokenType.END], otherwiseTok);
                break;
            }
        }
        this.consume(TokenType.END, "Expected 'end' to close 'if' block", `Add 'end' to close the 'if' statement started on line ${ifTok.loc.line}.`);
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
    parseRepeat() {
        const repeatTok = this.advance();
        const count = this.parseExpression();
        this.match(TokenType.TIMES);
        this.match(TokenType.DO, TokenType.COLON);
        this.expectNewlineOrEOF("repeat header", "Example:\n  repeat 5 times\n    show \"hello\"\n  end");
        const body = this.parseBlockUntil([TokenType.END], repeatTok);
        this.consume(TokenType.END, "Expected 'end' to close 'repeat' loop", `Add 'end' to close the 'repeat' loop started on line ${repeatTok.loc.line}.`);
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
    parseWhile() {
        const whileTok = this.advance();
        const condition = this.parseExpression();
        this.match(TokenType.DO, TokenType.COLON);
        this.expectNewlineOrEOF("while condition", "Put the loop body on the next line and close it with 'end'.");
        const body = this.parseBlockUntil([TokenType.END], whileTok);
        this.consume(TokenType.END, "Expected 'end' to close 'while' loop", `Add 'end' to close the 'while' loop started on line ${whileTok.loc.line}.`);
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
    parseFor() {
        const forTok = this.advance();
        const hasEach = this.match(TokenType.EACH);
        const varTok = this.consumeIdentifier("Expected loop variable name after 'for'", "Example: for i from 1 to 5 or for each item in items");
        if (this.match(TokenType.IN)) {
            const iterable = this.parseExpression();
            this.match(TokenType.DO, TokenType.COLON);
            this.expectNewlineOrEOF("for-each header");
            const body = this.parseBlockUntil([TokenType.END], forTok);
            this.consume(TokenType.END, "Expected 'end' to close 'for' loop", `Add 'end' to close the 'for' loop started on line ${forTok.loc.line}.`);
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
            throw new ParseError(`Expected 'in' after '${varTok.lexeme}' in 'for each' loop`, this.peek().loc, this.source, `Example: for each ${varTok.lexeme} in items`);
        }
        if (!this.match(TokenType.FROM, TokenType.EQUALS)) {
            throw new ParseError(`Expected 'from' or 'in' after loop variable '${varTok.lexeme}'`, this.peek().loc, this.source, `Use 'for ${varTok.lexeme} from 1 to 10' or 'for each ${varTok.lexeme} in list'.`);
        }
        const start = this.parseExpression();
        this.consume(TokenType.TO, "Expected 'to' in 'for ... from <start> to <end>' loop", `Example: for ${varTok.lexeme} from 1 to 10`);
        const end = this.parseExpression();
        let step = null;
        if (this.match(TokenType.BY)) {
            step = this.parseExpression();
        }
        this.match(TokenType.DO, TokenType.COLON);
        this.expectNewlineOrEOF("for loop header");
        const body = this.parseBlockUntil([TokenType.END], forTok);
        this.consume(TokenType.END, "Expected 'end' to close 'for' loop", `Add 'end' to close the 'for' loop started on line ${forTok.loc.line}.`);
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
    parseInlineStatement() {
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
    parseInlineAssign() {
        const kwTok = this.advance();
        const nameTok = this.consumeIdentifier(`Expected variable name after '${kwTok.lexeme}'`);
        this.consume(TokenType.TO, `Expected 'to' after '${nameTok.lexeme}'`, `Example: assign ${nameTok.lexeme} to 10`);
        const value = this.parseExpression();
        return {
            kind: "AssignStmt",
            name: nameTok.lexeme,
            value,
            loc: kwTok.loc,
        };
    }
    parseInlineShow() {
        const showTok = this.advance();
        const values = [this.parseExpression()];
        while (this.match(TokenType.COMMA)) {
            values.push(this.parseExpression());
        }
        return {
            kind: "ShowStmt",
            values,
            loc: showTok.loc,
        };
    }
    parseInlineGive() {
        const giveTok = this.advance();
        const value = this.isStatementTerminator(this.peek()) || this.check(TokenType.OTHERWISE)
            ? null
            : this.parseExpression();
        return {
            kind: "GiveStmt",
            value,
            loc: giveTok.loc,
        };
    }
    parseInlineMutate() {
        const opTok = this.advance();
        const operator = opTok.type === TokenType.INCREASE ? "increase" : "decrease";
        const nameTok = this.consumeIdentifier(`Expected variable name after '${operator}'`);
        let delta = { kind: "LiteralExpr", value: 1, loc: opTok.loc };
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
    parseExpressionStatement() {
        const startTok = this.peek();
        const expr = this.parseExpression();
        // If there are leftover tokens on the same line after an identifier expression,
        // give a helpful syntax error rather than a generic message.
        if (!this.isStatementTerminator(this.peek())) {
            const leftover = this.peek();
            if (expr.kind === "IdentifierExpr") {
                throw new ParseError(`Unknown command or invalid statement starting with '${expr.name}'`, startTok.loc, this.source, `Valid commands include 'assign <var> to <value>', 'make <fn>(...) = ...', 'show <value>', 'if ...', 'repeat ...', 'while ...', 'for ...'.`);
            }
            throw new ParseError(`Unexpected '${leftover.lexeme}' after expression`, leftover.loc, this.source, `Check for a missing operator (like '+', 'and', 'is equal to') or put the next statement on a new line.`);
        }
        this.expectStatementEnd("expression");
        return {
            kind: "ExprStmt",
            expression: expr,
            loc: expr.loc,
        };
    }
    parseBlockUntil(stopTokens, openingToken) {
        const statements = [];
        this.skipNewlines();
        while (!this.isAtEnd() &&
            !stopTokens.some((type) => this.check(type))) {
            statements.push(this.parseStatement());
            this.skipNewlines();
        }
        if (this.isAtEnd()) {
            throw new ParseError(`Unclosed '${openingToken.lexeme}' block starting on line ${openingToken.loc.line}`, openingToken.loc, this.source, `Add 'end' to close the '${openingToken.lexeme}' block.`);
        }
        return statements;
    }
    // ==========================================================================
    // Expressions (Recursive Descent with Operator Precedence)
    // ==========================================================================
    parseExpression() {
        return this.parseOr();
    }
    parseOr() {
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
    parseAnd() {
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
    parseEquality() {
        let left = this.parseComparison();
        while (this.check(TokenType.EQ) || this.check(TokenType.NEQ)) {
            const opTok = this.advance();
            const operator = opTok.type === TokenType.EQ ? "==" : "!=";
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
    parseComparison() {
        let left = this.parseAdditive();
        while (this.check(TokenType.GT) ||
            this.check(TokenType.LT) ||
            this.check(TokenType.GTE) ||
            this.check(TokenType.LTE)) {
            const opTok = this.advance();
            let operator;
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
    parseAdditive() {
        let left = this.parseMultiplicative();
        while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
            const opTok = this.advance();
            const operator = opTok.type === TokenType.PLUS ? "+" : "-";
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
    parseMultiplicative() {
        let left = this.parsePower();
        while (this.check(TokenType.STAR) ||
            this.check(TokenType.SLASH) ||
            this.check(TokenType.PERCENT) ||
            (this.check(TokenType.TIMES) && this.canStartExpression(this.peekNext()))) {
            const opTok = this.advance();
            let operator;
            if (opTok.type === TokenType.STAR || opTok.type === TokenType.TIMES) {
                operator = "*";
            }
            else if (opTok.type === TokenType.SLASH) {
                operator = "/";
            }
            else {
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
    parsePower() {
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
    parseUnary() {
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
    parsePrefixEnglish() {
        // Strip optional article 'the' / 'a' / 'an'
        const hasThe = this.match(TokenType.THE);
        const startLoc = hasThe ? this.previous().loc : this.peek().loc;
        const current = this.peek();
        // Check for `<op> of <left> and <right>`
        if ((current.type === TokenType.TOTAL ||
            current.type === TokenType.DIFFERENCE ||
            current.type === TokenType.PRODUCT ||
            current.type === TokenType.QUOTIENT ||
            current.type === TokenType.REMAINDER) &&
            this.peekNext().type === TokenType.OF) {
            const opTok = this.advance(); // consume total/difference/product/quotient/remainder
            this.advance(); // consume 'of'
            const left = this.parseAdditive();
            if (!this.match(TokenType.AND, TokenType.COMMA)) {
                throw new ParseError(`Expected 'and' between operands in '${opTok.lexeme} of ... and ...'`, this.peek().loc, this.source, `Example: the ${opTok.lexeme.toLowerCase()} of 10 and 5`);
            }
            const right = this.parseAdditive();
            let operator;
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
        if (current.type === TokenType.LENGTH &&
            this.peekNext().type === TokenType.OF) {
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
        if (current.type === TokenType.LIST &&
            this.peekNext().type === TokenType.OF) {
            this.advance(); // consume 'list'
            this.advance(); // consume 'of'
            const elements = [];
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
    parsePostfix() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.match(TokenType.LBRACKET)) {
                const index = this.parseExpression();
                this.consume(TokenType.RBRACKET, "Expected ']' after index", "Close the index bracket with ']'.");
                expr = {
                    kind: "IndexExpr",
                    target: expr,
                    index,
                    loc: expr.loc,
                };
            }
            else if (this.match(TokenType.AT)) {
                const index = this.parsePower();
                expr = {
                    kind: "IndexExpr",
                    target: expr,
                    index,
                    loc: expr.loc,
                };
            }
            else {
                break;
            }
        }
        return expr;
    }
    parsePrimary() {
        const tok = this.peek();
        if (tok.type === TokenType.NUMBER ||
            tok.type === TokenType.STRING ||
            tok.type === TokenType.BOOLEAN ||
            tok.type === TokenType.NOTHING) {
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
            const elements = [];
            this.skipNewlines();
            if (!this.check(TokenType.RBRACKET)) {
                do {
                    this.skipNewlines();
                    if (this.check(TokenType.RBRACKET))
                        break;
                    elements.push(this.parseExpression());
                    this.skipNewlines();
                } while (this.match(TokenType.COMMA));
            }
            this.consume(TokenType.RBRACKET, "Expected ']' to close list literal", "Add ']' at the end of the list.");
            return {
                kind: "ListExpr",
                elements,
                loc: bracketTok.loc,
            };
        }
        // Grouped expression: `(a + b)`
        if (this.match(TokenType.LPAREN)) {
            const expr = this.parseExpression();
            this.consume(TokenType.RPAREN, "Expected ')' after grouped expression", "Add a closing ')'.");
            return expr;
        }
        // Identifier or Function Call: `x` or `add(x, 2)`
        if (this.isContextualIdentifier(tok)) {
            const identTok = this.advance();
            if (this.match(TokenType.LPAREN)) {
                const args = [];
                if (!this.check(TokenType.RPAREN)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.match(TokenType.COMMA));
                }
                this.consume(TokenType.RPAREN, `Expected ')' after arguments to '${identTok.lexeme}'`, `Close the function call '${identTok.lexeme}(...)' with ')'.`);
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
        throw new ParseError(`Expected a value or expression, but found '${tok.lexeme || "end of input"}'`, tok.loc, this.source, `Expressions can be numbers (10), strings ("hello"), variables (x), function calls (add(1, 2)), or English phrases (the total of 10 and 5).`);
    }
    // ==========================================================================
    // Helper Methods
    // ==========================================================================
    isContextualIdentifier(tok) {
        return CONTEXTUAL_IDENTIFIER_TOKENS.has(tok.type);
    }
    canStartExpression(tok) {
        return (tok.type === TokenType.NUMBER ||
            tok.type === TokenType.STRING ||
            tok.type === TokenType.BOOLEAN ||
            tok.type === TokenType.NOTHING ||
            tok.type === TokenType.LPAREN ||
            tok.type === TokenType.LBRACKET ||
            tok.type === TokenType.MINUS ||
            tok.type === TokenType.NOT ||
            tok.type === TokenType.THE ||
            this.isContextualIdentifier(tok));
    }
    consumeIdentifier(message, hint) {
        const tok = this.peek();
        if (this.isContextualIdentifier(tok)) {
            return this.advance();
        }
        throw new ParseError(message, tok.loc, this.source, hint);
    }
    isStatementTerminator(tok) {
        return (tok.type === TokenType.NEWLINE ||
            tok.type === TokenType.EOF ||
            tok.type === TokenType.END ||
            tok.type === TokenType.OTHERWISE);
    }
    expectStatementEnd(context) {
        if (this.isAtEnd())
            return;
        if (this.match(TokenType.NEWLINE)) {
            this.skipNewlines();
            return;
        }
        if (this.check(TokenType.END) || this.check(TokenType.OTHERWISE)) {
            return;
        }
        const unexpected = this.peek();
        throw new ParseError(`Unexpected '${unexpected.lexeme}' after ${context}`, unexpected.loc, this.source, `Put the next statement on a new line or check your expression syntax.`);
    }
    expectNewlineOrEOF(context, hint) {
        if (this.isAtEnd())
            return;
        if (this.match(TokenType.NEWLINE)) {
            this.skipNewlines();
            return;
        }
        const unexpected = this.peek();
        throw new ParseError(`Expected a new line after ${context}, but found '${unexpected.lexeme}'`, unexpected.loc, this.source, hint);
    }
    skipNewlines() {
        while (this.match(TokenType.NEWLINE)) {
            // keep consuming
        }
    }
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    consume(type, message, hint) {
        if (this.check(type))
            return this.advance();
        const tok = this.peek();
        throw new ParseError(message, tok.loc, this.source, hint);
    }
    check(type) {
        if (this.isAtEnd())
            return type === TokenType.EOF;
        return this.peek().type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }
    peek() {
        return this.tokens[this.current];
    }
    peekNext() {
        if (this.current + 1 >= this.tokens.length) {
            return this.tokens[this.tokens.length - 1];
        }
        return this.tokens[this.current + 1];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
}

// --- environment.js ---

class Environment {
    values = new Map();
    functions = new Map();
    parent;
    source;
    constructor(parent, source = "") {
        this.parent = parent;
        this.source = source || parent?.source || "";
    }
    /**
     * Defines or overwrites a variable in the current local scope (used for function parameters and loop variables).
     */
    defineLocal(name, value) {
        this.values.set(name, value);
    }
    /**
     * Assigns a variable. If the variable already exists in an enclosing scope, updates it there;
     * otherwise defines it in the current scope.
     */
    assign(name, value) {
        const targetEnv = this.resolveVariableEnv(name);
        if (targetEnv) {
            targetEnv.values.set(name, value);
        }
        else {
            this.values.set(name, value);
        }
    }
    /**
     * Looks up a variable value or throws a helpful Name Error with typo suggestions.
     */
    get(name, loc) {
        const env = this.resolveVariableEnv(name);
        if (env) {
            return env.values.get(name);
        }
        const suggestion = findClosestMatch(name, this.getAllVariableNames());
        const hint = suggestion
            ? `Did you mean '${suggestion}'? Or initialize '${name}' first with: assign ${name} to <value>`
            : `Initialize '${name}' before using it, e.g.: assign ${name} to 0`;
        throw new RuntimeError("Name Error", `Variable '${name}' is not defined`, loc, this.source, hint);
    }
    defineFunction(name, callable) {
        this.functions.set(name, callable);
    }
    getFunction(name, loc) {
        const env = this.resolveFunctionEnv(name);
        if (env) {
            return env.functions.get(name);
        }
        const suggestion = findClosestMatch(name, this.getAllFunctionNames());
        const hint = suggestion
            ? `Did you mean '${suggestion}(...)'?`
            : `Define the function first with: make ${name}(...) = ...`;
        throw new RuntimeError("Name Error", `Function '${name}' is not defined`, loc, this.source, hint);
    }
    resolveVariableEnv(name) {
        if (this.values.has(name)) {
            return this;
        }
        return this.parent?.resolveVariableEnv(name);
    }
    resolveFunctionEnv(name) {
        if (this.functions.has(name)) {
            return this;
        }
        return this.parent?.resolveFunctionEnv(name);
    }
    getAllVariableNames() {
        const names = new Set(this.values.keys());
        if (this.parent) {
            for (const k of this.parent.getAllVariableNames()) {
                names.add(k);
            }
        }
        return names;
    }
    getAllFunctionNames() {
        const names = new Set(this.functions.keys());
        if (this.parent) {
            for (const k of this.parent.getAllFunctionNames()) {
                names.add(k);
            }
        }
        return names;
    }
}
function formatMiniValue(value) {
    if (value === null)
        return "nothing";
    if (typeof value === "boolean")
        return value ? "true" : "false";
    if (typeof value === "number") {
        // Avoid floating point noise like 0.30000000000000004 while preserving normal decimals
        if (!Number.isInteger(value)) {
            return String(Number(value.toPrecision(12)));
        }
        return String(value);
    }
    if (typeof value === "string")
        return value;
    if (Array.isArray(value)) {
        return ("[" +
            value
                .map((item) => typeof item === "string" ? `"${item}"` : formatMiniValue(item))
                .join(", ") +
            "]");
    }
    return String(value);
}
function getMiniTypeName(value) {
    if (value === null)
        return "nothing";
    if (Array.isArray(value))
        return "list";
    return typeof value;
}
function isTruthy(value) {
    if (value === null || value === false)
        return false;
    if (value === 0 || value === "")
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    return true;
}
function isEqual(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length)
            return false;
        for (let i = 0; i < a.length; i++) {
            if (!isEqual(a[i], b[i]))
                return false;
        }
        return true;
    }
    return a === b;
}

// --- evaluator.js ---

class Evaluator {
    source;
    invokeUserFunction;
    constructor(source, invokeUserFunction) {
        this.source = source;
        this.invokeUserFunction = invokeUserFunction;
    }
    evaluate(expr, env) {
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
    evalList(expr, env) {
        return expr.elements.map((el) => this.evaluate(el, env));
    }
    evalIndex(expr, env) {
        const target = this.evaluate(expr.target, env);
        const indexVal = this.evaluate(expr.index, env);
        if (typeof indexVal !== "number" || !Number.isInteger(indexVal)) {
            throw new RuntimeError("Type Error", `Index must be an integer, but got ${getMiniTypeName(indexVal)} (${formatMiniValue(indexVal)})`, expr.index.loc, this.source, `Use a whole number index starting at 0, e.g. items at 0.`);
        }
        if (Array.isArray(target) || typeof target === "string") {
            const normalizedIndex = indexVal < 0 ? target.length + indexVal : indexVal;
            if (normalizedIndex < 0 || normalizedIndex >= target.length) {
                throw new RuntimeError("Index Error", `Index ${indexVal} is out of bounds for ${getMiniTypeName(target)} of length ${target.length}`, expr.loc, this.source, target.length === 0
                    ? `The ${getMiniTypeName(target)} is empty.`
                    : `Valid indices are from 0 to ${target.length - 1} (or -${target.length} to -1).`);
            }
            return target[normalizedIndex];
        }
        throw new RuntimeError("Type Error", `Cannot index into a value of type '${getMiniTypeName(target)}'`, expr.loc, this.source, `Indexing ('at' or '[...]') is only supported on lists and strings.`);
    }
    evalUnary(expr, env) {
        const val = this.evaluate(expr.operand, env);
        switch (expr.operator) {
            case "-": {
                if (typeof val !== "number") {
                    throw new RuntimeError("Type Error", `Cannot negate a ${getMiniTypeName(val)} (${formatMiniValue(val)})`, expr.loc, this.source, `The '-' (or 'negative') operator requires a number.`);
                }
                return -val;
            }
            case "not":
                return !isTruthy(val);
            case "length": {
                if (Array.isArray(val) || typeof val === "string") {
                    return val.length;
                }
                throw new RuntimeError("Type Error", `Cannot get 'length of' a ${getMiniTypeName(val)} (${formatMiniValue(val)})`, expr.loc, this.source, `'length of' works on strings and lists.`);
            }
        }
    }
    evalBinary(expr, env) {
        // Short-circuit logical operators
        if (expr.operator === "and") {
            const left = this.evaluate(expr.left, env);
            if (!isTruthy(left))
                return false;
            return isTruthy(this.evaluate(expr.right, env));
        }
        if (expr.operator === "or") {
            const left = this.evaluate(expr.left, env);
            if (isTruthy(left))
                return true;
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
                throw new RuntimeError("Type Error", `Cannot add ${getMiniTypeName(left)} and ${getMiniTypeName(right)}`, expr.loc, this.source, `Addition works on numbers, strings, or two lists.`);
            }
            case "-": {
                this.assertNumbers(left, right, "-", expr.loc);
                return left - right;
            }
            case "*": {
                if (typeof left === "string" && typeof right === "number") {
                    if (right < 0 || !Number.isInteger(right)) {
                        throw new RuntimeError("Type Error", `String repetition count must be a non-negative integer, got ${right}`, expr.loc, this.source);
                    }
                    return left.repeat(right);
                }
                this.assertNumbers(left, right, "*", expr.loc);
                return left * right;
            }
            case "/": {
                this.assertNumbers(left, right, "/", expr.loc);
                if (right === 0) {
                    throw new RuntimeError("Zero Division Error", `Cannot divide ${formatMiniValue(left)} by zero`, expr.right.loc, this.source, `Check that the divisor is not 0 before dividing.`);
                }
                return left / right;
            }
            case "%": {
                this.assertNumbers(left, right, "%", expr.loc);
                if (right === 0) {
                    throw new RuntimeError("Zero Division Error", `Cannot compute remainder when dividing by zero`, expr.right.loc, this.source, `Check that the divisor is not 0.`);
                }
                return left % right;
            }
            case "^": {
                this.assertNumbers(left, right, "^", expr.loc);
                return Math.pow(left, right);
            }
            case ">": {
                this.assertComparable(left, right, ">", expr.loc);
                return left > right;
            }
            case "<": {
                this.assertComparable(left, right, "<", expr.loc);
                return left < right;
            }
            case ">=": {
                this.assertComparable(left, right, ">=", expr.loc);
                return left >= right;
            }
            case "<=": {
                this.assertComparable(left, right, "<=", expr.loc);
                return left <= right;
            }
        }
    }
    evalCall(expr, env) {
        const callable = env.getFunction(expr.callee, expr.loc);
        const evaluatedArgs = expr.args.map((arg) => this.evaluate(arg, env));
        if (callable.kind === "builtin") {
            if (evaluatedArgs.length < callable.minArgs ||
                evaluatedArgs.length > callable.maxArgs) {
                const expectedDesc = callable.minArgs === callable.maxArgs
                    ? `${callable.minArgs} argument${callable.minArgs === 1 ? "" : "s"}`
                    : `${callable.minArgs} to ${callable.maxArgs} arguments`;
                throw new RuntimeError("Argument Error", `Built-in function '${callable.name}' expects ${expectedDesc}, but got ${evaluatedArgs.length}`, expr.loc, this.source);
            }
            return callable.fn(evaluatedArgs, expr.loc, this.source);
        }
        if (evaluatedArgs.length !== callable.params.length) {
            throw new RuntimeError("Argument Error", `Function '${callable.name}' expects ${callable.params.length} argument${callable.params.length === 1 ? "" : "s"} (${callable.params.join(", ")}), but got ${evaluatedArgs.length}`, expr.loc, this.source, `Call '${callable.name}' with ${callable.params.length} value${callable.params.length === 1 ? "" : "s"}.`);
        }
        return this.invokeUserFunction(callable, evaluatedArgs, expr.loc);
    }
    assertNumbers(left, right, op, loc) {
        if (typeof left !== "number" || typeof right !== "number") {
            throw new RuntimeError("Type Error", `Operator '${op}' requires numbers, but got ${getMiniTypeName(left)} (${formatMiniValue(left)}) and ${getMiniTypeName(right)} (${formatMiniValue(right)})`, loc, this.source, `Convert values to numbers or check variable types.`);
        }
    }
    assertComparable(left, right, op, loc) {
        const bothNumbers = typeof left === "number" && typeof right === "number";
        const bothStrings = typeof left === "string" && typeof right === "string";
        if (!bothNumbers && !bothStrings) {
            throw new RuntimeError("Type Error", `Cannot compare ${getMiniTypeName(left)} (${formatMiniValue(left)}) and ${getMiniTypeName(right)} (${formatMiniValue(right)}) with '${op}'`, loc, this.source, `Comparison operators ('>', '<', '>=', '<=') require two numbers or two strings.`);
        }
    }
}

// --- interpreter.js ---

class GiveSignal {
    value;
    loc;
    constructor(value, loc) {
        this.value = value;
        this.loc = loc;
    }
}
class LoopSignal {
    action;
    loc;
    constructor(action, loc) {
        this.action = action;
        this.loc = loc;
    }
}
class Interpreter {
    source;
    onOutput;
    maxCallDepth;
    maxLoopIterations;
    maxExecutionTimeMs;
    maxOutputLines;
    callDepth = 0;
    loopDepth = 0;
    executionStartTime = 0;
    globalEnv;
    evaluator;
    outputs = [];
    constructor(options = {}) {
        this.source = options.source ?? "";
        this.onOutput = options.onOutput ?? ((line) => console.log(line));
        this.maxCallDepth = options.maxCallDepth ?? 1000;
        this.maxLoopIterations = options.maxLoopIterations ?? 100_000;
        this.maxExecutionTimeMs = options.maxExecutionTimeMs ?? 5000;
        this.maxOutputLines = options.maxOutputLines ?? 10_000;
        this.globalEnv = new Environment(undefined, this.source);
        this.registerBuiltins();
        this.evaluator = new Evaluator(this.source, (fn, args, callLoc) => this.executeUserFunction(fn, args, callLoc));
    }
    interpret(program) {
        let lastValue = null;
        this.executionStartTime = Date.now();
        try {
            for (const stmt of program.body) {
                lastValue = this.executeStatement(stmt, this.globalEnv);
            }
        }
        catch (signal) {
            if (signal instanceof GiveSignal) {
                throw new RuntimeError("Runtime Error", `'give' (or 'return') can only be used inside a function`, signal.loc, this.source, `Wrap this statement inside a 'make <name>(...) ... end' function.`);
            }
            if (signal instanceof LoopSignal) {
                throw new RuntimeError("Runtime Error", `'${signal.action}' can only be used inside a loop`, signal.loc, this.source, `Use '${signal.action}' inside a 'repeat', 'while', or 'for' loop.`);
            }
            throw signal;
        }
        return lastValue;
    }
    executeStatement(stmt, env) {
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
    executeAssign(stmt, env) {
        const val = this.evaluator.evaluate(stmt.value, env);
        if (stmt.index !== undefined) {
            const target = env.get(stmt.name, stmt.loc);
            if (!Array.isArray(target)) {
                throw new RuntimeError("Type Error", `Cannot assign by index to '${stmt.name}' because it is a ${getMiniTypeName(target)}, not a list`, stmt.loc, this.source);
            }
            const idx = this.evaluator.evaluate(stmt.index, env);
            if (typeof idx !== "number" || !Number.isInteger(idx)) {
                throw new RuntimeError("Type Error", `List index must be an integer, got ${getMiniTypeName(idx)}`, stmt.index.loc, this.source);
            }
            const normIdx = idx < 0 ? target.length + idx : idx;
            if (normIdx < 0 || normIdx >= target.length) {
                throw new RuntimeError("Index Error", `Index ${idx} is out of bounds for list '${stmt.name}' of length ${target.length}`, stmt.index.loc, this.source);
            }
            target[normIdx] = val;
            return val;
        }
        env.assign(stmt.name, val);
        return val;
    }
    executeMutateNumber(stmt, env) {
        const currentVal = env.get(stmt.name, stmt.loc);
        if (typeof currentVal !== "number") {
            throw new RuntimeError("Type Error", `Cannot '${stmt.operator}' variable '${stmt.name}' because its value is a ${getMiniTypeName(currentVal)} (${formatMiniValue(currentVal)})`, stmt.loc, this.source, `'${stmt.operator}' only works on numeric variables.`);
        }
        const deltaVal = this.evaluator.evaluate(stmt.delta, env);
        if (typeof deltaVal !== "number") {
            throw new RuntimeError("Type Error", `Amount to '${stmt.operator}' must be a number, but got ${getMiniTypeName(deltaVal)} (${formatMiniValue(deltaVal)})`, stmt.delta.loc, this.source);
        }
        const updated = stmt.operator === "increase"
            ? currentVal + deltaVal
            : currentVal - deltaVal;
        env.assign(stmt.name, updated);
        return updated;
    }
    executePush(stmt, env) {
        const target = env.get(stmt.target, stmt.loc);
        if (!Array.isArray(target)) {
            throw new RuntimeError("Type Error", `Cannot push to '${stmt.target}' because it is a ${getMiniTypeName(target)}, not a list`, stmt.loc, this.source, `Initialize '${stmt.target}' as a list first, e.g.: assign ${stmt.target} to []`);
        }
        const item = this.evaluator.evaluate(stmt.value, env);
        target.push(item);
        return target;
    }
    executeShow(stmt, env) {
        if (this.maxOutputLines > 0 && this.outputs.length >= this.maxOutputLines) {
            throw new RuntimeError("Runtime Error", `Program exceeded maximum output limit (${this.maxOutputLines} lines)`, stmt.loc, this.source, `Check for an unintended loop printing too many lines.`);
        }
        const evaluated = stmt.values.map((expr) => this.evaluator.evaluate(expr, env));
        const formatted = evaluated.map((v) => formatMiniValue(v)).join(" ");
        this.outputs.push(formatted);
        this.onOutput(formatted);
        return evaluated[evaluated.length - 1] ?? null;
    }
    executeFunctionDecl(stmt, env) {
        const userFn = {
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
    executeGive(stmt, env) {
        const value = stmt.value !== null ? this.evaluator.evaluate(stmt.value, env) : null;
        throw new GiveSignal(value, stmt.loc);
    }
    executeIf(stmt, env) {
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
    executeRepeat(stmt, env) {
        const countVal = this.evaluator.evaluate(stmt.count, env);
        if (typeof countVal !== "number" || !Number.isInteger(countVal)) {
            throw new RuntimeError("Type Error", `Repeat count must be an integer, but got ${getMiniTypeName(countVal)} (${formatMiniValue(countVal)})`, stmt.count.loc, this.source, `Use a whole number in 'repeat <N> times'.`);
        }
        if (countVal < 0) {
            throw new RuntimeError("Runtime Error", `Repeat count cannot be negative (${countVal})`, stmt.count.loc, this.source);
        }
        let lastValue = null;
        this.loopDepth++;
        try {
            for (let i = 0; i < countVal; i++) {
                this.checkIterationLimit(i, stmt.loc);
                try {
                    lastValue = this.executeBlock(stmt.body, env);
                }
                catch (sig) {
                    if (sig instanceof LoopSignal) {
                        if (sig.action === "stop")
                            break;
                        if (sig.action === "skip")
                            continue;
                    }
                    throw sig;
                }
            }
        }
        finally {
            this.loopDepth--;
        }
        return lastValue;
    }
    executeWhile(stmt, env) {
        let lastValue = null;
        let iterations = 0;
        this.loopDepth++;
        try {
            while (isTruthy(this.evaluator.evaluate(stmt.condition, env))) {
                this.checkIterationLimit(iterations++, stmt.loc);
                try {
                    lastValue = this.executeBlock(stmt.body, env);
                }
                catch (sig) {
                    if (sig instanceof LoopSignal) {
                        if (sig.action === "stop")
                            break;
                        if (sig.action === "skip")
                            continue;
                    }
                    throw sig;
                }
            }
        }
        finally {
            this.loopDepth--;
        }
        return lastValue;
    }
    executeForRange(stmt, env) {
        const startVal = this.evaluator.evaluate(stmt.start, env);
        const endVal = this.evaluator.evaluate(stmt.end, env);
        if (typeof startVal !== "number" || typeof endVal !== "number") {
            throw new RuntimeError("Type Error", `'for' loop range bounds must be numbers, got ${getMiniTypeName(startVal)} and ${getMiniTypeName(endVal)}`, stmt.loc, this.source);
        }
        let stepVal;
        if (stmt.step !== null) {
            const evaluatedStep = this.evaluator.evaluate(stmt.step, env);
            if (typeof evaluatedStep !== "number") {
                throw new RuntimeError("Type Error", `'for' loop step must be a number, got ${getMiniTypeName(evaluatedStep)}`, stmt.step.loc, this.source);
            }
            if (evaluatedStep === 0) {
                throw new RuntimeError("Runtime Error", `'for' loop step cannot be zero`, stmt.step.loc, this.source);
            }
            stepVal = evaluatedStep;
        }
        else {
            stepVal = startVal <= endVal ? 1 : -1;
        }
        let lastValue = null;
        let iterations = 0;
        const loopEnv = new Environment(env, this.source);
        this.loopDepth++;
        try {
            for (let current = startVal; stepVal > 0 ? current <= endVal : current >= endVal; current += stepVal) {
                this.checkIterationLimit(iterations++, stmt.loc);
                loopEnv.defineLocal(stmt.variable, current);
                try {
                    lastValue = this.executeBlock(stmt.body, loopEnv);
                }
                catch (sig) {
                    if (sig instanceof LoopSignal) {
                        if (sig.action === "stop")
                            break;
                        if (sig.action === "skip")
                            continue;
                    }
                    throw sig;
                }
            }
        }
        finally {
            this.loopDepth--;
        }
        return lastValue;
    }
    executeForEach(stmt, env) {
        const iterableVal = this.evaluator.evaluate(stmt.iterable, env);
        let items;
        if (Array.isArray(iterableVal)) {
            items = iterableVal;
        }
        else if (typeof iterableVal === "string") {
            items = Array.from(iterableVal);
        }
        else {
            throw new RuntimeError("Type Error", `Cannot iterate over ${getMiniTypeName(iterableVal)} (${formatMiniValue(iterableVal)})`, stmt.iterable.loc, this.source, `'for each' requires a list or a string.`);
        }
        let lastValue = null;
        const loopEnv = new Environment(env, this.source);
        this.loopDepth++;
        try {
            for (let i = 0; i < items.length; i++) {
                this.checkIterationLimit(i, stmt.loc);
                loopEnv.defineLocal(stmt.variable, items[i]);
                try {
                    lastValue = this.executeBlock(stmt.body, loopEnv);
                }
                catch (sig) {
                    if (sig instanceof LoopSignal) {
                        if (sig.action === "stop")
                            break;
                        if (sig.action === "skip")
                            continue;
                    }
                    throw sig;
                }
            }
        }
        finally {
            this.loopDepth--;
        }
        return lastValue;
    }
    executeLoopControl(stmt) {
        if (this.loopDepth === 0) {
            throw new RuntimeError("Runtime Error", `'${stmt.action}' cannot be used outside of a loop`, stmt.loc, this.source, `Use '${stmt.action}' inside a 'repeat', 'while', or 'for' loop.`);
        }
        throw new LoopSignal(stmt.action, stmt.loc);
    }
    executeBlock(statements, env) {
        let lastValue = null;
        for (const stmt of statements) {
            lastValue = this.executeStatement(stmt, env);
        }
        return lastValue;
    }
    executeUserFunction(fn, args, callLoc) {
        if (this.callDepth >= this.maxCallDepth) {
            throw new RuntimeError("Runtime Error", `Maximum function call depth (${this.maxCallDepth}) exceeded in '${fn.name}'`, callLoc, this.source, `Check for infinite recursion in '${fn.name}' (make sure there is a base case).`);
        }
        const fnEnv = new Environment(fn.closure, this.source);
        for (let i = 0; i < fn.params.length; i++) {
            fnEnv.defineLocal(fn.params[i], args[i]);
        }
        this.callDepth++;
        try {
            let lastValue = null;
            for (const stmt of fn.body) {
                lastValue = this.executeStatement(stmt, fnEnv);
            }
            return lastValue;
        }
        catch (sig) {
            if (sig instanceof GiveSignal) {
                return sig.value;
            }
            throw sig;
        }
        finally {
            this.callDepth--;
        }
    }
    checkIterationLimit(iteration, loc) {
        if (iteration >= this.maxLoopIterations) {
            throw new RuntimeError("Runtime Error", `Loop exceeded maximum iteration limit (${this.maxLoopIterations})`, loc, this.source, `Check your loop condition to make sure the loop eventually terminates.`);
        }
        this.checkTimeLimit(loc);
    }
    checkTimeLimit(loc) {
        if (this.maxExecutionTimeMs > 0 &&
            this.executionStartTime > 0 &&
            Date.now() - this.executionStartTime > this.maxExecutionTimeMs) {
            throw new RuntimeError("Runtime Error", `Execution timed out after ${this.maxExecutionTimeMs}ms`, loc, this.source, `Optimize long-running loops/recursion or increase the timeout with --timeout <ms>.`);
        }
    }
    registerBuiltins() {
        const def = (name, minArgs, maxArgs, fn) => {
            this.globalEnv.defineFunction(name, {
                kind: "builtin",
                name,
                minArgs,
                maxArgs,
                fn,
            });
        };
        const requireNum = (val, fnName, loc, src) => {
            if (typeof val !== "number") {
                throw new RuntimeError("Type Error", `Function '${fnName}' expects a number, but got ${getMiniTypeName(val)} (${formatMiniValue(val)})`, loc, src);
            }
            return val;
        };
        const requireStr = (val, fnName, loc, src) => {
            if (typeof val !== "string") {
                throw new RuntimeError("Type Error", `Function '${fnName}' expects a string, but got ${getMiniTypeName(val)} (${formatMiniValue(val)})`, loc, src);
            }
            return val;
        };
        def("abs", 1, 1, ([x], loc, src) => Math.abs(requireNum(x, "abs", loc, src)));
        def("round", 1, 2, ([x, decimals], loc, src) => {
            const n = requireNum(x, "round", loc, src);
            if (decimals === undefined)
                return Math.round(n);
            const d = requireNum(decimals, "round", loc, src);
            const factor = Math.pow(10, d);
            return Math.round(n * factor) / factor;
        });
        def("floor", 1, 1, ([x], loc, src) => Math.floor(requireNum(x, "floor", loc, src)));
        def("ceil", 1, 1, ([x], loc, src) => Math.ceil(requireNum(x, "ceil", loc, src)));
        def("sqrt", 1, 1, ([x], loc, src) => {
            const n = requireNum(x, "sqrt", loc, src);
            if (n < 0) {
                throw new RuntimeError("Runtime Error", `Cannot compute square root of negative number (${n})`, loc, src);
            }
            return Math.sqrt(n);
        });
        def("min", 1, 64, (args, loc, src) => {
            const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
            if (list.length === 0) {
                throw new RuntimeError("Argument Error", `'min' cannot be called on an empty list`, loc, src);
            }
            const nums = list.map((v) => requireNum(v, "min", loc, src));
            return Math.min(...nums);
        });
        def("max", 1, 64, (args, loc, src) => {
            const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
            if (list.length === 0) {
                throw new RuntimeError("Argument Error", `'max' cannot be called on an empty list`, loc, src);
            }
            const nums = list.map((v) => requireNum(v, "max", loc, src));
            return Math.max(...nums);
        });
        def("upper", 1, 1, ([s], loc, src) => requireStr(s, "upper", loc, src).toUpperCase());
        def("lower", 1, 1, ([s], loc, src) => requireStr(s, "lower", loc, src).toLowerCase());
        def("trim", 1, 1, ([s], loc, src) => requireStr(s, "trim", loc, src).trim());
        def("split", 2, 2, ([s, sep], loc, src) => requireStr(s, "split", loc, src).split(requireStr(sep, "split", loc, src)));
        def("join", 1, 2, ([list, sep], loc, src) => {
            if (!Array.isArray(list)) {
                throw new RuntimeError("Type Error", `Function 'join' expects a list as first argument, got ${getMiniTypeName(list)}`, loc, src);
            }
            const separator = sep !== undefined ? requireStr(sep, "join", loc, src) : ", ";
            return list.map((item) => formatMiniValue(item)).join(separator);
        });
        def("length", 1, 1, ([x], loc, src) => {
            if (Array.isArray(x) || typeof x === "string")
                return x.length;
            throw new RuntimeError("Type Error", `Function 'length' expects a list or string, got ${getMiniTypeName(x)}`, loc, src);
        });
        def("range", 2, 3, ([start, end, step], loc, src) => {
            const s = requireNum(start, "range", loc, src);
            const e = requireNum(end, "range", loc, src);
            const st = step !== undefined
                ? requireNum(step, "range", loc, src)
                : s <= e
                    ? 1
                    : -1;
            if (st === 0) {
                throw new RuntimeError("Argument Error", `Function 'range' step cannot be 0`, loc, src);
            }
            const result = [];
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
                throw new RuntimeError("Type Error", `Cannot convert '${formatMiniValue(x)}' to a number`, loc, src);
            }
            return parsed;
        });
    }
}

// --- index.js ---

const VERSION = "1.0.0";
function runMini(source, options = {}) {
    const file = options.file ?? "<stdin>";
    const lexer = new Lexer(source, file);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, source);
    const ast = parser.parse();
    const interpreter = new Interpreter({
        ...options,
        source,
    });
    const lastValue = interpreter.interpret(ast);
    return {
        tokens,
        ast,
        outputs: interpreter.outputs,
        lastValue,
        interpreter,
    };
}
/**
 * Validates Mini source code (Lexer + Parser) without executing statements.
 * Useful for CLI syntax checking (`minilang check`) and IDE/VS Code diagnostics.
 */
function checkMini(source, file = "<stdin>") {
    try {
        const lexer = new Lexer(source, file);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens, source);
        const ast = parser.parse();
        return {
            valid: true,
            tokens,
            ast,
            diagnostics: [],
        };
    }
    catch (err) {
        if (err instanceof MiniError) {
            return {
                valid: false,
                diagnostics: [
                    {
                        category: err.category,
                        message: err.message,
                        file: err.loc.file,
                        line: err.loc.line,
                        column: err.loc.column,
                        length: err.loc.length,
                        hint: err.hint,
                        formatted: err.format(),
                    },
                ],
            };
        }
        throw err;
    }
}

module.exports = { TokenType, SINGLE_WORD_KEYWORDS, MiniError, LexerError, ParseError, RuntimeError, Lexer, Parser, Environment, Evaluator, Interpreter, VERSION, runMini, checkMini };
