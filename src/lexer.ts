import { LexerError } from "./errors.js";
import {
  SINGLE_WORD_KEYWORDS,
  SourceLocation,
  Token,
  TokenType,
} from "./tokens.js";

interface PhraseRule {
  words: string[];
  type: TokenType;
}

/**
 * Multi-word natural English operator phrases ordered from longest to shortest
 * so greedy matching always picks the most specific phrase.
 */
const MULTI_WORD_PHRASES: PhraseRule[] = [
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

export class Lexer {
  private readonly source: string;
  private readonly file: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string, file: string = "<stdin>") {
    this.source = source;
    this.file = file;
  }

  public tokenize(): Token[] {
    const rawTokens: Token[] = [];

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
        } else {
          this.advance();
        }
        // Collapse consecutive NEWLINE tokens
        if (
          rawTokens.length > 0 &&
          rawTokens[rawTokens.length - 1].type !== TokenType.NEWLINE
        ) {
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

  private readString(quote: string): Token {
    const startLine = this.line;
    const startColumn = this.column;
    const startPos = this.pos;

    this.advance(); // consume opening quote
    let value = "";

    while (!this.isAtEnd() && this.peek() !== quote) {
      const ch = this.peek();
      if (ch === "\n") {
        throw new LexerError(
          `Unterminated string literal starting with ${quote}`,
          {
            file: this.file,
            line: startLine,
            column: startColumn,
            length: this.pos - startPos,
          },
          this.source,
          `Add a closing ${quote} before the end of the line.`
        );
      }

      if (ch === "\\") {
        this.advance();
        if (this.isAtEnd()) break;
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
      } else {
        value += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new LexerError(
        `Unterminated string literal starting with ${quote}`,
        {
          file: this.file,
          line: startLine,
          column: startColumn,
          length: this.pos - startPos,
        },
        this.source,
        `Close the string with a matching ${quote}.`
      );
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

  private readNumber(): Token {
    const startColumn = this.column;
    const startPos = this.pos;

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance();
    }

    if (
      !this.isAtEnd() &&
      this.peek() === "." &&
      this.isDigit(this.peekNext())
    ) {
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

  private readWord(): Token | null {
    const startColumn = this.column;
    const startPos = this.pos;

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    // Support contraction "isn't"
    if (
      this.source.slice(startPos, this.pos).toLowerCase() === "isn" &&
      this.peek() === "'" &&
      this.peekNext().toLowerCase() === "t"
    ) {
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

    const loc: SourceLocation = {
      file: this.file,
      line: this.line,
      column: startColumn,
      length: lexeme.length,
    };

    if ( Object.prototype.hasOwnProperty.call(SINGLE_WORD_KEYWORDS, lower)) {
      const type = SINGLE_WORD_KEYWORDS[lower];
      let literal: boolean | null | undefined = undefined;
      if (type === TokenType.BOOLEAN) {
        literal = lower === "true" || lower === "yes";
      } else if (type === TokenType.NOTHING) {
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

  private readSymbol(): Token {
    const startColumn = this.column;
    const ch = this.advance();
    const next = this.peek();

    const makeToken = (type: TokenType, lexeme: string): Token => ({
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
        throw new LexerError(
          `Unexpected character '${ch}'`,
          {
            file: this.file,
            line: this.line,
            column: startColumn,
            length: 1,
          },
          this.source,
          `Remove '${ch}' or place it inside a quoted string.`
        );
    }
  }

  /**
   * Collapses multi-word English operator sequences (e.g. "is greater than",
   * "divided by", "is equal to") on the same line into single semantic tokens.
   */
  private mergePhrases(tokens: Token[]): Token[] {
    const result: Token[] = [];
    let i = 0;

    while (i < tokens.length) {
      let matchedRule: PhraseRule | undefined;

      for (const rule of MULTI_WORD_PHRASES) {
        if (i + rule.words.length > tokens.length) continue;

        let matches = true;
        const firstLine = tokens[i].loc.line;
        for (let k = 0; k < rule.words.length; k++) {
          const tok = tokens[i + k];
          if (
            tok.loc.line !== firstLine ||
            tok.type === TokenType.STRING ||
            tok.type === TokenType.NUMBER ||
            tok.lexeme.toLowerCase() !== rule.words[k]
          ) {
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
        const totalLength =
          last.loc.column + last.loc.length - first.loc.column;

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
      } else {
        result.push(tokens[i]);
        i++;
      }
    }

    return result;
  }

  private skipToEndOfLine(): void {
    while (!this.isAtEnd() && this.peek() !== "\n") {
      this.advance();
    }
  }

  private currentLocation(length: number): SourceLocation {
    return {
      file: this.file,
      line: this.line,
      column: this.column,
      length,
    };
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private peek(): string {
    return this.isAtEnd() ? "\0" : this.source[this.pos];
  }

  private peekNext(): string {
    return this.pos + 1 >= this.source.length ? "\0" : this.source[this.pos + 1];
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    this.column++;
    return ch;
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isAlpha(ch: string): boolean {
    return (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_"
    );
  }

  private isAlphaNumeric(ch: string): boolean {
    return this.isAlpha(ch) || this.isDigit(ch);
  }
}

