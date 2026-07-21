/**
 * Pure client-side model of the MT940 import review flow: wire mirrors of the
 * preview/commit API shapes, the per-transaction review row state machine
 * (assign / exclude / undo / rule-learning chips), section + confirm-gating
 * selectors, and the fate builder that turns a reviewed batch into the commit
 * payload. No React, no IO — the import popin owns a `ReviewRow[]` and maps
 * rows through these transitions.
 *
 * Fate semantics encoded here (must stay aligned with the commit route):
 * keeping a match's destination is a CONFIRMATION and carries the candidate's
 * `ruleId` (bump by id, never fork); recategorizing away from every candidate
 * is a correction and carries neither `ruleId` nor `learnKey`; a confirmed
 * learning chip on an unknown-born row carries its token as `learnKey`; a
 * rule-excluded row left excluded confirms its exclude rule by `ruleId`.
 */

import type { BankTransaction, ReconciliationResult } from "@/lib/import/types";
import type { MatchCandidate, RuleValue } from "@/lib/categorize/match";
import { NOISE_TOKENS, type Fate } from "@/lib/categorize/learn";
import { MAX_AMOUNT_CENTS, MAX_FILENAME_LENGTH, MAX_LEARN_KEY_LENGTH } from "@/lib/import/limits";

export { MAX_IMPORT_TRANSACTIONS } from "@/lib/import/limits";

// ---------------------------------------------------------------------------
// Wire contracts — client mirrors of the preview/commit route response shapes
// ---------------------------------------------------------------------------

/** A pointered series' live coordinates — where entries will actually land. */
export interface EffectiveDestination {
  seriesId: string;
  name: string;
  categoryId: string;
}

/**
 * A match candidate as the preview serves it. When `destination` is non-null
 * it names the card's CURRENT category — display and route by it, never by
 * the rule's possibly-stale `value.categoryId`.
 */
export interface PreviewCandidate extends MatchCandidate {
  ruleId: string;
  destination: EffectiveDestination | null;
}

export type PreviewMatch =
  | { tier: "confident"; candidate: PreviewCandidate }
  | { tier: "suggested"; candidates: PreviewCandidate[] }
  | { tier: "unknown" };

export interface PreviewTransaction {
  tx: BankTransaction;
  match: PreviewMatch;
  statementIndex: number;
}

export interface PreviewResponse {
  reconciliation: ReconciliationResult[];
  transactions: PreviewTransaction[];
}

export interface CommitPayload {
  transactions: { tx: BankTransaction; fate: Fate }[];
  filename?: string;
  statementStart?: string;
  statementEnd?: string;
}

export interface CommitResult {
  importId: string;
  counts: { total: number; imported: number; excluded: number; spending: number; income: number };
}

// ---------------------------------------------------------------------------
// Review row model
// ---------------------------------------------------------------------------

/** Sentinel destination id for "route to income" (credits only). */
export const INCOME_DESTINATION_ID = "income";

export type RowTier = "unknown" | "assigned" | "suggested" | "matched" | "excluded";

export type ExcludeKind = "once" | "always";

/**
 * The rule-learning chip under a decided row: candidate tokens from the bank
 * text, the selected learn key, and whether the user saved or dismissed the
 * rule question.
 */
export interface RuleChip {
  kind: "assign" | "exclude";
  tokens: string[];
  selected: number;
  status: "open" | "confirmed" | "dismissed";
}

/**
 * One transaction under review. `dest` is a category id or
 * {@link INCOME_DESTINATION_ID}; `inDecisions` pins a row to the "Needs your
 * decision" section for its whole life (unknown-born rows, and excluded-born
 * rows the user re-included), so decided rows never vanish from the pile —
 * they collapse to a resolved line or a tombstone in place.
 */
export interface ReviewRow {
  id: number;
  tx: BankTransaction;
  tier: RowTier;
  dest: string | null;
  candidates: PreviewCandidate[];
  chip: RuleChip | null;
  expanded: boolean;
  accepted: boolean;
  excludeKind: ExcludeKind | null;
  /** Exclude-rule confirmation target — set only on rule-excluded rows still untouched by the user. */
  excludeRuleId: string | null;
  /** Pre-exclusion standing, for Undo/Re-include; null while not excluded by the user. */
  prev: { tier: "unknown" | "assigned"; dest: string | null } | null;
  inDecisions: boolean;
  /** Permanently excluded (unroutable amount) — no Re-include, never written. */
  locked: boolean;
  /**
   * Text-less line: the server can't name an entry from it, so the only legal
   * decision is exclusion — {@link assignDestination} refuses anything else.
   */
  excludeOnly: boolean;
}

/**
 * True when the commit route would refuse to WRITE this transaction (zero or
 * over-cap amount). Such rows are born excluded and locked — the server still
 * accepts them as echoed skips.
 */
export function unroutableAmount(tx: BankTransaction): boolean {
  return tx.amount <= 0 || tx.amount > MAX_AMOUNT_CENTS;
}

/**
 * True when the transaction carries no text the server could name an entry
 * from — routing it without a learned key would 400 the whole batch, so the
 * review only offers exclusion for these.
 */
export function textlessTx(tx: BankTransaction): boolean {
  return tx.description.trim().length === 0 && (tx.counterparty ?? "").trim().length === 0;
}

/** The effective destination id a candidate routes to; null for exclude rules. */
export function candidateDestination(candidate: PreviewCandidate): string | null {

  if (candidate.value.type === "income") return INCOME_DESTINATION_ID;

  if (candidate.value.type === "exclude") return null;

  return candidate.destination !== null ? candidate.destination.categoryId : candidate.value.categoryId;
}

/** Best routable candidate (candidates arrive best-first); null when every candidate excludes. */
export function defaultCandidate(candidates: PreviewCandidate[]): PreviewCandidate | null {
  return candidates.find((candidate) => candidate.value.type !== "exclude") ?? null;
}

/** Maps the staged preview into the initial review rows, one per transaction. */
export function buildReviewRows(preview: PreviewResponse): ReviewRow[] {

  return preview.transactions.map((entry, index): ReviewRow => {

    const base: ReviewRow = {
      id: index,
      tx: entry.tx,
      tier: "unknown",
      dest: null,
      candidates: [],
      chip: null,
      expanded: false,
      accepted: false,
      excludeKind: null,
      excludeRuleId: null,
      prev: null,
      inDecisions: true,
      locked: false,
      excludeOnly: textlessTx(entry.tx),
    };

    if (unroutableAmount(entry.tx)) return { ...base, tier: "excluded", excludeKind: "once", inDecisions: false, locked: true };

    if (entry.match.tier === "confident") {
      const candidate = entry.match.candidate;

      if (candidate.value.type === "exclude") return { ...base, tier: "excluded", excludeKind: "always", excludeRuleId: candidate.ruleId, inDecisions: false };

      return { ...base, tier: "matched", dest: candidateDestination(candidate), candidates: [candidate], inDecisions: false };
    }

    if (entry.match.tier === "suggested") {
      const candidates = entry.match.candidates;
      const preferred = defaultCandidate(candidates);

      if (preferred === null) return base;

      return { ...base, tier: "suggested", dest: candidateDestination(preferred), candidates, inDecisions: false };
    }

    return base;
  });
}

// ---------------------------------------------------------------------------
// Row transitions (all pure — return a new row)
// ---------------------------------------------------------------------------

/**
 * Routes a row to a destination. An unknown row becomes assigned and spawns
 * the rule-learning chip; picking on a suggested row is an implicit accept;
 * on assigned/matched rows it just recategorizes. Every path collapses the
 * pill rail.
 */
export function assignDestination(row: ReviewRow, dest: string): ReviewRow {

  // The server could never name an entry from this line — routing it would
  // 400 the whole batch, so the model refuses just like the UI does.
  if (row.excludeOnly) return row;

  if (row.tier === "unknown") return { ...row, tier: "assigned", dest, expanded: false, chip: makeChip(row.tx.description, "assign") };

  if (row.tier === "suggested") return { ...row, dest, accepted: true, expanded: false };

  return { ...row, dest, expanded: false };
}

/**
 * Excludes a row from the import. Snapshots the previous standing for Undo,
 * pins the tombstone into the decision pile, and — for "always" — spawns the
 * skip-rule chip.
 */
export function excludeRow(row: ReviewRow, kind: ExcludeKind): ReviewRow {

  return {
    ...row,
    prev: { tier: row.tier === "assigned" ? "assigned" : "unknown", dest: row.dest },
    tier: "excluded",
    excludeKind: kind,
    expanded: false,
    inDecisions: true,
    chip: kind === "always" ? makeChip(row.tx.description, "exclude") : null,
  };
}

/** Tombstone Undo: restores the row's pre-exclusion standing and drops any chip. */
export function undoExclude(row: ReviewRow): ReviewRow {

  if (row.prev === null) return row;

  return {
    ...row,
    tier: row.prev.tier,
    dest: row.prev.dest,
    excludeKind: null,
    chip: null,
    prev: null,
  };
}

/**
 * Re-include from the Excluded pile. A session-excluded row restores its
 * previous standing; a rule-excluded row re-enters the decision pile as a
 * fresh unknown (its exclude rule is no longer being confirmed).
 */
export function reincludeRow(row: ReviewRow): ReviewRow {

  if (row.locked) return row;

  if (row.prev !== null) return undoExclude(row);

  return { ...row, tier: "unknown", dest: null, excludeKind: null, excludeRuleId: null, inDecisions: true };
}

/** Toggles a suggested row's advisory accept check. */
export function toggleAccepted(row: ReviewRow): ReviewRow {
  return { ...row, accepted: !row.accepted, expanded: false };
}

/** Toggles the category pill rail on a decided row. */
export function toggleExpanded(row: ReviewRow): ReviewRow {
  return { ...row, expanded: !row.expanded };
}

function withChip(row: ReviewRow, patch: Partial<RuleChip>): ReviewRow {

  if (row.chip === null) return row;

  return { ...row, chip: { ...row.chip, ...patch } };
}

/** Selects the chip's learn-key token. */
export function chipSelectToken(row: ReviewRow, index: number): ReviewRow {

  if (row.chip === null || index < 0 || index >= row.chip.tokens.length) return row;

  return withChip(row, { selected: index });
}

/** Saves the rule question — the selected token becomes the fate's learn key. */
export function chipConfirm(row: ReviewRow): ReviewRow {
  return withChip(row, { status: "confirmed" });
}

/** Dismisses the rule question — nothing is learned for this row. */
export function chipDismiss(row: ReviewRow): ReviewRow {
  return withChip(row, { status: "dismissed" });
}

/** Reopens a settled chip (done-state Undo). */
export function chipReopen(row: ReviewRow): ReviewRow {
  return withChip(row, { status: "open" });
}

// ---------------------------------------------------------------------------
// Sections, progress & gating
// ---------------------------------------------------------------------------

export interface ReviewSections {
  decisions: ReviewRow[];
  suggested: ReviewRow[];
  matched: ReviewRow[];
  excluded: ReviewRow[];
}

/**
 * Splits rows into the four review sections. Tombstoned decision rows appear
 * BOTH in the decision pile (as tombstones) and in the Excluded pile —
 * nothing disappears silently.
 */
export function sectionsOf(rows: ReviewRow[]): ReviewSections {

  return {
    decisions: rows.filter((row) => row.inDecisions),
    suggested: rows.filter((row) => row.tier === "suggested"),
    matched: rows.filter((row) => row.tier === "matched"),
    excluded: rows.filter((row) => row.tier === "excluded"),
  };
}

/** Rows still awaiting a decision — the only thing that gates Confirm. */
export function openDecisionCount(rows: ReviewRow[]): number {
  return rows.filter((row) => row.tier === "unknown").length;
}

/** Rows that will be written on confirm (everything not excluded). */
export function confirmCount(rows: ReviewRow[]): number {
  return rows.filter((row) => row.tier !== "excluded").length;
}

/**
 * The confirm gate: every unknown decided, and the statement reconciles —
 * unless the user explicitly ticked "Import anyway".
 */
export function canConfirm(rows: ReviewRow[], reconciles: boolean, importAnyway: boolean): boolean {
  return openDecisionCount(rows) === 0 && (reconciles || importAnyway);
}

/** Rules the review will learn on confirm — feeds the success summary panel. */
export interface LearnedRule {
  token: string;
  /** Category id, {@link INCOME_DESTINATION_ID}, or null for a skip rule. */
  dest: string | null;
}

/** The rules this batch will learn: one per confirmed chip, in row order. */
export function learnedRules(rows: ReviewRow[]): LearnedRule[] {

  return rows.flatMap((row) => {
    const token = confirmedLearnKey(row);

    if (token === null) return [];

    return [{ token, dest: row.chip !== null && row.chip.kind === "exclude" ? null : row.dest }];
  });
}

// ---------------------------------------------------------------------------
// Fates & commit payload
// ---------------------------------------------------------------------------

/** The learn key a confirmed chip contributes; null while open or dismissed. */
export function confirmedLearnKey(row: ReviewRow): string | null {

  if (row.chip === null || row.chip.status !== "confirmed") return null;

  return row.chip.tokens[row.chip.selected] ?? null;
}

function fateOf(row: ReviewRow): Fate {

  if (row.tier === "excluded") {
    if (row.excludeRuleId !== null) return { kind: "route", value: { type: "exclude" }, ruleId: row.excludeRuleId };

    const learnKey = confirmedLearnKey(row);

    if (row.excludeKind === "always" && learnKey !== null) return { kind: "alwaysExclude", learnKey };

    return { kind: "skip" };
  }

  // Unreachable behind the confirm gate — emitting a skip means a stray call
  // can never smuggle an undecided row into the batch.
  if (row.tier === "unknown" || row.dest === null) return { kind: "skip" };

  const value: RuleValue = row.dest === INCOME_DESTINATION_ID ? { type: "income" } : { type: "spending", categoryId: row.dest };

  if (row.tier === "assigned") {
    const learnKey = confirmedLearnKey(row);

    return learnKey === null ? { kind: "route", value } : { kind: "route", value, learnKey };
  }

  // Suggested/matched: keeping a candidate's effective destination CONFIRMS
  // that rule (bump by id — forking by identity would split the key into
  // suggested-tier ambiguity); anything else is a correction the server
  // learns against the matched key on its own.
  const confirmed = row.candidates.find((candidate) => candidateDestination(candidate) === row.dest);

  return confirmed === undefined ? { kind: "route", value } : { kind: "route", value, ruleId: confirmed.ruleId };
}

/**
 * Builds the atomic commit body: every transaction echoed back verbatim with
 * its reviewed fate, plus provenance (filename, statement period from the
 * first opening / last closing balance).
 */
export function buildCommitPayload(
  rows: ReviewRow[],
  filename: string,
  reconciliation: ReconciliationResult[],
): CommitPayload {

  const payload: CommitPayload = { transactions: rows.map((row) => ({ tx: row.tx, fate: fateOf(row) })) };

  if (filename.length > 0) payload.filename = filename.slice(0, MAX_FILENAME_LENGTH);

  const first = reconciliation[0];
  const last = reconciliation[reconciliation.length - 1];

  if (first !== undefined && first.openingBalance !== undefined) payload.statementStart = first.openingBalance.date;

  if (last !== undefined && last.closingBalance !== undefined) payload.statementEnd = last.closingBalance.date;

  return payload;
}

// ---------------------------------------------------------------------------
// Reconciliation display
// ---------------------------------------------------------------------------

/** True only when every statement in the file reconciles exactly. */
export function overallReconciles(reconciliation: ReconciliationResult[]): boolean {
  return reconciliation.every((entry) => entry.reconciled === true);
}

/** The first non-reconciling statement, for the warning banner; null when clean. */
export function firstFailing(reconciliation: ReconciliationResult[]): ReconciliationResult | null {
  return reconciliation.find((entry) => entry.reconciled === false) ?? null;
}

/** The warning banner sentence for a non-reconciling statement. */
export function reconcileWarnText(failing: ReconciliationResult): string {

  if (failing.actualClosing === undefined) return "This statement doesn’t include a closing balance to verify against.";

  const currency = failing.closingBalance?.currency ?? failing.openingBalance?.currency ?? "";
  const suffix = currency.length > 0 ? ` ${currency}` : "";
  const opening = failing.expectedClosing - failing.movement;

  return `This statement doesn’t add up: opening ${formatCents2(opening)} + movements should close at ${formatCents2(failing.expectedClosing)}${suffix}, but the statement says ${formatCents2(failing.actualClosing)}${suffix} — off by ${formatCents2(Math.abs(failing.difference))}${suffix}.`;
}

// ---------------------------------------------------------------------------
// Formatting (review rows use the design's fixed en-US shape, not user prefs)
// ---------------------------------------------------------------------------

/** Integer cents → "1,234.56" (always two decimals, no currency symbol). */
export function formatCents2(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Signed row amount: "+" for credits, true minus (U+2212) for debits. */
export function amountLabel(tx: BankTransaction): string {
  return (tx.direction === "credit" ? "+" : "−") + formatCents2(tx.amount);
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Fixed en-US month names — review dates are design-fixed, not user-preference formatted. */
export const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "YYYY-MM-DD" → "3 Jun" — sliced from the string, so timezone-proof. */
export function shortDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${SHORT_MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

/**
 * "1 – 30 June 2026"-style statement period from the first opening and
 * last closing balance dates; null when the statement carries no balances.
 */
export function periodLabel(reconciliation: ReconciliationResult[]): string | null {

  const start = reconciliation[0]?.openingBalance?.date;
  const end = reconciliation[reconciliation.length - 1]?.closingBalance?.date;

  if (start === undefined || end === undefined) return null;

  const startDay = Number(start.slice(8, 10));
  const endDay = Number(end.slice(8, 10));
  const startMonth = FULL_MONTHS[Number(start.slice(5, 7)) - 1];
  const endMonth = FULL_MONTHS[Number(end.slice(5, 7)) - 1];
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);

  if (startYear !== endYear) return `${startDay} ${startMonth} ${startYear} – ${endDay} ${endMonth} ${endYear}`;

  if (startMonth !== endMonth) return `${startDay} ${startMonth} – ${endDay} ${endMonth} ${endYear}`;

  return `${startDay} – ${endDay} ${endMonth} ${endYear}`;
}

// ---------------------------------------------------------------------------
// Learn-key tokens
// ---------------------------------------------------------------------------

/**
 * Tokens never worth pre-selecting as a learn key: the server's noise list
 * (one owner — additions there propagate here) plus statement-text noise —
 * the default pick should be the merchant word, not the rail it rode in on.
 */
export const IMPORT_STOP_TOKENS: readonly string[] = [
  ...NOISE_TOKENS,
  "ZUERICH", "ZURICH", "GUTSCHRIFT", "BARGELDBEZUG", "BANCOMAT",
  "DAUERAUFTRAG", "RECHNUNG", "ABRECHNUNG", "UEBERTRAG", "BANKING",
  "KREDITKARTE", "MOBILE", "TICKETS", "RESTAURANT", "APOTHEKE", "BAHNHOF",
  "LOHN", "PRAEMIE", "VERSICHERUNG", "SPARKONTO", "CITY", "BUDGET",
  "JANUAR", "FEBRUAR", "MAERZ", "APRIL", "MAI", "JUNI",
  "JULI", "AUGUST", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DEZEMBER",
];

/**
 * Candidate learn-key tokens from the bank text: unique words of 3+ chars
 * that aren't pure numbers, first four only. Words over the server's
 * learn-key cap are dropped — offering one would 400 the commit.
 */
export function tokensOf(description: string): string[] {
  return [...new Set(description.split(/[\s,.\-\/]+/).filter((word) => word.length >= 3 && word.length <= MAX_LEARN_KEY_LENGTH && !/^\d+$/.test(word)))].slice(0, 4);
}

/**
 * A fresh rule-learning chip for a row's bank text — pre-selecting the first
 * non-noise token; null when the text yields no usable token (the fate then
 * simply learns nothing).
 */
export function makeChip(description: string, kind: "assign" | "exclude"): RuleChip | null {

  const tokens = tokensOf(description);

  if (tokens.length === 0) return null;

  const preferred = tokens.findIndex((token) => !IMPORT_STOP_TOKENS.includes(token.toUpperCase()));

  return { kind, tokens, selected: preferred < 0 ? 0 : preferred, status: "open" };
}

/** "usually Groceries — 12×" — the suggested row's evidence line; null when unbuildable. */
export function suggestionReason(row: ReviewRow, labelFor: (destinationId: string) => string): string | null {

  const preferred = defaultCandidate(row.candidates);

  if (preferred === null) return null;

  const dest = candidateDestination(preferred);

  if (dest === null) return null;

  return `usually ${labelFor(dest)} — ${preferred.rule.useCount}×`;
}
