export enum TokenType {
  // Literals & Identifiers
  NUMBER = "NUMBER",
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  NOTHING = "NOTHING",
  IDENTIFIER = "IDENTIFIER",

  // Statement & Declaration Keywords
  MAKE = "MAKE",
  ASSIGN = "ASSIGN",
  SET = "SET",
  LET = "LET",
  BE = "BE",
  TO = "TO",
  FROM = "FROM",
  BY = "BY",
  IN = "IN",
  OF = "OF",
  THE = "THE",
  SHOW = "SHOW",
  GIVE = "GIVE",
  INCREASE = "INCREASE",
  DECREASE = "DECREASE",
  PUSH = "PUSH",

  // Conditionals & Blocks
  IF = "IF",
  THEN = "THEN",
  OTHERWISE = "OTHERWISE",
  DO = "DO",
  END = "END",

  // Loops
  REPEAT = "REPEAT",
  TIMES = "TIMES",
  WHILE = "WHILE",
  FOR = "FOR",
  EACH = "EACH",
  STOP = "STOP",
  SKIP = "SKIP",

  // Prefix English Operations & Collections
  TOTAL = "TOTAL",
  DIFFERENCE = "DIFFERENCE",
  PRODUCT = "PRODUCT",
  QUOTIENT = "QUOTIENT",
  REMAINDER = "REMAINDER",
  LENGTH = "LENGTH",
  LIST = "LIST",
  AT = "AT",

  // Arithmetic Operators
  PLUS = "PLUS",
  MINUS = "MINUS",
  STAR = "STAR",
  SLASH = "SLASH",
  PERCENT = "PERCENT",
  CARET = "CARET",

  // Assignment & Comparison Operators
  EQUALS = "EQUALS",
  EQ = "EQ",
  NEQ = "NEQ",
  GT = "GT",
  LT = "LT",
  GTE = "GTE",
  LTE = "LTE",

  // Logical & Unary Operators
  AND = "AND",
  OR = "OR",
  NOT = "NOT",

  // Punctuation & Structure
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  LBRACKET = "LBRACKET",
  RBRACKET = "RBRACKET",
  COMMA = "COMMA",
  COLON = "COLON",
  NEWLINE = "NEWLINE",
  EOF = "EOF",
}

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  length: number;
}

export interface Token {
  type: TokenType;
  lexeme: string;
  literal?: number | string | boolean | null;
  loc: SourceLocation;
}

export const SINGLE_WORD_KEYWORDS: Record<string, TokenType> = {
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
