/**
 * Pure decision→mutation planning for rule learning (D16/D18/D20), plus
 * noise-aware identity-token guessing (D18). No Prisma, no IO — the commit
 * endpoint applies the returned mutation plan inside its transaction.
 *
 * Learning semantics: only explicit decisions learn. A `route` carrying a
 * user-confirmed `learnKey` writes under that key; a `route` without one
 * learns against the key the transaction matched (bump on confirmation,
 * create-under-the-same-key on correction — the old row is never decremented,
 * history is history). A `skip` never learns anything (D20). Duplicate
 * decisions inside one batch collapse: at most one create per rule identity,
 * with repeats aggregated into a single bump.
 */

import {
  matchTransaction,
  normalizeMatchKey,
  type BankTransactionLike,
  type CategorizationRuleLike,
  type RuleValue,
} from "./match";

/**
 * One reviewed transaction's fate, as the review UI will send it:
 * route to a destination (optionally learning a user-confirmed token),
 * skip once (learns NOTHING — D20), or always exclude (learns a rule).
 *
 * `ruleId` marks the route as a confirmation of that concrete matched
 * candidate: learning bumps that rule's OWN identity instead of the fate's
 * value — whose category may be the pointer's effective one (the series'
 * current home), which must never fork a phantom rule row under it. An
 * explicit `learnKey` outranks `ruleId` (an edited token is an identity
 * correction, not a confirmation).
 */
export type Fate =
  | { kind: "route"; value: RuleValue; learnKey?: string; ruleId?: string }
  | { kind: "skip" }
  | { kind: "alwaysExclude"; learnKey: string };

/** A fate paired with the transaction it decides, for match-based learning. */
export interface FateWithTx {
  tx: BankTransactionLike;
  fate: Fate;
}

/**
 * One planned rule-table write: create a new row (useCount starts at 1) or
 * increment an existing row's useCount by `by`. Rows are addressed by their
 * unique identity (match, valueType, categoryId) — created rows have no id yet.
 */
export type RuleMutation =
  | {
      op: "create";
      match: string;
      valueType: CategorizationRuleLike["valueType"];
      categoryId: string | null;
    }
  | {
      op: "bump";
      match: string;
      valueType: CategorizationRuleLike["valueType"];
      categoryId: string | null;
      by: number;
    };

/** Static noise tokens never worth learning as an identity (D18a). */
export const NOISE_TOKENS: readonly string[] = [
  "TWINT",
  "PAYPAL",
  "SUMUP",
  "ONLINE",
  "KARTE",
  "CH",
  "AG",
  "SA",
  "GMBH",
  "SARL",
];

/** The rule identity a single decision wants written or reinforced. */
interface LearnTarget {
  match: string;
  valueType: CategorizationRuleLike["valueType"];
  categoryId: string | null;
}

/** Flattens a routing value onto the rule-row shape. */
function toTarget(match: string, value: RuleValue): LearnTarget {

  const categoryId = value.type === "spending" ? value.categoryId : null;

  return { match, valueType: value.type, categoryId };
}

/** Identity key for aggregation/existence lookups; `\u0000` cannot occur in ids. */
function identityOf(target: LearnTarget): string {
  return `${target.match}\u0000${target.valueType}\u0000${target.categoryId ?? ""}`;
}

/**
 * The concrete rule a route fate confirms via `ruleId`, or `null` when the
 * fate doesn't reference one, an explicit learnKey overrides it, or the id
 * is unknown in `rules` (the commit route 400s foreign ids before planning;
 * an unknown id here simply learns nothing). Generic so callers holding
 * richer rule rows (e.g. Prisma records with `seriesId`) get them back typed.
 */
export function confirmedRule<R extends CategorizationRuleLike>(
  fate: Fate,
  rules: R[],
): R | null {

  if (fate.kind !== "route" || fate.ruleId === undefined) return null;

  const learnKey = fate.learnKey === undefined ? "" : normalizeMatchKey(fate.learnKey);

  if (learnKey.length > 0) return null;

  return rules.find((rule) => rule.id === fate.ruleId) ?? null;
}

/**
 * The single owner of "which key does this route decision learn under": the
 * explicit user-confirmed learnKey when present, else the confirmed rule's
 * key (`ruleId` fates), else the winning matched rule's key, else `null`
 * (nothing to key on). Winning candidates all share one key, so the
 * suggested pick is key-equivalent to any other. Exported so the commit
 * endpoint names imported series with the SAME resolution — the learned rule
 * key and the series name can never drift apart (D18: the confirmed token IS
 * the merchant identity).
 */
export function effectiveLearnKey(
  tx: BankTransactionLike,
  fate: Extract<Fate, { kind: "route" }>,
  rules: CategorizationRuleLike[],
): string | null {

  const learnKey = fate.learnKey === undefined ? "" : normalizeMatchKey(fate.learnKey);

  if (learnKey.length > 0) return learnKey;

  const confirmed = confirmedRule(fate, rules);

  if (confirmed !== null) return normalizeMatchKey(confirmed.match);

  const result = matchTransaction(tx, rules);

  if (result.tier === "unknown") return null;

  const winner = result.tier === "confident" ? result.candidate.rule : result.candidates[0].rule;

  return normalizeMatchKey(winner.match);
}

/**
 * Resolves one fate to the rule identity it learns, or `null` when it learns
 * nothing (skips, empty keys, unmatched routes without a learnKey).
 */
function resolveTarget(
  { tx, fate }: FateWithTx,
  existingRules: CategorizationRuleLike[],
): LearnTarget | null {

  if (fate.kind === "skip") return null;

  if (fate.kind === "alwaysExclude") {
    const key = normalizeMatchKey(fate.learnKey);

    if (key.length === 0) return null;

    return { match: key, valueType: "exclude", categoryId: null };
  }

  // A ruleId confirmation lands on the confirmed rule's OWN identity — the
  // fate's value may carry the pointer's effective category (the series'
  // current home), which must never fork a phantom row under it.
  const confirmed = confirmedRule(fate, existingRules);

  if (confirmed !== null) return { match: normalizeMatchKey(confirmed.match), valueType: confirmed.valueType, categoryId: confirmed.categoryId };

  // A confirmation lands on the existing row (bump); a correction lands on a
  // new row under the same key (create).
  const key = effectiveLearnKey(tx, fate, existingRules);

  if (key === null) return null;

  return toTarget(key, fate.value);
}

/**
 * Plans the rule mutations a batch of reviewed fates implies (see module doc).
 * Mutations come out in first-decision order; a create and the bump that
 * aggregates its in-batch repeats are adjacent.
 */
export function planRuleMutations(
  fates: FateWithTx[],
  existingRules: CategorizationRuleLike[],
): RuleMutation[] {

  const decided = new Map<string, { target: LearnTarget; count: number }>();

  for (const fate of fates) {
    const target = resolveTarget(fate, existingRules);

    if (target === null) continue;

    const identity = identityOf(target);
    const entry = decided.get(identity);

    if (entry === undefined) decided.set(identity, { target, count: 1 });
    else entry.count += 1;
  }

  const existing = new Set(
    existingRules.map((rule) =>
      identityOf({ match: normalizeMatchKey(rule.match), valueType: rule.valueType, categoryId: rule.categoryId }),
    ),
  );

  const mutations: RuleMutation[] = [];

  for (const { target, count } of decided.values()) {
    if (existing.has(identityOf(target))) {
      mutations.push({ op: "bump", ...target, by: count });
      continue;
    }

    mutations.push({ op: "create", ...target });

    if (count > 1) mutations.push({ op: "bump", ...target, by: count - 1 });
  }

  return mutations;
}

/**
 * Guesses the identity token of a transaction's text: the longest whitespace
 * token that is neither static noise ({@link NOISE_TOKENS}) nor learned noise.
 * A token is learned noise when it appears (as a whole token) in existing rule
 * keys routing to ≥3 distinct destinations — it clearly names a channel, not
 * an identity (D18). Ties on length go to the earliest token; `null` when no
 * token survives (the UI will ask the user to pick).
 */
export function guessIdentityToken(
  haystack: string,
  existingRules: CategorizationRuleLike[],
): string | null {

  const staticNoise = new Set(NOISE_TOKENS);

  // destinations seen per key token across the existing rule set
  const destinationsByToken = new Map<string, Set<string>>();

  for (const rule of existingRules) {
    const destination = `${rule.valueType}\u0000${rule.categoryId ?? ""}`;

    for (const token of normalizeMatchKey(rule.match).split(/\s+/)) {
      if (token.length === 0) continue;

      const seen = destinationsByToken.get(token);

      if (seen === undefined) destinationsByToken.set(token, new Set([destination]));
      else seen.add(destination);
    }
  }

  const isLearnedNoise = (token: string): boolean => {

    const destinations = destinationsByToken.get(token);

    return destinations !== undefined && destinations.size >= 3;
  };

  let best: string | null = null;

  for (const token of haystack.toUpperCase().split(/\s+/)) {
    if (token.length === 0) continue;

    if (staticNoise.has(token)) continue;

    if (isLearnedNoise(token)) continue;

    if (best === null || token.length > best.length) best = token;
  }

  return best;
}
