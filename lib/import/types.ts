/**
 * Format-agnostic bank-statement import contract.
 *
 * Every statement parser (MT940 today; CSV/OFX/etc. later) consumes a raw file
 * and emits {@link BankTransaction}[]. This neutral shape is the seam that keeps
 * the rest of the import pipeline (categorization, dedup, persistence, UI)
 * independent of any single bank format: switching formats means writing a new
 * {@link StatementParser}, not touching anything downstream.
 *
 * Deliberately knows nothing about the app's Prisma models — no `categoryId`,
 * no `SpendingItem`. Mapping a `BankTransaction` onto the data model is a later,
 * separate concern.
 */

/** Whether money left the account (`debit`) or entered it (`credit`). */
export type TransactionDirection = "debit" | "credit";

/**
 * A single, normalized bank transaction — the boundary type produced by every
 * parser and consumed by the rest of the import pipeline.
 */
export interface BankTransaction {
  /**
   * Transaction date as a zero-padded `YYYY-MM-DD` string. For MT940 this is the
   * value date (the only date that carries a year); the `YYYY-MM` prefix is what
   * the app keys spending/income months on.
   */
  date: string;
  /** Magnitude of the transaction, always positive. Direction is in {@link direction}. */
  amount: number;
  /** Whether the amount left (`debit`) or entered (`credit`) the account. */
  direction: TransactionDirection;
  /**
   * Human-readable description (counterparty, purpose, remittance info). May be
   * empty when the source provides no usable text. Never `undefined` so callers
   * can render it without a null check.
   */
  description: string;
  /** Counterparty name when the source identifies one separately from {@link description}. */
  counterparty?: string;
  /**
   * Reference assigned by the account owner (e.g. a payment reference). Absent
   * when the source carries none, or a placeholder such as `NONREF`.
   */
  reference?: string;
  /**
   * Best-effort stable identifier from the source (e.g. MT940's bank reference).
   * Intended as a dedup hint for re-imports — NOT guaranteed unique or present,
   * so the importer must fall back to a date+amount+description heuristic.
   */
  externalId?: string;
  /** ISO 4217 currency code when the source states one (e.g. `CHF`). */
  currency?: string;
}

/**
 * Strategy interface implemented once per supported file format. Implementations
 * must be pure: no I/O, no DB, no global state — just `raw text -> transactions`.
 */
export interface StatementParser {
  /** Stable identifier for the format this parser handles, e.g. `"mt940"`. */
  readonly format: string;
  /**
   * Cheap heuristic: does `raw` look like this parser's format? Used to pick a
   * parser before committing to a (potentially throwing) {@link parse}. Must not
   * throw — return `false` on anything unrecognized.
   */
  canParse(raw: string): boolean;
  /**
   * Parse `raw` into normalized transactions. Implementations should throw on
   * structurally invalid input rather than silently dropping transactions —
   * losing a financial row must be loud, not quiet.
   */
  parse(raw: string): BankTransaction[];
}
