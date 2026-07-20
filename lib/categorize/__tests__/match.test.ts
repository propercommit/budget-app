import { describe, it, expect } from "vitest";
import { matchTransaction } from "@/lib/categorize/match";
import { rule, tx } from "./helpers";

// --- haystack construction ------------------------------------------------

describe("matchTransaction — haystack", () => {
  it("matches a key case-insensitively against the description", () => {
    const r = rule("MIGROS", "spending", { categoryId: "cat-groceries" });

    expect(matchTransaction(tx({ description: "migros supermarkt zuerich" }), [r])).toEqual({
      tier: "confident",
      candidate: { rule: r, value: { type: "spending", categoryId: "cat-groceries" } },
    });
  });

  it("matches a key found only in the counterparty", () => {
    const r = rule("ACME", "spending");

    const result = matchTransaction(
      tx({ description: "PAYMENT 042", counterparty: "ACME AG" }),
      [r],
    );

    expect(result).toEqual({
      tier: "confident",
      candidate: { rule: r, value: { type: "spending", categoryId: "cat-1" } },
    });
  });

  it("normalizes a lowercase/padded stored key before matching", () => {
    const r = rule("  migros ", "spending");

    expect(matchTransaction(tx(), [r]).tier).toBe("confident");
  });

  it("never matches a key across the description/counterparty boundary", () => {
    // Concatenating without a separator would form "ALPHABETA", which contains
    // "ABE" — the space join must prevent that phantom match.
    const r = rule("ABE", "spending");

    expect(matchTransaction(tx({ description: "ALPHA", counterparty: "BETA" }), [r])).toEqual({
      tier: "unknown",
    });
  });

  it("ignores a rule whose key is empty after trimming", () => {
    // "" is a substring of everything — such a row must never match.
    const r = rule("   ", "spending");

    expect(matchTransaction(tx(), [r])).toEqual({ tier: "unknown" });
  });
});

// --- confidence tiers -----------------------------------------------------

describe("matchTransaction — confidence tiers", () => {
  it("returns unknown when no key matches", () => {
    expect(matchTransaction(tx(), [rule("COOP", "spending")])).toEqual({ tier: "unknown" });
  });

  it("returns confident when exactly one row exists for the matching key", () => {
    const r = rule("MIGROS", "spending", { categoryId: "cat-groceries" });

    expect(matchTransaction(tx(), [r])).toEqual({
      tier: "confident",
      candidate: { rule: r, value: { type: "spending", categoryId: "cat-groceries" } },
    });
  });

  it("returns suggested sorted by useCount desc when the key has several rows", () => {
    const excludeRow = rule("MIGROS", "exclude", { useCount: 2 });
    const spendingRow = rule("MIGROS", "spending", { categoryId: "cat-groceries", useCount: 5 });

    // Passed lowest-count first to prove the sort is not input order.
    const result = matchTransaction(tx(), [excludeRow, spendingRow]);

    expect(result).toEqual({
      tier: "suggested",
      candidates: [
        { rule: spendingRow, value: { type: "spending", categoryId: "cat-groceries" } },
        { rule: excludeRow, value: { type: "exclude" } },
      ],
    });
  });
});

// --- key specificity ------------------------------------------------------

describe("matchTransaction — key specificity", () => {
  it("picks the longest matching key over a shorter one", () => {
    const twint = rule("TWINT", "exclude");
    const migros = rule("MIGROS", "spending", { categoryId: "cat-groceries" });

    const result = matchTransaction(tx({ description: "TWINT MIGROS ONLINE" }), [twint, migros]);

    expect(result).toEqual({
      tier: "confident",
      candidate: { rule: migros, value: { type: "spending", categoryId: "cat-groceries" } },
    });
  });

  it("suggests among the longest key's rows only", () => {
    const twint = rule("TWINT", "exclude");
    const migrosSpending = rule("MIGROS", "spending", { useCount: 3 });
    const migrosExclude = rule("MIGROS", "exclude", { useCount: 1 });

    const result = matchTransaction(tx({ description: "TWINT MIGROS ONLINE" }), [
      twint,
      migrosSpending,
      migrosExclude,
    ]);

    expect(result).toEqual({
      tier: "suggested",
      candidates: [
        { rule: migrosSpending, value: { type: "spending", categoryId: "cat-1" } },
        { rule: migrosExclude, value: { type: "exclude" } },
      ],
    });
  });

  it("breaks equal-length key ties alphabetically (first key wins)", () => {
    // "COOP" and "PLOP" are both 4 chars and both present — the tie-break is
    // documented as alphabetical, so COOP's row wins deterministically.
    const plop = rule("PLOP", "spending", { categoryId: "cat-plop" });
    const coop = rule("COOP", "spending", { categoryId: "cat-coop" });

    const result = matchTransaction(tx({ description: "COOP PLOP" }), [plop, coop]);

    expect(result).toEqual({
      tier: "confident",
      candidate: { rule: coop, value: { type: "spending", categoryId: "cat-coop" } },
    });
  });
});

// --- direction filter -----------------------------------------------------

describe("matchTransaction — direction filter", () => {
  it("drops an income candidate for a debit, yielding unknown when nothing else matches", () => {
    const r = rule("SALARY", "income");

    expect(matchTransaction(tx({ description: "SALARY REVERSAL" }), [r])).toEqual({
      tier: "unknown",
    });
  });

  it("keeps the income candidate for a credit", () => {
    const r = rule("SALARY", "income");

    expect(
      matchTransaction(tx({ description: "SALARY JULY", direction: "credit" }), [r]),
    ).toEqual({
      tier: "confident",
      candidate: { rule: r, value: { type: "income" } },
    });
  });

  it.each(["debit", "credit"] as const)("applies an exclude rule to a %s", (direction) => {
    const r = rule("INTERNAL TRANSFER", "exclude");

    expect(
      matchTransaction(tx({ description: "INTERNAL TRANSFER SAVINGS", direction }), [r]),
    ).toEqual({
      tier: "confident",
      candidate: { rule: r, value: { type: "exclude" } },
    });
  });

  it("upgrades a two-row key to confident when the filter removes the income row", () => {
    const income = rule("SALARY", "income", { useCount: 9 });
    const spending = rule("SALARY", "spending", { categoryId: "cat-fees" });

    const result = matchTransaction(tx({ description: "SALARY REVERSAL" }), [income, spending]);

    expect(result).toEqual({
      tier: "confident",
      candidate: { rule: spending, value: { type: "spending", categoryId: "cat-fees" } },
    });
  });

  it("applies the direction filter before longest-key selection", () => {
    // The longer key routes to income and the tx is a debit: with filtering
    // first, the shorter spending key still wins — the debit is NOT unknown.
    const longIncome = rule("MIGROS ONLINE", "income");
    const shortSpending = rule("MIGROS", "spending", { categoryId: "cat-groceries" });

    const result = matchTransaction(tx({ description: "MIGROS ONLINE" }), [
      longIncome,
      shortSpending,
    ]);

    expect(result).toEqual({
      tier: "confident",
      candidate: { rule: shortSpending, value: { type: "spending", categoryId: "cat-groceries" } },
    });
  });
});

// --- determinism & integrity ----------------------------------------------

describe("matchTransaction — determinism & integrity", () => {
  it("orders equal-useCount suggested candidates by rule id", () => {
    const late = rule("MIGROS", "exclude", { id: "r-zz", useCount: 3 });
    const early = rule("MIGROS", "spending", { id: "r-aa", useCount: 3 });

    const result = matchTransaction(tx(), [late, early]);

    expect(result.tier).toBe("suggested");

    if (result.tier !== "suggested") throw new Error("unreachable");

    expect(result.candidates.map((c) => c.rule.id)).toEqual(["r-aa", "r-zz"]);
  });

  it("ignores a spending row missing its categoryId", () => {
    const broken = rule("MIGROS", "spending", { categoryId: null });

    expect(matchTransaction(tx(), [broken])).toEqual({ tier: "unknown" });

    const valid = rule("MIGROS", "exclude");

    expect(matchTransaction(tx(), [broken, valid])).toEqual({
      tier: "confident",
      candidate: { rule: valid, value: { type: "exclude" } },
    });
  });

  it("does not mutate the input rules array", () => {
    const rules = [
      rule("MIGROS", "spending", { useCount: 1 }),
      rule("MIGROS", "exclude", { useCount: 5 }),
    ];
    const idsBefore = rules.map((r) => r.id);

    matchTransaction(tx(), rules);

    expect(rules.map((r) => r.id)).toEqual(idsBefore);
  });
});
