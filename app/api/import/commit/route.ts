import { NextResponse } from "next/server";
import type { CategorizationRule, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureUser } from "@/lib/user";
import { updateSpentAmount } from "@/lib/spending/update-spent";
import { DEFAULT_INCOME_ICON } from "@/lib/constants";
import { confirmedRule, effectiveLearnKey, planRuleMutations, type Fate, type FateWithTx } from "@/lib/categorize/learn";
import { matchTransaction, normalizeMatchKey, type RuleValue } from "@/lib/categorize/match";
import { MAX_AMOUNT_CENTS, MAX_FILENAME_LENGTH, MAX_IMPORT_TRANSACTIONS, MAX_LEARN_KEY_LENGTH } from "@/lib/import/limits";

// Constants (kept in sync with the income/entries routes' caps). The batch/
// amount/key/filename caps live in lib/import/limits.ts because the review
// client gates on the same numbers — one owner so the two can never drift.
const MAX_NAME_LENGTH = 100;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
// Sequential round-trips scale with batch size; the Prisma default of 5s is
// too tight for a full statement over the pooled connection.
const TRANSACTION_TIMEOUT_MS = 15_000;

/** The reviewed bank transaction as the review UI sends it back (parser shape). */
interface CommitTransaction {
  date: string;
  amount: number;
  direction: "debit" | "credit";
  description: string;
  counterparty?: string;
  externalId?: string;
}

interface CommitItem {
  tx: CommitTransaction;
  fate: Fate;
  /** Validated display name for routed income/spending items; null for fates that write no row. */
  name: string | null;
}

/** A route fate that writes a row — income or spending, never exclude. */
type WrittenRoute = { kind: "route"; value: Exclude<RuleValue, { type: "exclude" }>; learnKey?: string };

/**
 * The one definition of "this decision writes a row" — it anchors D20's
 * imported/excluded counts, the name validation, and the write loop, so the
 * summary can never disagree with what was written.
 */
function isWrittenRoute(fate: Fate): fate is WrittenRoute {
  return fate.kind === "route" && fate.value.type !== "exclude";
}

/** Caps a synthesized name at the income/entries routes' shared 100-char limit. */
function truncateName(raw: string): string {
  return raw.length > MAX_NAME_LENGTH ? raw.slice(0, MAX_NAME_LENGTH) : raw;
}

/**
 * Name for a synthesized row (entry or income): the counterparty when the
 * bank names one, else the description, else the fate's learnKey. `null`
 * when every source is blank — such a route is rejected up front, because
 * the app's own routes refuse empty names and an import must not smuggle
 * rows past that validation.
 */
function synthesizedName(
  tx: CommitTransaction,
  fate: Extract<Fate, { kind: "route" }>,
): string | null {

  if (tx.counterparty !== undefined && tx.counterparty.trim().length > 0) return truncateName(tx.counterparty);

  if (tx.description.trim().length > 0) return truncateName(tx.description);

  const learnKey = fate.learnKey === undefined ? "" : normalizeMatchKey(fate.learnKey);

  if (learnKey.length > 0) return truncateName(learnKey);

  return null;
}

/** Validates one raw transaction; returns the 400 message or null when valid. */
function transactionError(raw: unknown): string | null {

  if (typeof raw !== "object" || raw === null) return "Each transaction must include the parsed bank transaction";

  const tx = raw as Record<string, unknown>;

  if (typeof tx.date !== "string" || !DATE_REGEX.test(tx.date)) return "Transaction dates must be zero-padded YYYY-MM-DD";

  // The regex admits impossible calendar dates ("2026-02-31"), which JS Date
  // rolls over into the next month — desynchronizing the stored date from the
  // month key. Round-trip to reject them.
  const parsed = new Date(tx.date);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== tx.date) return "Transaction dates must be zero-padded YYYY-MM-DD";

  // Shape only — the positivity/cap rule applies to fates that WRITE a row
  // (checked in the batch loop). The parser admits zero-amount statement
  // lines the review can only exclude; rejecting them here would make such
  // files permanently uncommittable, since excluded rows are still echoed.
  if (typeof tx.amount !== "number" || !Number.isInteger(tx.amount) || tx.amount < 0) return "Transaction amounts must be integer cents";

  if (tx.direction !== "debit" && tx.direction !== "credit") return 'Transaction direction must be "debit" or "credit"';

  if (typeof tx.description !== "string") return "Transaction description must be a string";

  if (tx.counterparty !== undefined && typeof tx.counterparty !== "string") return "Transaction counterparty must be a string";

  if (tx.externalId !== undefined && typeof tx.externalId !== "string") return "Transaction externalId must be a string";

  return null;
}

/** Validates one raw fate against its transaction's direction; returns the 400 message or null. */
function fateError(raw: unknown, direction: "debit" | "credit"): string | null {

  if (typeof raw !== "object" || raw === null) return "Each transaction must carry a valid fate";

  const fate = raw as Record<string, unknown>;

  if (fate.kind === "skip") return null;

  if (fate.kind === "alwaysExclude") {
    if (typeof fate.learnKey !== "string" || fate.learnKey.trim().length === 0 || fate.learnKey.length > MAX_LEARN_KEY_LENGTH) return "Always-exclude fates must carry a non-empty learnKey";

    return null;
  }

  if (fate.kind !== "route") return "Each transaction must carry a valid fate";

  const value = fate.value;

  if (typeof value !== "object" || value === null) return "Route fates must carry a valid destination";

  const destination = value as Record<string, unknown>;

  if (destination.type !== "income" && destination.type !== "spending" && destination.type !== "exclude") return "Route fates must carry a valid destination";

  if (destination.type === "spending" && (typeof destination.categoryId !== "string" || destination.categoryId.length === 0)) return "Spending routes must carry a categoryId";

  if (destination.type === "income" && direction === "debit") return "A debit cannot be routed to income";

  if (fate.learnKey !== undefined && (typeof fate.learnKey !== "string" || fate.learnKey.length > MAX_LEARN_KEY_LENGTH)) return "learnKey must be a string of at most 100 characters";

  if (fate.ruleId !== undefined && (typeof fate.ruleId !== "string" || fate.ruleId.length === 0)) return "ruleId must be a non-empty string";

  return null;
}

/**
 * Find-or-create of the punctual import series, converging on
 * (userId, categoryId, name): the plain key name in the chosen category wins;
 * a key name owned by another category falls back to the category-scoped
 * "<KEY> — <label>" name, which is itself a find-or-create target so repeat
 * imports of a collided merchant reuse it (never a third name). D21: an
 * existing series is never recategorized.
 */
async function findOrCreateSeriesId(
  tx: Prisma.TransactionClient,
  userId: string,
  category: { id: string; label: string; icon: string },
  name: string,
): Promise<string> {

  const inCategory = await tx.budgetSeries.findFirst({ where: { userId, categoryId: category.id, name } });

  if (inCategory !== null) return inCategory.id;

  const anywhere = await tx.budgetSeries.findFirst({ where: { userId, name } });

  if (anywhere === null) {
    const created = await tx.budgetSeries.create({
      data: { name, icon: category.icon, recurring: false, categoryId: category.id, userId },
    });

    return created.id;
  }

  const fallbackName = truncateName(`${name} — ${category.label}`);
  const fallback = await tx.budgetSeries.findFirst({ where: { userId, categoryId: category.id, name: fallbackName } });

  if (fallback !== null) return fallback.id;

  const created = await tx.budgetSeries.create({
    data: { name: fallbackName, icon: category.icon, recurring: false, categoryId: category.id, userId },
  });

  return created.id;
}

/** Cache wrapper over {@link findOrCreateSeriesId} — in-batch convergence lives here, once. */
async function resolveSeriesId(
  tx: Prisma.TransactionClient,
  userId: string,
  category: { id: string; label: string; icon: string },
  name: string,
  cache: Map<string, string>,
): Promise<string> {

  const cacheKey = `${category.id}\u0000${name}`;
  const cached = cache.get(cacheKey);

  if (cached !== undefined) return cached;

  const id = await findOrCreateSeriesId(tx, userId, category, name);

  cache.set(cacheKey, id);

  return id;
}

/**
 * The stored rule rows a spending decision lands on — the same normalized
 * identity (key, "spending", the fate's category) the learner bumps, so
 * routing, stamping and bumping can never address different rows. A category
 * correction therefore lands on its OWN identity, never on the matched rule
 * of another category — an old pointer cannot hijack the user's correction.
 */
function landingRules(
  rules: CategorizationRule[],
  learnedKey: string,
  categoryId: string,
): CategorizationRule[] {
  return rules.filter((rule) => normalizeMatchKey(rule.match) === learnedKey && rule.valueType === "spending" && rule.categoryId === categoryId);
}

/** Find-or-create of the month's incarnation at budgeted 0 (D23), cached per batch. */
async function resolveItemId(
  tx: Prisma.TransactionClient,
  seriesId: string,
  month: string,
  cache: Map<string, string>,
): Promise<string> {

  const cacheKey = `${seriesId}\u0000${month}`;
  const cached = cache.get(cacheKey);

  if (cached !== undefined) return cached;

  const item = await tx.spendingItem.upsert({
    where: { seriesId_month: { seriesId, month } },
    update: {},
    create: { seriesId, month, budgeted: 0 },
  });

  cache.set(cacheKey, item.id);

  return item.id;
}

/**
 * POST /api/import/commit — the single atomic write of a reviewed import
 * (D19/D20/D21): one transaction creates the Import row, the routed entries
 * (spending onto punctual series/incarnations, credits into IncomeSource
 * rows), applies the learned rule mutations, and recomputes every affected
 * card's spent through the one owner (`updateSpentAmount`). Validation is
 * the server-side "confirm gated until all resolved" rule — every
 * transaction needs exactly one valid fate or the whole batch is 400.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const user = await getAuthenticatedUser();

    if (user === null) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    const rawTransactions = body.transactions;

    if (!Array.isArray(rawTransactions) || rawTransactions.length === 0) return NextResponse.json({ error: "Transactions must be a non-empty array" }, { status: 400 });

    if (rawTransactions.length > MAX_IMPORT_TRANSACTIONS) return NextResponse.json({ error: "At most 1000 transactions per import" }, { status: 400 });

    const filename = body.filename;

    if (filename !== undefined && (typeof filename !== "string" || filename.length === 0 || filename.length > MAX_FILENAME_LENGTH)) return NextResponse.json({ error: "Invalid filename" }, { status: 400 });

    for (const boundary of [body.statementStart, body.statementEnd]) {
      if (boundary !== undefined && (typeof boundary !== "string" || !DATE_REGEX.test(boundary))) return NextResponse.json({ error: "Statement dates must be YYYY-MM-DD" }, { status: 400 });
    }

    const items: CommitItem[] = [];

    for (const raw of rawTransactions) {
      const wrapper = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
      const txProblem = transactionError(wrapper.tx);

      if (txProblem !== null) return NextResponse.json({ error: txProblem }, { status: 400 });

      const tx = wrapper.tx as unknown as CommitTransaction;
      const fateProblem = fateError(wrapper.fate, tx.direction);

      if (fateProblem !== null) return NextResponse.json({ error: fateProblem }, { status: 400 });

      const fate = wrapper.fate as Fate;
      let name: string | null = null;

      if (isWrittenRoute(fate)) {
        if (tx.amount <= 0 || tx.amount > MAX_AMOUNT_CENTS) return NextResponse.json({ error: "Transaction amounts must be positive integer cents" }, { status: 400 });

        name = synthesizedName(tx, fate);

        if (name === null) return NextResponse.json({ error: "Text-less transactions need a learnKey to be routed" }, { status: 400 });
      }

      items.push({ tx, fate, name });
    }

    // Destination validation: every routed category must exist and be the
    // caller's (the review UI is never trusted with this).
    const categoryIds = [
      ...new Set(
        items.flatMap(({ fate }) =>
          fate.kind === "route" && fate.value.type === "spending" ? [fate.value.categoryId] : [],
        ),
      ),
    ];

    const categories = categoryIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: categoryIds }, userId: user.id } })
      : [];

    if (categories.length !== categoryIds.length) return NextResponse.json({ error: "Category not found for one or more routed transactions" }, { status: 400 });

    const categoryById = new Map(categories.map((category) => [category.id, category]));

    // ruleId validation: a confirmation must reference the caller's OWN rule,
    // and that rule must actually match the transaction it decides and agree
    // on the destination type — the review UI is never trusted with this.
    // The CATEGORY may legitimately differ (the pointer's effective home).
    const confirmations = items.flatMap((item) =>
      item.fate.kind === "route" && item.fate.ruleId !== undefined
        ? [{ tx: item.tx, ruleId: item.fate.ruleId, valueType: item.fate.value.type }]
        : [],
    );

    const confirmedRuleIds = [...new Set(confirmations.map(({ ruleId }) => ruleId))];

    const referencedRules = confirmedRuleIds.length > 0
      ? await prisma.categorizationRule.findMany({ where: { id: { in: confirmedRuleIds }, userId: user.id } })
      : [];

    if (referencedRules.length !== confirmedRuleIds.length) return NextResponse.json({ error: "Rule not found for one or more confirmed transactions" }, { status: 400 });

    const referencedById = new Map(referencedRules.map((rule) => [rule.id, rule]));

    for (const { tx: transaction, ruleId, valueType } of confirmations) {
      const rule = referencedById.get(ruleId);

      if (rule === undefined) return NextResponse.json({ error: "Rule not found for one or more confirmed transactions" }, { status: 400 });

      // Matching the single rule re-runs the full candidate filter: key in
      // the transaction's text, direction validity, rule well-formedness.
      const result = matchTransaction(transaction, [rule]);

      if (result.tier !== "confident") return NextResponse.json({ error: "A confirmed rule does not match its transaction" }, { status: 400 });

      if (result.candidate.value.type !== valueType) return NextResponse.json({ error: "A confirmed rule does not match its fate destination" }, { status: 400 });
    }

    // Server-computed counts (D20's closing summary): routed = written,
    // everything else (skips, always-excludes, rule-confirmed excludes) = excluded.
    const routed = items.filter((item): item is CommitItem & { fate: WrittenRoute } => isWrittenRoute(item.fate));
    const spendingTotal = routed.filter(({ fate }) => fate.value.type === "spending").length;
    const incomeTotal = routed.length - spendingTotal;
    const importedCount = routed.length;
    const excludedCount = items.length - importedCount;

    // The Import row and IncomeSource rows carry a userId FK — self-heal the
    // User row like the other first-write routes do.
    await ensureUser(user);

    const importId = await prisma.$transaction(async (tx) => {

      const importRow = await tx.import.create({
        data: {
          userId: user.id,
          filename: filename === undefined ? null : filename,
          statementStart: body.statementStart === undefined ? null : (body.statementStart as string),
          statementEnd: body.statementEnd === undefined ? null : (body.statementEnd as string),
          totalCount: items.length,
          importedCount,
          excludedCount,
        },
      });

      const rules = await tx.categorizationRule.findMany({ where: { userId: user.id } });
      const seriesCache = new Map<string, string>();
      const itemCache = new Map<string, string>();
      const affectedItemIds = new Set<string>();

      // Rules the planner will CREATE this batch don't exist yet to stamp
      // inline — remember the series each identity resolved to (keyed
      // key + category, the planner's spending identity) so the created row
      // is born already pointing at its card.
      const pendingCreateStamps = new Map<string, string>();

      for (const { tx: transaction, fate, name } of items) {
        if (!isWrittenRoute(fate)) continue;

        if (name === null) throw new Error("unreachable: routed transaction without a validated name");

        if (fate.value.type === "income") {
          await tx.incomeSource.create({
            data: {
              name,
              amount: transaction.amount,
              icon: DEFAULT_INCOME_ICON,
              type: "active",
              startDate: new Date(transaction.date),
              month: transaction.date.slice(0, 7),
              userId: user.id,
              importId: importRow.id,
              bankRef: transaction.externalId ?? null,
            },
          });

          continue;
        }

        const category = categoryById.get(fate.value.categoryId);

        if (category === undefined) throw new Error(`category ${fate.value.categoryId} vanished mid-commit`);

        // The series is named by the same key the learner writes under (D18:
        // the confirmed token IS the merchant identity) — one owner in learn.ts.
        const learnedKey = effectiveLearnKey(transaction, fate, rules);

        // A ruleId confirmation lands on that concrete rule; any other
        // decision lands on its normalized identity (key + the fate's
        // category) — the same resolution the learner bumps, so routing,
        // stamping and bumping can never address different rows.
        const confirmed = confirmedRule(fate, rules);

        let landing: CategorizationRule[];

        if (confirmed !== null) landing = [confirmed];
        else landing = learnedKey === null ? [] : landingRules(rules, learnedKey, fate.value.categoryId);

        const pointer = landing.find((rule) => rule.seriesId !== null)?.seriesId ?? null;

        let seriesId: string;

        if (pointer !== null) {
          // A stamped rule remembers its card: route there unconditionally,
          // whatever the series' current name or category — the user's later
          // rename/move is ground truth (D16) — and never consult the ladder.
          seriesId = pointer;
        } else {
          seriesId = await resolveSeriesId(tx, user.id, category, learnedKey === null ? name : truncateName(learnedKey), seriesCache);

          // Self-healing stamp: the rule (re-)learns its card in this same
          // transaction. The snapshot rows are patched too, so the batch's
          // later transactions take the pointer path instead of re-stamping.
          for (const rule of landing) {
            await tx.categorizationRule.update({ where: { id: rule.id }, data: { seriesId } });

            rule.seriesId = seriesId;
          }

          if (landing.length === 0 && learnedKey !== null) pendingCreateStamps.set(`${learnedKey}\u0000${fate.value.categoryId}`, seriesId);
        }

        const itemId = await resolveItemId(tx, seriesId, transaction.date.slice(0, 7), itemCache);

        await tx.spendingEntry.create({
          data: {
            name,
            amount: transaction.amount,
            direction: transaction.direction,
            date: new Date(transaction.date),
            spendingItemId: itemId,
            importId: importRow.id,
            bankRef: transaction.externalId ?? null,
          },
        });

        affectedItemIds.add(itemId);
      }

      const fatesWithTx: FateWithTx[] = items.map(({ tx: transaction, fate }) => ({ tx: transaction, fate }));

      for (const mutation of planRuleMutations(fatesWithTx, rules)) {
        if (mutation.op === "create") {
          // A spending rule is born already pointing at the series the batch
          // resolved for its identity; income/exclude rules never carry a
          // pointer.
          const data: Prisma.CategorizationRuleUncheckedCreateInput = { userId: user.id, match: mutation.match, valueType: mutation.valueType, categoryId: mutation.categoryId };

          if (mutation.valueType === "spending") data.seriesId = pendingCreateStamps.get(`${mutation.match}\u0000${mutation.categoryId}`) ?? null;

          await tx.categorizationRule.create({ data });

          continue;
        }

        // The planner compared identities on NORMALIZED keys, so bumps of
        // pre-existing rows resolve to concrete ids — filtering the write on
        // the raw stored string would silently no-op for a row some other
        // writer stored un-normalized. In-batch-created rows (the create+bump
        // aggregation) are always stored normalized, so identity filtering is
        // exact for them.
        const storedIds = rules
          .filter((rule) => normalizeMatchKey(rule.match) === mutation.match && rule.valueType === mutation.valueType && (rule.categoryId ?? null) === mutation.categoryId)
          .map((rule) => rule.id);

        if (storedIds.length > 0) {
          await tx.categorizationRule.updateMany({
            where: { id: { in: storedIds } },
            data: { useCount: { increment: mutation.by } },
          });
        } else {
          await tx.categorizationRule.updateMany({
            where: { userId: user.id, match: mutation.match, valueType: mutation.valueType, categoryId: mutation.categoryId },
            data: { useCount: { increment: mutation.by } },
          });
        }
      }

      for (const itemId of affectedItemIds) await updateSpentAmount(itemId, tx);

      return importRow.id;
    }, { timeout: TRANSACTION_TIMEOUT_MS });

    return NextResponse.json(
      {
        importId,
        counts: {
          total: items.length,
          imported: importedCount,
          excluded: excludedCount,
          spending: spendingTotal,
          income: incomeTotal,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // A P2002 can only come from the rare series-name race/collision the
    // find-or-create ladder cannot see (e.g. a fallback name occupied in
    // another category); the transaction has rolled back, so a retry is safe.
    if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "A budget line name collision prevented this import — please retry" }, { status: 409 });

    console.error("[Import Commit] Failed to commit:", error);

    return NextResponse.json({ error: "Failed to commit import" }, { status: 500 });
  }
}
