import type { BankTransactionLike, CategorizationRuleLike } from "@/lib/categorize/match";

// Shared fixture builders for the categorize test files (not itself a test —
// the vitest include pattern only sweeps *.test/*.spec files).

// Ids only need to be unique; tests that assert deterministic ordering pass
// explicit ids via `over`. Vitest gives each test file its own module graph,
// so the sequence restarts per file.
let seq = 0;

export const rule = (
  match: string,
  valueType: CategorizationRuleLike["valueType"],
  over: Partial<CategorizationRuleLike> = {},
): CategorizationRuleLike => ({
  id: `r${++seq}`,
  match,
  valueType,
  categoryId: valueType === "spending" ? "cat-1" : null,
  useCount: 1,
  ...over,
});

export const tx = (over: Partial<BankTransactionLike> = {}): BankTransactionLike => ({
  description: "MIGROS SUPERMARKT ZUERICH",
  direction: "debit",
  ...over,
});
