import { describe, it, expect } from "vitest";
import type { BankTransaction, ReconciliationResult } from "@/lib/import/types";
import {
  INCOME_DESTINATION_ID,
  amountLabel,
  assignDestination,
  buildCommitPayload,
  buildReviewRows,
  candidateDestination,
  canConfirm,
  chipCardName,
  chipConfirm,
  chipDismiss,
  chipReopen,
  chipSelectToken,
  chipSetSeriesName,
  confirmCount,
  excludeRow,
  firstFailing,
  formatCents2,
  learnedRules,
  makeChip,
  openDecisionCount,
  overallReconciles,
  periodLabel,
  reconcileWarnText,
  reincludeRow,
  sectionsOf,
  shortDate,
  suggestionReason,
  textlessTx,
  tokensOf,
  toggleAccepted,
  undoExclude,
  type PreviewCandidate,
  type PreviewResponse,
  type ReviewRow,
} from "@/lib/import/review";

// --- fixtures ---------------------------------------------------------------

const btx = (over: Partial<BankTransaction> = {}): BankTransaction => ({
  date: "2026-06-03",
  amount: 5430, // integer cents
  direction: "debit",
  description: "TWINT MIGROS ONLINE",
  externalId: "REF001",
  ...over,
});

let ruleSeq = 0;

const candidate = (
  value: PreviewCandidate["value"],
  over: Partial<PreviewCandidate> = {},
): PreviewCandidate => ({
  rule: { id: `rule-${++ruleSeq}`, match: "MIGROS", valueType: value.type, categoryId: value.type === "spending" ? value.categoryId : null, useCount: 12 },
  value,
  ruleId: `rule-${ruleSeq}`,
  destination: null,
  ...over,
});

const preview = (
  transactions: PreviewResponse["transactions"],
  reconciliation: ReconciliationResult[] = [],
): PreviewResponse => ({ reconciliation, transactions });

const unknownRow = (over: Partial<BankTransaction> = {}): ReviewRow =>
  buildReviewRows(preview([{ tx: btx(over), match: { tier: "unknown" }, statementIndex: 0 }]))[0];

const reconciled = (over: Partial<ReconciliationResult> = {}): ReconciliationResult => ({
  reconciled: true,
  movement: 100,
  expectedClosing: 218175,
  actualClosing: 218175,
  difference: 0,
  openingBalance: { direction: "credit", amount: 218075, currency: "CHF", date: "2026-06-01" },
  closingBalance: { direction: "credit", amount: 218175, currency: "CHF", date: "2026-06-30" },
  ...over,
});

// --- building rows ----------------------------------------------------------

describe("buildReviewRows", () => {
  it("maps a confident spending match to a matched row routed at the pointer's effective category", () => {
    const withPointer = candidate(
      { type: "spending", categoryId: "cat-stale" },
      { destination: { seriesId: "series-1", name: "Twint Migros", categoryId: "cat-live" } },
    );

    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: withPointer }, statementIndex: 0 }]));

    expect(row.tier).toBe("matched");
    expect(row.dest).toBe("cat-live");
    expect(row.inDecisions).toBe(false);
  });

  it("falls back to the rule's stored category when there is no pointer destination", () => {
    const bare = candidate({ type: "spending", categoryId: "cat-groceries" });

    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: bare }, statementIndex: 0 }]));

    expect(row.dest).toBe("cat-groceries");
  });

  it("maps a confident income match to a matched row routed at income", () => {
    const income = candidate({ type: "income" });

    const [row] = buildReviewRows(preview([{ tx: btx({ direction: "credit" }), match: { tier: "confident", candidate: income }, statementIndex: 0 }]));

    expect(row.tier).toBe("matched");
    expect(row.dest).toBe(INCOME_DESTINATION_ID);
  });

  it("maps a confident exclude match to a rule-excluded row carrying the rule id", () => {
    const exclude = candidate({ type: "exclude" });

    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: exclude }, statementIndex: 0 }]));

    expect(row.tier).toBe("excluded");
    expect(row.excludeKind).toBe("always");
    expect(row.excludeRuleId).toBe(exclude.ruleId);
    expect(row.inDecisions).toBe(false);
  });

  it("pre-fills a suggested row from the best routable candidate", () => {
    const excludeFirst = candidate({ type: "exclude" });
    const spending = candidate({ type: "spending", categoryId: "cat-food" });

    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [excludeFirst, spending] }, statementIndex: 0 }]));

    expect(row.tier).toBe("suggested");
    expect(row.dest).toBe("cat-food");
  });

  it("demotes a suggestion whose every candidate excludes to the decision pile", () => {
    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [candidate({ type: "exclude" })] }, statementIndex: 0 }]));

    expect(row.tier).toBe("unknown");
    expect(row.inDecisions).toBe(true);
  });

  it("maps an unknown match to an open decision row", () => {
    const row = unknownRow();

    expect(row.tier).toBe("unknown");
    expect(row.dest).toBeNull();
    expect(row.inDecisions).toBe(true);
  });

  it("locks unroutable amounts into the excluded pile — no re-include, echoed as a skip", () => {
    // The commit route refuses to WRITE zero/over-cap amounts; born-locked
    // exclusion is the only state the server accepts for them.
    const [zero] = buildReviewRows(preview([{ tx: btx({ amount: 0 }), match: { tier: "unknown" }, statementIndex: 0 }]));

    expect(zero.tier).toBe("excluded");
    expect(zero.locked).toBe(true);
    expect(reincludeRow(zero)).toBe(zero);
    expect(buildCommitPayload([zero], "f.mt940", []).transactions[0].fate).toEqual({ kind: "skip" });

    const [overCap] = buildReviewRows(preview([{ tx: btx({ amount: 10_000_000_001 }), match: { tier: "unknown" }, statementIndex: 0 }]));

    expect(overCap.locked).toBe(true);
  });

  it("flags text-less transactions the server could never name", () => {
    expect(textlessTx(btx({ description: "  " }))).toBe(true);
    expect(textlessTx(btx({ description: "", counterparty: "ACME AG" }))).toBe(false);
    expect(textlessTx(btx())).toBe(false);
  });

  it("refuses to route an exclude-only row — the model enforces what the UI hides", () => {
    const row = unknownRow({ description: "" });

    expect(row.excludeOnly).toBe(true);
    expect(assignDestination(row, "cat-a")).toBe(row);
  });
});

// --- transitions ------------------------------------------------------------

describe("row transitions", () => {
  it("assigning an unknown row resolves it and spawns a chip with a non-noise default token", () => {
    const row = assignDestination(unknownRow(), "cat-food");

    expect(row.tier).toBe("assigned");
    expect(row.dest).toBe("cat-food");
    expect(row.chip).not.toBeNull();
    // TWINT and ONLINE are stop tokens — MIGROS is the merchant word.
    expect(row.chip?.tokens[row.chip.selected]).toBe("MIGROS");
    expect(row.chip?.status).toBe("open");
  });

  it("picking on a suggested row accepts it in place", () => {
    const suggested = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [candidate({ type: "spending", categoryId: "cat-a" })] }, statementIndex: 0 }]))[0];

    const row = assignDestination(suggested, "cat-b");

    expect(row.tier).toBe("suggested");
    expect(row.dest).toBe("cat-b");
    expect(row.accepted).toBe(true);
    expect(row.chip).toBeNull();
  });

  it("excluding once tombstones without a chip; always spawns the skip chip", () => {
    const once = excludeRow(unknownRow(), "once");

    expect(once.tier).toBe("excluded");
    expect(once.excludeKind).toBe("once");
    expect(once.chip).toBeNull();

    const always = excludeRow(unknownRow(), "always");

    expect(always.excludeKind).toBe("always");
    expect(always.chip?.kind).toBe("exclude");
  });

  it("undo restores an assigned row's destination after exclusion", () => {
    const assigned = assignDestination(unknownRow(), "cat-food");
    const restored = undoExclude(excludeRow(assigned, "once"));

    expect(restored.tier).toBe("assigned");
    expect(restored.dest).toBe("cat-food");
    expect(restored.excludeKind).toBeNull();
  });

  it("re-including a rule-excluded row makes it a fresh decision and drops the rule confirmation", () => {
    const [born] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: candidate({ type: "exclude" }) }, statementIndex: 0 }]));

    const row = reincludeRow(born);

    expect(row.tier).toBe("unknown");
    expect(row.excludeRuleId).toBeNull();
    expect(row.inDecisions).toBe(true);
  });

  it("re-including a session-excluded row restores its previous standing", () => {
    const excluded = excludeRow(assignDestination(unknownRow(), "cat-a"), "always");
    const row = reincludeRow(excluded);

    expect(row.tier).toBe("assigned");
    expect(row.dest).toBe("cat-a");
  });

  it("chip token select, confirm, dismiss and reopen", () => {
    const assigned = assignDestination(unknownRow(), "cat-a");
    const retargeted = chipSelectToken(assigned, 0);

    expect(retargeted.chip?.selected).toBe(0);

    expect(chipConfirm(retargeted).chip?.status).toBe("confirmed");

    expect(chipDismiss(retargeted).chip?.status).toBe("dismissed");

    expect(chipReopen(chipConfirm(retargeted)).chip?.status).toBe("open");
  });

  it("chip select ignores out-of-range indices", () => {
    const assigned = assignDestination(unknownRow(), "cat-a");

    expect(chipSelectToken(assigned, 99).chip?.selected).toBe(assigned.chip?.selected);
  });

  it("chipSetSeriesName sets a custom card name; empty or token-equal input falls back", () => {
    const assigned = assignDestination(unknownRow(), "cat-a"); // selected token: MIGROS

    const named = chipSetSeriesName(assigned, "  Courses Migros  ");

    expect(named.chip?.seriesName).toBe("Courses Migros");
    expect(chipCardName(named.chip ?? { kind: "assign", tokens: [], selected: 0, status: "open" })).toBe("Courses Migros");

    expect(chipSetSeriesName(named, "   ").chip?.seriesName).toBeUndefined();

    // Typing the selected token itself is not an edit — no redundant name.
    expect(chipSetSeriesName(named, "MIGROS").chip?.seriesName).toBeUndefined();

    expect(chipCardName(assigned.chip ?? { kind: "assign", tokens: [], selected: 0, status: "open" })).toBe("MIGROS");
  });

  it("toggleAccepted flips the advisory check", () => {
    const suggested = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [candidate({ type: "spending", categoryId: "cat-a" })] }, statementIndex: 0 }]))[0];

    expect(toggleAccepted(suggested).accepted).toBe(true);
    expect(toggleAccepted(toggleAccepted(suggested)).accepted).toBe(false);
  });
});

// --- sections & gating ------------------------------------------------------

describe("sections & gating", () => {
  it("keeps tombstoned decision rows in BOTH the decision pile and the excluded pile", () => {
    const rows = [excludeRow(unknownRow(), "once")];
    const sections = sectionsOf(rows);

    expect(sections.decisions).toHaveLength(1);
    expect(sections.excluded).toHaveLength(1);
  });

  it("gates confirm on open decisions and reconciliation, with the import-anyway override", () => {
    const open = [unknownRow()];
    const decided = [assignDestination(unknownRow(), "cat-a")];

    expect(canConfirm(open, true, false)).toBe(false);
    expect(canConfirm(decided, true, false)).toBe(true);
    expect(canConfirm(decided, false, false)).toBe(false);
    expect(canConfirm(decided, false, true)).toBe(true);
  });

  it("counts progress and confirmable rows", () => {
    const rows = [unknownRow(), assignDestination(unknownRow(), "cat-a"), excludeRow(unknownRow(), "once")];

    expect(openDecisionCount(rows)).toBe(1);
    expect(confirmCount(rows)).toBe(2);
  });

  it("collects the learned rules for the summary panel", () => {
    const assigned = chipConfirm(assignDestination(unknownRow(), "cat-a"));
    const skipped = chipConfirm(excludeRow(unknownRow(), "always"));
    const dismissed = chipDismiss(assignDestination(unknownRow(), "cat-b"));

    expect(learnedRules([assigned, skipped, dismissed])).toEqual([
      { token: "MIGROS", dest: "cat-a" },
      { token: "MIGROS", dest: null },
    ]);
  });

  it("dedupes identical learned rules — a cascade must not multiply the receipt", () => {
    const source = chipConfirm(assignDestination(unknownRow(), "cat-a"));
    const sharedChip = { kind: "assign" as const, tokens: ["MIGROS"], selected: 0, status: "confirmed" as const };
    const swept = { ...assignDestination(unknownRow(), "cat-a"), chip: sharedChip };
    const corrected = { ...swept, dest: "cat-b" };

    expect(learnedRules([source, swept, corrected])).toEqual([
      { token: "MIGROS", dest: "cat-a" },
      { token: "MIGROS", dest: "cat-b" },
    ]);
  });
});

// --- fates ------------------------------------------------------------------

describe("fates", () => {
  const fateFor = (row: ReviewRow) => buildCommitPayload([row], "f.mt940", []).transactions[0].fate;

  it("an untouched match confirms its rule by id at the effective destination", () => {
    const withPointer = candidate(
      { type: "spending", categoryId: "cat-stale" },
      { destination: { seriesId: "s", name: "Card", categoryId: "cat-live" } },
    );
    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: withPointer }, statementIndex: 0 }]));

    expect(fateFor(row)).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-live" }, ruleId: withPointer.ruleId });
  });

  it("an untouched suggestion confirms its best candidate by id (accept check is advisory)", () => {
    const best = candidate({ type: "spending", categoryId: "cat-a" });
    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [best] }, statementIndex: 0 }]));

    expect(fateFor(row)).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-a" }, ruleId: best.ruleId });
  });

  it("repicking another candidate's destination confirms THAT candidate", () => {
    const first = candidate({ type: "spending", categoryId: "cat-a" });
    const second = candidate({ type: "spending", categoryId: "cat-b" });
    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [first, second] }, statementIndex: 0 }]));

    expect(fateFor(assignDestination(row, "cat-b"))).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-b" }, ruleId: second.ruleId });
  });

  it("recategorizing away from every candidate is a correction without ruleId", () => {
    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: candidate({ type: "spending", categoryId: "cat-a" }) }, statementIndex: 0 }]));

    expect(fateFor(assignDestination(row, "cat-other"))).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-other" } });
  });

  it("an assigned unknown carries the confirmed chip token as learnKey", () => {
    const row = chipConfirm(assignDestination(unknownRow(), "cat-a"));

    expect(fateFor(row)).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-a" }, learnKey: "MIGROS" });
  });

  it("a dismissed chip learns nothing", () => {
    const row = chipDismiss(assignDestination(unknownRow(), "cat-a"));

    expect(fateFor(row)).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-a" } });
  });

  it("a custom card name rides the fate alongside the learnKey — and survives dismissal", () => {
    const named = chipSetSeriesName(assignDestination(unknownRow(), "cat-a"), "Courses Migros");

    expect(fateFor(chipConfirm(named))).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-a" }, learnKey: "MIGROS", seriesName: "Courses Migros" });

    // Dismissed rule question, named card: nothing learned, name kept.
    expect(fateFor(chipDismiss(named))).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-a" }, seriesName: "Courses Migros" });
  });

  it("an unedited chip sends no seriesName key at all", () => {
    const fate = fateFor(chipConfirm(assignDestination(unknownRow(), "cat-a")));

    expect(fate).not.toHaveProperty("seriesName");
  });

  it("income fates never carry a seriesName even if a chip was named", () => {
    const row = chipSetSeriesName(assignDestination(unknownRow({ direction: "credit" }), INCOME_DESTINATION_ID), "My Salary");

    expect(fateFor(chipConfirm(row))).toEqual({ kind: "route", value: { type: "income" }, learnKey: "MIGROS" });
  });

  it("an income assignment routes to income", () => {
    const row = assignDestination(unknownRow({ direction: "credit" }), INCOME_DESTINATION_ID);

    expect(fateFor(chipDismiss(row))).toEqual({ kind: "route", value: { type: "income" } });
  });

  it("a rule-excluded row left excluded confirms the exclude rule by id", () => {
    const exclude = candidate({ type: "exclude" });
    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "confident", candidate: exclude }, statementIndex: 0 }]));

    expect(fateFor(row)).toEqual({ kind: "route", value: { type: "exclude" }, ruleId: exclude.ruleId });
  });

  it("always-exclude with a confirmed chip becomes alwaysExclude with the token", () => {
    const row = chipConfirm(excludeRow(unknownRow(), "always"));

    expect(fateFor(row)).toEqual({ kind: "alwaysExclude", learnKey: "MIGROS" });
  });

  it("always-exclude with a dismissed chip, and leave-out, both become skip", () => {
    expect(fateFor(chipDismiss(excludeRow(unknownRow(), "always")))).toEqual({ kind: "skip" });

    expect(fateFor(excludeRow(unknownRow(), "once"))).toEqual({ kind: "skip" });
  });
});

// --- payload ----------------------------------------------------------------

describe("buildCommitPayload", () => {
  it("echoes transactions verbatim and derives the statement period from balances", () => {
    const rows = buildReviewRows(preview([{ tx: btx(), match: { tier: "unknown" }, statementIndex: 0 }]));
    const payload = buildCommitPayload(rows.map((row) => excludeRow(row, "once")), "june.mt940", [reconciled()]);

    expect(payload.transactions[0].tx).toBe(rows[0].tx);
    expect(payload.filename).toBe("june.mt940");
    expect(payload.statementStart).toBe("2026-06-01");
    expect(payload.statementEnd).toBe("2026-06-30");
  });

  it("omits provenance it cannot derive", () => {
    const payload = buildCommitPayload([], "", []);

    expect(payload.filename).toBeUndefined();
    expect(payload.statementStart).toBeUndefined();
    expect(payload.statementEnd).toBeUndefined();
  });
});

// --- reconciliation & formatting -------------------------------------------

describe("reconciliation display", () => {
  it("overallReconciles and firstFailing", () => {
    const bad = reconciled({ reconciled: false, actualClosing: 219675, difference: -1500 });

    expect(overallReconciles([reconciled()])).toBe(true);
    expect(overallReconciles([reconciled(), bad])).toBe(false);
    expect(firstFailing([reconciled(), bad])).toBe(bad);
    expect(firstFailing([reconciled()])).toBeNull();
  });

  it("builds the mismatch sentence from exact integer cents", () => {
    const bad = reconciled({ reconciled: false, movement: 100, expectedClosing: 218175, actualClosing: 219675, difference: -1500 });

    expect(reconcileWarnText(bad)).toBe(
      "This statement doesn’t add up: opening 2,180.75 + movements should close at 2,181.75 CHF, but the statement says 2,196.75 CHF — off by 15.00 CHF.",
    );
  });

  it("degrades gracefully when the statement has no closing balance", () => {
    const bad = reconciled({ reconciled: false, actualClosing: undefined, closingBalance: undefined });

    expect(reconcileWarnText(bad)).toBe("This statement doesn’t include a closing balance to verify against.");
  });
});

describe("formatting", () => {
  it("formats amounts as signed two-decimal en-US strings", () => {
    expect(formatCents2(543040)).toBe("5,430.40");
    expect(amountLabel(btx({ amount: 5430, direction: "debit" }))).toBe("−54.30");
    expect(amountLabel(btx({ amount: 250000, direction: "credit" }))).toBe("+2,500.00");
  });

  it("formats short dates and statement periods without timezone drift", () => {
    expect(shortDate("2026-06-03")).toBe("3 Jun");

    expect(periodLabel([reconciled()])).toBe("1 – 30 June 2026");

    const crossMonth = reconciled({
      openingBalance: { direction: "credit", amount: 1, currency: "CHF", date: "2026-05-28" },
      closingBalance: { direction: "credit", amount: 1, currency: "CHF", date: "2026-06-03" },
    });

    expect(periodLabel([crossMonth])).toBe("28 May – 3 June 2026");

    expect(periodLabel([reconciled({ openingBalance: undefined })])).toBeNull();
  });
});

// --- tokens -----------------------------------------------------------------

describe("learn-key tokens", () => {
  it("keeps unique 3+ char non-numeric words, four at most", () => {
    expect(tokensOf("TWINT MIGROS ONLINE 12345 AB MIGROS EXTRA MORE")).toEqual(["TWINT", "MIGROS", "ONLINE", "EXTRA"]);
  });

  it("splits on the design's separators", () => {
    expect(tokensOf("COOP-PRONTO/ZUERICH,HB.WEST")).toEqual(["COOP", "PRONTO", "ZUERICH", "WEST"]);
  });

  it("never offers a token over the server's 100-char learn-key cap", () => {
    expect(tokensOf(`${"X".repeat(101)} MIGROS`)).toEqual(["MIGROS"]);
  });

  it("pre-selects the first non-noise token, falling back to the first", () => {
    expect(makeChip("TWINT MIGROS ONLINE", "assign")?.selected).toBe(1);

    expect(makeChip("TWINT ONLINE", "assign")?.selected).toBe(0);

    expect(makeChip("", "assign")).toBeNull();
  });

  it("candidateDestination prefers the live pointer and suggestionReason cites the rule's use count", () => {
    const withPointer = candidate(
      { type: "spending", categoryId: "cat-stale" },
      { destination: { seriesId: "s", name: "Card", categoryId: "cat-live" } },
    );

    expect(candidateDestination(withPointer)).toBe("cat-live");

    const [row] = buildReviewRows(preview([{ tx: btx(), match: { tier: "suggested", candidates: [withPointer] }, statementIndex: 0 }]));

    expect(suggestionReason(row, (id) => (id === "cat-live" ? "Groceries" : "?"))).toBe("usually Groceries — 12×");
  });
});
