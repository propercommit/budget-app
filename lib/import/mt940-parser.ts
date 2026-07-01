import type {
  BankTransaction,
  StatementParser,
  TransactionDirection,
} from "./types";

/**
 * MT940 (SWIFT customer statement) parser.
 *
 * MT940 is a tag-based text format. A file holds one or more statements; each is
 * a sequence of `:NN:`/`:NNC:` fields. The fields this parser cares about:
 *
 * - `:20:`  transaction reference (marks the start of a statement)
 * - `:60F:` / `:60M:` opening balance — its currency applies to following lines
 * - `:61:`  statement line — one per transaction (date, D/C mark, amount, refs)
 * - `:86:`  information to account owner — free-text or `?NN`-structured details
 *           for the immediately preceding `:61:`
 * - `:62F:` / `:62M:` closing balance — ends the run of transactions
 *
 * A field's content may continue on following lines that do not start with a tag
 * (SWIFT wraps long values and puts `:61:` supplementary detail on its own line).
 *
 * Notable bank-independent quirks handled here:
 * - Amounts use a comma decimal separator and no thousands grouping (`1234,56`).
 * - Dates are `YYMMDD`; only the value date carries a year (entry date is `MMDD`).
 * - The reversal marks `RD`/`RC` invert direction relative to `D`/`C`.
 * - Files may be wrapped in SWIFT blocks `{1:..}{2:..}{4:<body>-}`.
 *
 * The `:86:` structured-subfield mapping (`?00` booking text, `?20`–`?29`
 * remittance, `?32`/`?33` counterparty) follows the common SWIFT convention but
 * should be validated against a real UBS export — banks vary in which subfields
 * they populate.
 */

/** Thrown when MT940 input is structurally invalid (rather than dropping a row). */
export class Mt940ParseError extends Error {
  constructor(message: string) {

    super(message);
    this.name = "Mt940ParseError";
  }
}

/**
 * One `:61:` statement line after parsing, before it is merged with its optional
 * `:86:` details into a {@link BankTransaction}.
 */
interface StatementLine {
  date: string;
  amount: number;
  direction: TransactionDirection;
  /** Account-owner reference (`16x` after the type code), minus `NONREF`. */
  reference?: string;
  /** Servicing-institution reference (the `//16x` part), used as a dedup hint. */
  externalId?: string;
  /** `:61:` supplementary detail (the optional `34x` continuation line). */
  supplementary?: string;
}

/** Parsed `:86:` details contributing description/counterparty to a transaction. */
interface AccountOwnerInfo {
  description: string;
  counterparty?: string;
}

/** A tokenized MT940 field: its tag (`"61"`, `"86"`, …) and full (multi-line) content. */
interface Mt940Field {
  tag: string;
  content: string;
}

/** Matches the start of a field line, e.g. `:61:` or `:60F:`, capturing tag and inline content. */
const FIELD_TAG_RE = /^:(\d{2}[A-Z]?):(.*)$/;

/**
 * Decomposes a `:61:` value into its subfields:
 * value date, optional entry date, D/C mark, optional funds code, amount,
 * transaction type code, and the trailing reference/supplementary block.
 * The trailing group uses `[\s\S]` (not `.` with the `s` flag, which this
 * project's TS target predates) so it can span the supplementary continuation line.
 */
const STATEMENT_LINE_RE =
  /^(\d{6})(\d{4})?(R?[CD])([A-Z])?(\d[\d,]*)([A-Z][A-Z0-9]{3})([\s\S]*)$/;

/** Matches `:60F:`/`:62F:` balance content, capturing the 3-letter currency code. */
const BALANCE_RE = /^[CD]\d{6}([A-Z]{3})[\d,]*$/;

/**
 * Converts an MT940 `YYMMDD` date to `YYYY-MM-DD`.
 *
 * The two-digit year is resolved against a fixed pivot: `00`–`69` → 2000–2069,
 * `70`–`99` → 1970–1999. Bank statements imported into a budgeting app are
 * recent, so this comfortably covers real inputs.
 *
 * @throws {Mt940ParseError} if the month or day is out of range.
 */
function parseSwiftDate(yymmdd: string): string {

  const yy = Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));

  if (month < 1 || month > 12 || day < 1 || day > 31) throw new Mt940ParseError(`Invalid date "${yymmdd}" in :61: line`);

  const year = yy < 70 ? 2000 + yy : 1900 + yy;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");

  return `${year}-${mm}-${dd}`;
}

/**
 * Parses a SWIFT amount (comma decimal, no thousands grouping) into a number.
 *
 * @throws {Mt940ParseError} if the value is not a finite number.
 */
function parseSwiftAmount(raw: string): number {

  const value = Number(raw.replace(",", "."));

  if (!Number.isFinite(value)) throw new Mt940ParseError(`Invalid amount "${raw}" in :61: line`);

  return value;
}

/**
 * Resolves an MT940 D/C mark to a transaction direction.
 *
 * `D`/`C` are plain debit/credit. `RD`/`RC` are reversals: reversing a debit
 * returns money (a credit) and reversing a credit takes it back (a debit).
 */
function markToDirection(mark: string): TransactionDirection {
  switch (mark) {
    case "D":
      return "debit";
    case "C":
      return "credit";
    case "RD":
      return "credit";
    case "RC":
      return "debit";
    default:
      throw new Mt940ParseError(`Unknown debit/credit mark "${mark}" in :61: line`);
  }
}

/** Normalizes line endings and unwraps the SWIFT `{4:..-}` envelope when present. */
function extractBody(raw: string): string {

  const normalized = raw.replace(/\r\n?/g, "\n");
  const blockStart = normalized.indexOf("{4:");

  if (blockStart === -1) return normalized;

  const body = normalized.slice(blockStart + 3);
  const blockEnd = body.lastIndexOf("\n-}");

  return blockEnd === -1 ? body : body.slice(0, blockEnd);
}

/**
 * Splits MT940 text into fields, folding continuation lines (those not starting
 * with a `:NN:` tag) into the preceding field's content. Lines before the first
 * tag (envelope remnants) and the lone `-` end-of-block marker are ignored.
 */
function tokenizeFields(body: string): Mt940Field[] {

  const fields: Mt940Field[] = [];
  let current: Mt940Field | null = null;

  for (const line of body.split("\n")) {
    if (line === "-") continue;

    const match = FIELD_TAG_RE.exec(line);

    // Continuation line (no tag): fold it into the field being built, then move on.
    if (match === null) {
      if (current !== null) current.content += `\n${line}`;

      continue;
    }

    // New field: close out the previous one and start fresh.
    if (current !== null) fields.push(current);

    current = { tag: match[1], content: match[2] };
  }

  if (current !== null) fields.push(current);

  return fields;
}

/** Parses the trailing reference block of a `:61:` line (`ownerRef[//bankRef][\nsupplementary]`). */
function parseReferences(rest: string): Pick<
  StatementLine,
  "reference" | "externalId" | "supplementary"
> {

  let head = rest;
  let supplementary: string | undefined;
  const newlineIndex = head.indexOf("\n");

  if (newlineIndex !== -1) {
    supplementary = head.slice(newlineIndex + 1).trim() || undefined;
    head = head.slice(0, newlineIndex);
  }

  let reference: string | undefined;
  let externalId: string | undefined;
  const slashIndex = head.indexOf("//");

  if (slashIndex !== -1) {
    reference = head.slice(0, slashIndex).trim() || undefined;
    externalId = head.slice(slashIndex + 2).trim() || undefined;
  } else {
    reference = head.trim() || undefined;
  }

  if (reference === "NONREF") reference = undefined;

  return { reference, externalId, supplementary };
}

/** Parses a single `:61:` field value into a {@link StatementLine}. */
function parseStatementLine(content: string): StatementLine {

  const match = STATEMENT_LINE_RE.exec(content);

  if (match === null) throw new Mt940ParseError(`Malformed :61: line: "${content.split("\n")[0]}"`);

  const [, valueDate, , mark, , amount, , rest] = match;

  return {
    date: parseSwiftDate(valueDate),
    amount: parseSwiftAmount(amount),
    direction: markToDirection(mark),
    ...parseReferences(rest),
  };
}

/** True when a `:86:` body uses the `?NN` structured-subfield convention. */
function isStructured86(content: string): boolean {
  return /\?\d{2}/.test(content);
}

/**
 * Parses a structured `:86:` body. Subfields are introduced by `?` + a 2-digit
 * code; the same code may repeat across wrapped lines, so values are concatenated
 * in order. Maps `?00` (booking text) + `?20`–`?29` (remittance) into the
 * description and `?32`/`?33` into the counterparty name.
 */
function parseStructured86(content: string): AccountOwnerInfo {

  const joined = content.replace(/\n/g, "");
  const segments = joined.split(/\?(\d{2})/);
  const subfields = new Map<string, string>();

  for (let i = 1; i < segments.length; i += 2) {
    const code = segments[i];
    const value = segments[i + 1] ?? "";

    subfields.set(code, (subfields.get(code) ?? "") + value);
  }

  const bookingText = (subfields.get("00") ?? "").trim();

  let remittance = "";

  for (let code = 20; code <= 29; code++) remittance += subfields.get(String(code).padStart(2, "0")) ?? "";

  remittance = remittance.trim();

  const counterparty =
    `${subfields.get("32") ?? ""}${subfields.get("33") ?? ""}`.trim() || undefined;

  const description =
    [bookingText, remittance].filter((part) => part.length > 0).join(" — ") ||
    joined.replace(/\?\d{2}/g, " ").replace(/\s+/g, " ").trim();

  return { description, counterparty };
}

/** Collapses an unstructured (free-text) `:86:` body into a single-line description. */
function parseUnstructured86(content: string): AccountOwnerInfo {

  const description = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ");

  return { description };
}

/** Parses a `:86:` field value into description/counterparty details. */
function parse86(content: string): AccountOwnerInfo {
  return isStructured86(content)
    ? parseStructured86(content)
    : parseUnstructured86(content);
}

/** Merges a `:61:` line with its optional `:86:` details into a {@link BankTransaction}. */
function buildTransaction(
  line: StatementLine,
  currency: string | undefined,
  info: AccountOwnerInfo | undefined,
): BankTransaction {

  // `||` (not `??`) is deliberate: each source may be an empty string, and an
  // empty string should fall through to the next candidate just like `undefined`.
  const description =
    info?.description || line.supplementary || line.reference || "";

  const transaction: BankTransaction = {
    date: line.date,
    amount: line.amount,
    direction: line.direction,
    description,
  };

  // These optionals are normalized to a non-empty string or `undefined` at the
  // parse boundary, so "present" is an explicit `!== undefined` check.
  if (info?.counterparty !== undefined) transaction.counterparty = info.counterparty;

  if (line.reference !== undefined) transaction.reference = line.reference;

  if (line.externalId !== undefined) transaction.externalId = line.externalId;

  if (currency !== undefined) transaction.currency = currency;

  return transaction;
}

/** Reads the currency code out of a `:60F:`/`:62F:` balance field, or `undefined`. */
function parseBalanceCurrency(content: string): string | undefined {

  const match = BALANCE_RE.exec(content.trim());

  return match === null ? undefined : match[1];
}

/**
 * Parser for UBS-style MT940 SWIFT customer statements.
 *
 * Pure and side-effect free, per the {@link StatementParser} contract: it turns
 * raw MT940 text into normalized {@link BankTransaction}s and nothing else.
 */
export class Mt940Parser implements StatementParser {
  readonly format = "mt940";

  /** Recognizes MT940 by the mandatory reference (`:20:`) and an opening balance (`:60F:`/`:60M:`). */
  canParse(raw: string): boolean {

    const body = extractBody(raw);

    return /(^|\n):20:/.test(body) && /(^|\n):60[FM]:/.test(body);
  }

  /**
   * Parses MT940 text into normalized transactions.
   *
   * Walks the fields in order: each `:61:` opens a transaction, an immediately
   * following `:86:` supplies its details, and any of `:62F:`/`:62M:`/`:20:` (or
   * end of input) closes the current transaction even when no `:86:` followed.
   * The currency from the most recent `:60F:`/`:60M:` opening balance is attached
   * to subsequent transactions.
   *
   * @throws {Mt940ParseError} if a `:61:` line is structurally invalid.
   */
  parse(raw: string): BankTransaction[] {

    const fields = tokenizeFields(extractBody(raw));
    const transactions: BankTransaction[] = [];
    let currency: string | undefined;
    let pending: StatementLine | null = null;

    const flushPending = (): void => {
      if (pending !== null) {
        transactions.push(buildTransaction(pending, currency, undefined));
        pending = null;
      }
    };

    for (const field of fields) {
      switch (field.tag) {
        case "60F":
        case "60M":
          currency = parseBalanceCurrency(field.content) ?? currency;
          break;
        case "61":
          flushPending();
          pending = parseStatementLine(field.content);
          break;
        case "86":
          if (pending !== null) {
            transactions.push(buildTransaction(pending, currency, parse86(field.content)));
            pending = null;
          }
          break;
        case "20":
        case "62F":
        case "62M":
          flushPending();
          break;
        default:
          break;
      }
    }
    flushPending();

    return transactions;
  }
}

/** Shared singleton MT940 parser. */
export const mt940Parser = new Mt940Parser();
