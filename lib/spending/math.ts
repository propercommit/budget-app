/**
 * Direction-aware `spent` arithmetic — the single source of truth for how a
 * spending entry affects a card's running total.
 *
 * Amounts are integer minor units (cents) and always positive magnitudes;
 * the sign of an entry's effect comes from `direction` (YNAB-style
 * contra-expense: a credit/refund subtracts). A running total may
 * legitimately go negative (e.g. a refund lands in a later month than the
 * expense) — that is valid data and must never be clamped here or in any
 * business logic; clamping happens only in presentation geometry.
 */

/** Minimal shape of an entry as far as `spent` math is concerned. */
export type EntryLike = {
  amount: number; // integer cents, always positive
  direction: "debit" | "credit";
};

/** The single definition of how an entry affects a card's spent. */
export function applyEntry(spent: number, entry: EntryLike): number {
  return entry.direction === "debit"
    ? spent + entry.amount
    : spent - entry.amount;
}

/** Inverse of {@link applyEntry} — used when removing an entry from a running total. */
export function unapplyEntry(spent: number, entry: EntryLike): number {
  return entry.direction === "debit"
    ? spent - entry.amount
    : spent + entry.amount;
}

/**
 * Signed total of a set of entries — {@link applyEntry} folded over zero. The
 * one way to derive a card's `spent` from its entries; may legitimately be
 * negative (see module doc).
 */
export function sumEntries(entries: EntryLike[]): number {
  return entries.reduce((sum, entry) => applyEntry(sum, entry), 0);
}
