/**
 * Pure substring matcher: routes a bank transaction to income / a spending
 * category / exclusion by matching stored rule keys against the transaction's
 * text (D18/D18a). No Prisma, no IO — structural input types keep it callable
 * from routes and tests alike.
 *
 * Confidence derives from rule-row cardinality on the winning key: one row →
 * confident, several → suggested (sorted best-first), none → unknown. When
 * several distinct keys match, the longest key wins (more specific identity).
 * Direction-invalid candidates (income on a debit) are dropped before any
 * key selection or tier computation — D6: direction never routes, but a
 * debit can never BE income.
 */

/** Destination half of a rule (D18): income, a concrete category, or exclusion. */
export type RuleValue =
  | { type: "income" }
  | { type: "spending"; categoryId: string }
  | { type: "exclude" };

/**
 * Structural shape of a stored `CategorizationRule` row — the Prisma record
 * satisfies this, and tests can build literals without a client.
 */
export interface CategorizationRuleLike {
  id: string;
  /** Substring key; stored uppercase/trimmed, but matching re-normalizes defensively. */
  match: string;
  valueType: "income" | "spending" | "exclude";
  /** Required iff `valueType` is `spending`; rows violating that are ignored. */
  categoryId: string | null;
  useCount: number;
}

/** The transaction fields the matcher consumes (a `BankTransaction` satisfies this). */
export interface BankTransactionLike {
  description: string;
  counterparty?: string;
  direction: "debit" | "credit";
}

/** A rule that matched, paired with the destination it routes to. */
export interface MatchCandidate {
  rule: CategorizationRuleLike;
  value: RuleValue;
}

/**
 * Outcome of matching one transaction against the rule set. `suggested`
 * candidates are sorted best-first (useCount desc, then rule id for
 * determinism) so the UI can pre-fill `candidates[0]`.
 */
export type MatchResult =
  | { tier: "confident"; candidate: MatchCandidate }
  | { tier: "suggested"; candidates: MatchCandidate[] }
  | { tier: "unknown" };

/**
 * Canonical form of a rule's match key: trimmed and uppercased. The single
 * definition shared by matching and learning so stored and compared keys can
 * never drift apart.
 */
export function normalizeMatchKey(raw: string): string {
  return raw.trim().toUpperCase();
}

/** A matched candidate still carrying the normalized key it matched under. */
interface KeyedCandidate extends MatchCandidate {
  key: string;
}

/**
 * Uppercased search text: description plus counterparty, space-joined so a
 * key can never match across the boundary between the two fields.
 */
function buildHaystack(tx: BankTransactionLike): string {

  const counterparty = tx.counterparty === undefined ? "" : ` ${tx.counterparty}`;

  return `${tx.description}${counterparty}`.toUpperCase();
}

/**
 * Maps a rule row to its {@link RuleValue}, or `null` for rows that can never
 * route (a `spending` row without a category).
 */
function toRuleValue(rule: CategorizationRuleLike): RuleValue | null {

  if (rule.valueType === "income") return { type: "income" };

  if (rule.valueType === "exclude") return { type: "exclude" };

  if (rule.categoryId === null) return null;

  return { type: "spending", categoryId: rule.categoryId };
}

/** Best-first candidate order: useCount desc, then rule id asc for determinism. */
function byPreference(a: MatchCandidate, b: MatchCandidate): number {

  if (a.rule.useCount !== b.rule.useCount) return b.rule.useCount - a.rule.useCount;

  return a.rule.id < b.rule.id ? -1 : 1;
}

/**
 * Matches one transaction against the user's rules and reports the routing
 * confidence (see module doc for the tier semantics).
 */
export function matchTransaction(
  tx: BankTransactionLike,
  rules: CategorizationRuleLike[],
): MatchResult {

  const haystack = buildHaystack(tx);
  const candidates: KeyedCandidate[] = [];

  for (const rule of rules) {
    const key = normalizeMatchKey(rule.match);

    if (key.length === 0) continue;

    if (!haystack.includes(key)) continue;

    const value = toRuleValue(rule);

    if (value === null) continue;

    if (tx.direction === "debit" && value.type === "income") continue;

    candidates.push({ rule, value, key });
  }

  if (candidates.length === 0) return { tier: "unknown" };

  // Longest matching key wins (most specific identity); equal lengths break
  // alphabetically so the outcome never depends on rule-array order.
  let winningKey = candidates[0].key;

  for (const candidate of candidates) {
    if (candidate.key.length > winningKey.length) winningKey = candidate.key;
    else if (candidate.key.length === winningKey.length && candidate.key < winningKey) winningKey = candidate.key;
  }

  const winners = candidates
    .filter((candidate) => candidate.key === winningKey)
    .map(({ rule, value }): MatchCandidate => ({ rule, value }));

  if (winners.length === 1) return { tier: "confident", candidate: winners[0] };

  return { tier: "suggested", candidates: [...winners].sort(byPreference) };
}
