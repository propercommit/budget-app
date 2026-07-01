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
  /**
   * Magnitude of the transaction in **integer minor units** (e.g. Rappen/cents),
   * always positive — `10.10` CHF is `1010`. Direction is in {@link direction}.
   *
   * Money is carried as integer minor units, not a floating-point major-unit
   * value, throughout the import pipeline. IEEE-754 doubles cannot represent
   * most decimal fractions, so summing many amounts drifts and an equality
   * check against a statement balance can spuriously fail on clean data.
   * Integers sum and compare exactly; the `/ 100` back to major units happens
   * only at the display/persistence boundary.
   */
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
 * A statement balance line (MT940 `:60F:`/`:60M:` opening, `:62F:`/`:62M:`
 * closing). The reconciliation seam: the sum of a statement's transaction
 * movements plus the opening balance must equal the closing balance.
 */
export interface StatementBalance {
  /** `credit` for a positive (in-credit) balance, `debit` for an overdrawn one. */
  direction: TransactionDirection;
  /** Balance magnitude in integer minor units (cents), always positive — sign is in {@link direction}. */
  amount: number;
  /** ISO 4217 currency code of the balance (e.g. `CHF`). */
  currency: string;
  /** Balance date as a zero-padded `YYYY-MM-DD` string. */
  date: string;
}

/**
 * One statement within a bank-statement file: its transactions and, when the
 * source provides them, its opening and closing balances. A single file may
 * hold several statements; each reconciles independently.
 */
export interface BankStatement {
  transactions: BankTransaction[];
  /** Opening balance (MT940 `:60F:`/`:60M:`), when present. */
  openingBalance?: StatementBalance;
  /** Closing balance (MT940 `:62F:`/`:62M:`), when present. */
  closingBalance?: StatementBalance;
}

/**
 * Outcome of reconciling one {@link BankStatement}: does `openingBalance +
 * Σ movements` equal `closingBalance`? All figures are **signed integer minor
 * units** (credits positive, debits negative), so the equality is exact — no
 * floating-point tolerance is involved or needed.
 */
export interface ReconciliationResult {
  /**
   * `true` only when both balances are present and `expectedClosing` exactly
   * equals `actualClosing`. `false` if either balance is missing or they differ.
   */
  reconciled: boolean;
  openingBalance?: StatementBalance;
  closingBalance?: StatementBalance;
  /** Signed sum of transaction movements in cents (credits `+`, debits `−`). */
  movement: number;
  /** `signed(openingBalance) + movement` in cents — what the closing balance should be (0 opening if absent). */
  expectedClosing: number;
  /** `signed(closingBalance)` in cents, or `undefined` when no closing balance was found. */
  actualClosing?: number;
  /** `expectedClosing − actualClosing` in cents; `0` exactly when reconciled. Falls back to `expectedClosing` when there is no closing balance. */
  difference: number;
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
