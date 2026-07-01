/**
 * Money parsing — the single controlled entry point for turning a
 * user-entered decimal string into an amount.
 *
 * WHY THIS MODULE EXISTS
 * Money must be reasoned about in integer minor units (cents), never as an
 * IEEE-754 float: doubles cannot represent most decimal fractions, so
 * `parseFloat("0.29") * 100` is `28.999…` and summed amounts drift (see the
 * money rule in CLAUDE.md). Parsing is where a stray sub-cent value or a bad
 * `parseFloat` first enters the system, so every amount the user types is
 * funnelled through one validated, integer-exact function here instead of
 * scattered `parseFloat(x)` calls.
 *
 * WHAT THIS DOES AND DOES NOT FIX
 * This controls *input*: it rejects malformed/negative/zero amounts and rounds
 * cleanly to whole cents via integer math. It does **not** make the app's
 * stored `Float` columns exact — summation drift lives in aggregation/storage
 * and is only removed by migrating those columns to integer cents. This module
 * is the seam that makes that migration a one-call change: callers move from
 * {@link parseMoneyInput} (major-unit float, for today's `Float` schema) to
 * {@link parseAmountToCents} (integer cents) and the `/ 100` boundary is dropped.
 */

/** Upper bound on accepted cents — keeps results well inside `Number.MAX_SAFE_INTEGER` while covering every route's amount cap. */
const MAX_CENTS = 1e15;

/**
 * Combine an already-parsed whole-number part and a fractional digit string into
 * integer minor units (cents), half-up rounding anything beyond two fractional
 * digits (`fraction[2] >= 5` carries a cent) and right-padding fewer digits.
 *
 * The two digit groups are combined arithmetically, never through a float, so
 * `(10, "29")` is exactly `1029` with none of the `parseFloat("0.29") * 100`
 * rounding error. This is the single source of truth for the string→cents
 * rounding rule, shared by {@link parseAmountToCents} (dot-decimal user input)
 * and the MT940 `parseSwiftAmount` (comma-decimal SWIFT amounts); callers own
 * their own input regex, sign, cap and safe-integer validation.
 */
export function decimalPartsToCents(whole: number, fraction: string): number {
  return fraction.length <= 2
    ? whole * 100 + Number(fraction.padEnd(2, "0"))
    : whole * 100 + Number(fraction.slice(0, 2)) + (Number(fraction[2]) >= 5 ? 1 : 0);
}

/**
 * Parse a user-entered decimal string (dot decimal, e.g. `"10.10"`) into integer
 * minor units (cents) — `"10.10"` → `1010`, `".50"` → `50`. Returns `null` when
 * the input is not a well-formed, strictly-positive amount.
 *
 * The conversion goes string → integer directly (never through a float), so
 * there is no `parseFloat(x) * 100` rounding error. More than two fractional
 * digits are half-up rounded to the cent; a bare `"10."` or `""`/`"abc"` is
 * rejected. Leading/trailing whitespace is tolerated.
 */
export function parseAmountToCents(raw: string): number | null {

  const match = /^\s*(\d*)(?:\.(\d+))?\s*$/.exec(raw);

  if (match === null) return null;

  const wholeStr = match[1];
  const fraction = match[2] ?? "";

  if (wholeStr === "" && fraction === "") return null;

  const whole = wholeStr === "" ? 0 : Number(wholeStr);

  const cents = decimalPartsToCents(whole, fraction);

  if (cents <= 0 || cents > MAX_CENTS || !Number.isSafeInteger(cents)) return null;

  return cents;
}

/**
 * Convert integer minor units back to a major-unit number — the boundary into
 * the app's legacy `Float` money columns (and display). A single exact-integer
 * division; the residual float imprecision is the storage format's, not this
 * conversion's, and disappears once the columns move to integer cents.
 */
export function centsToAmount(cents: number): number {
  return cents / 100;
}

/**
 * Parse a user-entered amount string into a validated **major-unit** number for
 * the app's current `Float`-backed APIs, or `null` when the input is invalid or
 * not strictly positive. Rounds to whole cents via integer math, so `"10.999"`
 * becomes `11` and no `parseFloat` sub-cent noise reaches the database.
 *
 * Drop-in replacement for the scattered `parseFloat(x)` / `parseFloat(x) > 0`
 * money handling in the edit popins: `parseMoneyInput(x) !== null` is the
 * validity check, and the same value is the amount to save.
 */
export function parseMoneyInput(raw: string): number | null {

  const cents = parseAmountToCents(raw);

  return cents === null ? null : centsToAmount(cents);
}
