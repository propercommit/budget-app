import { decimalPartsToCents } from "@/lib/money";

import type {
  BankStatement,
  BankTransaction,
  ReconciliationResult,
  StatementBalance,
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

/**
 * A statement under construction while walking fields. Carries the running
 * `currency` (from the opening balance) so transactions can be tagged as they
 * are built; it is dropped when converting to the public {@link BankStatement}.
 */
interface DraftStatement {
  transactions: BankTransaction[];
  openingBalance?: StatementBalance;
  closingBalance?: StatementBalance;
  currency?: string;
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

/** Matches `:60F:`/`:62F:` balance content: D/C mark, `YYMMDD` date, currency, amount. */
const BALANCE_RE = /^([CD])(\d{6})([A-Z]{3})(\d+(?:,\d+)?)$/;

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
 * Parses a SWIFT amount (comma decimal separator, no thousands grouping) into
 * **integer minor units** — `"1234,56"` → `123456`, `"10,1"` → `1010`.
 *
 * Parsing goes string → integer directly (never through a float) so no rounding
 * error is introduced at the boundary: the whole and fractional digit groups
 * are combined arithmetically. This is what lets many amounts be summed and
 * compared against a statement balance exactly (see {@link BankTransaction}).
 *
 * Assumes two fractional digits — the minor-unit scale of CHF/EUR/USD and the
 * currencies this budgeting app handles. A value with more than two fractional
 * digits is half-up rounded to the cent; fewer digits are right-padded.
 *
 * @throws {Mt940ParseError} if `raw` is not a well-formed SWIFT amount or the
 * result exceeds the safe-integer range.
 */
function parseSwiftAmount(raw: string): number {

  const match = /^(\d+)(?:,(\d*))?$/.exec(raw);

  if (match === null) throw new Mt940ParseError(`Invalid amount "${raw}" in MT940 field`);

  const cents = decimalPartsToCents(Number(match[1]), match[2] ?? "");

  if (!Number.isSafeInteger(cents)) throw new Mt940ParseError(`Amount "${raw}" is out of safe integer range`);

  return cents;
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

/**
 * Strips a leading SWIFT business-transaction-type code from a `:86:` free-text
 * body. UBS prefixes unstructured details with a 3-character type code and a `?`
 * separator — e.g. `Z04?Gewerkschaft Unia`, `K70?SBB EASYRIDE`. The code is
 * bookkeeping metadata, not part of the human-readable description, so it is
 * removed. Anchoring to the start and requiring the `?` separator keeps it from
 * touching legitimate text that merely happens to contain a `?`.
 */
function stripTransactionTypeCode(content: string): string {
  return content.replace(/^[A-Z0-9]{3}\?/, "");
}

/** Collapses an unstructured (free-text) `:86:` body into a single-line description. */
function parseUnstructured86(content: string): AccountOwnerInfo {

  const description = stripTransactionTypeCode(content)
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

/**
 * Parses a `:60F:`/`:60M:`/`:62F:`/`:62M:` balance field into a
 * {@link StatementBalance}, or `undefined` when the content is not a balance.
 * The amount is integer minor units, like every other amount in this parser.
 */
function parseBalance(content: string): StatementBalance | undefined {

  const match = BALANCE_RE.exec(content.trim());

  if (match === null) return undefined;

  const [, mark, yymmdd, currency, amount] = match;

  return {
    direction: mark === "C" ? "credit" : "debit",
    amount: parseSwiftAmount(amount),
    currency,
    date: parseSwiftDate(yymmdd),
  };
}

/** Signed value of a balance in minor units: credits positive, debits negative. */
function signedBalanceCents(balance: StatementBalance): number {
  return balance.direction === "credit" ? balance.amount : -balance.amount;
}

/** Signed sum of a statement's transaction movements in minor units (credits `+`, debits `−`). */
function movementCents(transactions: BankTransaction[]): number {
  return transactions.reduce(
    (sum, txn) => sum + (txn.direction === "credit" ? txn.amount : -txn.amount),
    0,
  );
}

/**
 * Reconciles one statement: checks that `openingBalance + Σ movements` equals
 * `closingBalance`. Because every figure is an integer minor-unit value, the
 * equality is exact — clean statements never fail the way a float sum would.
 */
function reconcileStatement(statement: BankStatement): ReconciliationResult {

  const { openingBalance, closingBalance, transactions } = statement;

  const movement = movementCents(transactions);
  const opening = openingBalance !== undefined ? signedBalanceCents(openingBalance) : 0;
  const expectedClosing = opening + movement;

  const actualClosing =
    closingBalance !== undefined ? signedBalanceCents(closingBalance) : undefined;

  const reconciled =
    openingBalance !== undefined && actualClosing !== undefined && expectedClosing === actualClosing;

  const difference = actualClosing !== undefined ? expectedClosing - actualClosing : expectedClosing;

  return {
    reconciled,
    openingBalance,
    closingBalance,
    movement,
    expectedClosing,
    actualClosing,
    difference,
  };
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
   * Parses MT940 text into a flat list of normalized transactions, discarding
   * statement grouping and balances. Convenience wrapper over
   * {@link parseStatements} for callers that only need the transactions.
   *
   * @throws {Mt940ParseError} if a `:61:` line is structurally invalid.
   */
  parse(raw: string): BankTransaction[] {
    return this.parseStatements(raw).flatMap((statement) => statement.transactions);
  }

  /**
   * Parses MT940 text into its constituent statements, each carrying its
   * transactions plus opening/closing balances when present.
   *
   * Walks the fields in order: `:20:` opens a new statement; `:60F:`/`:60M:`
   * records the opening balance (its currency is attached to the statement's
   * transactions); each `:61:` opens a transaction, an immediately following
   * `:86:` supplies its details, and any of `:62F:`/`:62M:`/`:20:` (or end of
   * input) closes the current transaction even when no `:86:` followed;
   * `:62F:`/`:62M:` records the closing balance and ends the statement.
   *
   * @throws {Mt940ParseError} if a `:61:` line is structurally invalid.
   */
  parseStatements(raw: string): BankStatement[] {

    const fields = tokenizeFields(extractBody(raw));
    const statements: BankStatement[] = [];

    let draft: DraftStatement | null = null;
    let pending: StatementLine | null = null;

    const ensureDraft = (): DraftStatement => {
      if (draft === null) draft = { transactions: [] };

      return draft;
    };

    const flushPending = (): void => {
      if (pending !== null) {
        const target = ensureDraft();

        target.transactions.push(buildTransaction(pending, target.currency, undefined));
        pending = null;
      }
    };

    const finalize = (): void => {
      if (draft !== null) {
        statements.push({
          transactions: draft.transactions,
          openingBalance: draft.openingBalance,
          closingBalance: draft.closingBalance,
        });
        draft = null;
      }
    };

    for (const field of fields) {
      switch (field.tag) {
        case "20":
          flushPending();
          finalize();
          draft = { transactions: [] };
          break;
        case "60F":
        case "60M": {
          const opening = parseBalance(field.content);

          if (opening !== undefined) {
            const target = ensureDraft();

            target.openingBalance = opening;
            target.currency = opening.currency;
          }
          break;
        }
        case "61":
          flushPending();
          ensureDraft();
          pending = parseStatementLine(field.content);
          break;
        case "86":
          if (pending !== null) {
            const target = ensureDraft();

            target.transactions.push(buildTransaction(pending, target.currency, parse86(field.content)));
            pending = null;
          }
          break;
        case "62F":
        case "62M": {
          flushPending();
          const closing = parseBalance(field.content);

          if (closing !== undefined) ensureDraft().closingBalance = closing;
          break;
        }
        default:
          break;
      }
    }

    flushPending();
    finalize();

    return statements;
  }

  /**
   * Reconciles each statement in `raw`, returning one {@link ReconciliationResult}
   * per statement (in file order). Use this after {@link parse}/
   * {@link parseStatements} to verify an import against the bank's own balances
   * before persisting — a `reconciled: false` result means the parsed movements
   * do not add up to the stated closing balance and the import should be halted
   * for review rather than silently trusted.
   */
  reconcile(raw: string): ReconciliationResult[] {
    return this.parseStatements(raw).map(reconcileStatement);
  }
}

/** Shared singleton MT940 parser. */
export const mt940Parser = new Mt940Parser();
