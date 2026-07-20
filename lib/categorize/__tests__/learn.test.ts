import { describe, it, expect } from "vitest";
import {
  planRuleMutations,
  effectiveLearnKey,
  guessIdentityToken,
  NOISE_TOKENS,
  type FateWithTx,
} from "@/lib/categorize/learn";
import type { BankTransactionLike, RuleValue } from "@/lib/categorize/match";
import { rule, tx } from "./helpers";

// --- helpers --------------------------------------------------------------

const spend = (categoryId: string): RuleValue => ({ type: "spending", categoryId });

const route = (
  transaction: BankTransactionLike,
  value: RuleValue,
  learnKey?: string,
): FateWithTx => ({
  tx: transaction,
  fate: learnKey === undefined
    ? { kind: "route", value }
    : { kind: "route", value, learnKey },
});

const skip = (transaction: BankTransactionLike): FateWithTx => ({
  tx: transaction,
  fate: { kind: "skip" },
});

const alwaysExclude = (transaction: BankTransactionLike, learnKey: string): FateWithTx => ({
  tx: transaction,
  fate: { kind: "alwaysExclude", learnKey },
});

// --- learning from routes -------------------------------------------------

describe("planRuleMutations — learning from routes", () => {
  it("creates a rule with an uppercased/trimmed key for a route with learnKey on an unknown", () => {
    const fates = [route(tx({ description: "BARBER X" }), spend("cat-cuts"), "  barber ")];

    expect(planRuleMutations(fates, [])).toEqual([
      { op: "create", match: "BARBER", valueType: "spending", categoryId: "cat-cuts" },
    ]);
  });

  it("bumps the matched row when a route confirms a confident match", () => {
    const existing = rule("MIGROS", "spending", { categoryId: "cat-groceries" });
    const fates = [route(tx(), spend("cat-groceries"))];

    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "bump", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries", by: 1 },
    ]);
  });

  it("bumps the chosen row when a route confirms one of several suggested candidates", () => {
    const spendingRow = rule("MIGROS", "spending", { categoryId: "cat-groceries", useCount: 5 });
    const excludeRow = rule("MIGROS", "exclude");
    const fates = [route(tx(), { type: "exclude" })];

    expect(planRuleMutations(fates, [spendingRow, excludeRow])).toEqual([
      { op: "bump", match: "MIGROS", valueType: "exclude", categoryId: null, by: 1 },
    ]);
  });

  it("creates the corrected row under the same key without touching the old row (history is history)", () => {
    const existing = rule("MIGROS", "spending", { categoryId: "cat-groceries" });
    const fates = [route(tx(), spend("cat-eating-out"))];

    // Exactly one mutation: the corrected destination. No decrement, no
    // mutation of any kind for the old cat-groceries row.
    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "create", match: "MIGROS", valueType: "spending", categoryId: "cat-eating-out" },
    ]);
  });

  it("creates under the winning key when correcting a suggested match to a new destination", () => {
    const rows = [
      rule("MIGROS", "spending", { categoryId: "cat-groceries" }),
      rule("MIGROS", "exclude"),
    ];
    const fates = [route(tx(), spend("cat-gifts"))];

    expect(planRuleMutations(fates, rows)).toEqual([
      { op: "create", match: "MIGROS", valueType: "spending", categoryId: "cat-gifts" },
    ]);
  });

  it("learns nothing from a route without learnKey on an unknown transaction", () => {
    const fates = [route(tx({ description: "NEVER SEEN BEFORE" }), spend("cat-1"))];

    expect(planRuleMutations(fates, [])).toEqual([]);
  });

  it("prefers an explicit learnKey over the matched key", () => {
    const existing = rule("MIGROS", "spending", { categoryId: "cat-groceries" });
    const fates = [route(tx(), spend("cat-groceries"), "MIGROS ZUERICH")];

    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "create", match: "MIGROS ZUERICH", valueType: "spending", categoryId: "cat-groceries" },
    ]);
  });

  it("treats a learnKey that is empty after trimming as absent", () => {
    const existing = rule("MIGROS", "spending", { categoryId: "cat-groceries" });
    const fates = [route(tx(), spend("cat-groceries"), "   ")];

    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "bump", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries", by: 1 },
    ]);
  });
});

// --- skips and exclusions -------------------------------------------------

describe("planRuleMutations — skips and exclusions", () => {
  it("a skip produces zero mutations, always (D20)", () => {
    expect(planRuleMutations([skip(tx())], [])).toEqual([]);

    // A skip contributes nothing even when other fates in the batch learn.
    const mixed = [
      skip(tx()),
      route(tx({ description: "BARBER X" }), spend("cat-cuts"), "BARBER"),
    ];

    expect(planRuleMutations(mixed, [])).toEqual([
      { op: "create", match: "BARBER", valueType: "spending", categoryId: "cat-cuts" },
    ]);
  });

  it("alwaysExclude creates the exclude rule for a new key", () => {
    const fates = [alwaysExclude(tx({ description: "COOP TANKSTELLE" }), "coop")];

    expect(planRuleMutations(fates, [])).toEqual([
      { op: "create", match: "COOP", valueType: "exclude", categoryId: null },
    ]);
  });

  it("alwaysExclude bumps an existing exclude row", () => {
    const existing = rule("COOP", "exclude");
    const fates = [alwaysExclude(tx({ description: "COOP TANKSTELLE" }), "COOP")];

    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "bump", match: "COOP", valueType: "exclude", categoryId: null, by: 1 },
    ]);
  });

  it("alwaysExclude with a learnKey that trims to empty learns nothing", () => {
    // An empty key would substring-match every transaction — never create it.
    expect(planRuleMutations([alwaysExclude(tx(), "  ")], [])).toEqual([]);
  });
});

// --- batch collapsing & determinism ---------------------------------------

describe("planRuleMutations — batch collapsing & determinism", () => {
  it("collapses duplicate new-key decisions into one create plus one aggregated bump", () => {
    const decision = () =>
      route(tx({ description: "MIGROS ONLINE" }), spend("cat-groceries"), "MIGROS");

    expect(planRuleMutations([decision(), decision()], [])).toEqual([
      { op: "create", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries" },
      { op: "bump", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries", by: 1 },
    ]);

    expect(planRuleMutations([decision(), decision(), decision()], [])).toEqual([
      { op: "create", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries" },
      { op: "bump", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries", by: 2 },
    ]);
  });

  it("aggregates repeated confirmations of an existing row into a single bump", () => {
    const existing = rule("MIGROS", "spending", { categoryId: "cat-groceries" });
    const confirm = () => route(tx(), spend("cat-groceries"));

    expect(planRuleMutations([confirm(), confirm()], [existing])).toEqual([
      { op: "bump", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries", by: 2 },
    ]);
  });

  it("emits mutations in first-decision order", () => {
    const fates = [
      alwaysExclude(tx({ description: "ZULU FEE" }), "ZULU"),
      route(tx({ description: "ALPHA SHOP" }), spend("cat-1"), "ALPHA"),
    ];

    expect(planRuleMutations(fates, [])).toEqual([
      { op: "create", match: "ZULU", valueType: "exclude", categoryId: null },
      { op: "create", match: "ALPHA", valueType: "spending", categoryId: "cat-1" },
    ]);
  });
});

// --- ruleId confirmations (rule→series pointer, anti-fork) ------------------

describe("planRuleMutations — ruleId confirmations", () => {
  it("a ruleId confirmation bumps the rule's OWN identity, never the fate's divergent category", () => {
    // The rule's card moved to another category; the review UI shows the
    // effective destination and the fate carries it. Landing on the fate's
    // identity would create a phantom row under the new category and
    // self-downgrade the key from confident to suggested — the anti-fork
    // contract.
    const existing = rule("MIGROS", "spending", { id: "rule-a", categoryId: "cat-groceries" });
    const fates: FateWithTx[] = [
      { tx: tx(), fate: { kind: "route", value: spend("cat-restaurants"), ruleId: "rule-a" } },
    ];

    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "bump", match: "MIGROS", valueType: "spending", categoryId: "cat-groceries", by: 1 },
    ]);
  });

  it("an explicit learnKey outranks the ruleId — an edited token is an identity correction", () => {
    const existing = rule("MIGROS", "spending", { id: "rule-a", categoryId: "cat-groceries" });
    const fates: FateWithTx[] = [
      { tx: tx(), fate: { kind: "route", value: spend("cat-groceries"), ruleId: "rule-a", learnKey: "migros zuerich" } },
    ];

    expect(planRuleMutations(fates, [existing])).toEqual([
      { op: "create", match: "MIGROS ZUERICH", valueType: "spending", categoryId: "cat-groceries" },
    ]);
  });

  it("an unknown ruleId learns nothing (the commit route 400s it before planning)", () => {
    const fates: FateWithTx[] = [
      { tx: tx({ description: "UNMATCHED TEXT" }), fate: { kind: "route", value: spend("cat-groceries"), ruleId: "rule-ghost" } },
    ];

    expect(planRuleMutations(fates, [])).toEqual([]);
  });

  it("effectiveLearnKey resolves a ruleId fate to the confirmed rule's key, not the match winner", () => {
    // Without the ruleId, the longer key would win the match and the series
    // name / learn key would drift away from the confirmed rule.
    const confirmed = rule("MIGROS", "spending", { id: "rule-a", categoryId: "cat-groceries" });
    const longer = rule("MIGROS SUPERMARKT", "spending", { id: "rule-b", categoryId: "cat-other" });

    const key = effectiveLearnKey(tx(), { kind: "route", value: spend("cat-groceries"), ruleId: "rule-a" }, [confirmed, longer]);

    expect(key).toBe("MIGROS");
  });
});

// --- token guessing -------------------------------------------------------

describe("guessIdentityToken", () => {
  it("exports the documented static noise list", () => {
    expect(NOISE_TOKENS).toEqual([
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
    ]);
  });

  it("drops static noise tokens and returns the longest survivor", () => {
    expect(guessIdentityToken("TWINT MIGROS ONLINE", [])).toBe("MIGROS");
  });

  it("strips legal suffixes via the noise list", () => {
    expect(guessIdentityToken("ACME AG", [])).toBe("ACME");

    expect(guessIdentityToken("HELVETIA SARL", [])).toBe("HELVETIA");
  });

  it("returns null when every token is noise", () => {
    expect(guessIdentityToken("TWINT ONLINE CH", [])).toBeNull();
  });

  it("returns null for an empty or blank haystack", () => {
    expect(guessIdentityToken("", [])).toBeNull();

    expect(guessIdentityToken("   ", [])).toBeNull();
  });

  it("uppercases the guess regardless of input case", () => {
    expect(guessIdentityToken("migros zuerich", [])).toBe("ZUERICH");
  });

  it("does not guess a token whose rule keys route to three distinct destinations", () => {
    // The TWINT-haircut case generalized: ZUERICH appears in keys routing to
    // three different destinations, so it is learned noise (D18) — the
    // shorter merchant token must win instead.
    const rules = [
      rule("MIGROS ZUERICH", "spending", { categoryId: "cat-groceries" }),
      rule("COOP ZUERICH", "spending", { categoryId: "cat-eating-out" }),
      rule("APOTHEKE ZUERICH", "exclude"),
    ];

    expect(guessIdentityToken("BARBER ZUERICH", rules)).toBe("BARBER");
  });

  it("still guesses a token whose rule keys route to only two distinct destinations", () => {
    const rules = [
      rule("MIGROS ZUERICH", "spending", { categoryId: "cat-groceries" }),
      rule("COOP ZUERICH", "spending", { categoryId: "cat-eating-out" }),
    ];

    expect(guessIdentityToken("BARBER ZUERICH", rules)).toBe("ZUERICH");
  });

  it("counts distinct destinations, not keys — three keys to one category do not disqualify", () => {
    const rules = [
      rule("MIGROS ZUERICH", "spending", { categoryId: "cat-groceries" }),
      rule("COOP ZUERICH", "spending", { categoryId: "cat-groceries" }),
      rule("DENNER ZUERICH", "spending", { categoryId: "cat-groceries" }),
    ];

    expect(guessIdentityToken("BARBER ZUERICH", rules)).toBe("ZUERICH");
  });

  it("never guesses TWINT even before it self-disqualifies (static noise)", () => {
    expect(guessIdentityToken("TWINT BARBERSHOP", [])).toBe("BARBERSHOP");
  });

  it("breaks length ties by first occurrence in the haystack", () => {
    expect(guessIdentityToken("BBBB AAAA", [])).toBe("BBBB");
  });
});
