import { describe, it, expect } from "vitest";
import { applyEntry, unapplyEntry, type EntryLike } from "@/lib/spending/math";

// All amounts are integer cents with positive magnitudes; the sign of an
// entry's effect on `spent` comes solely from its direction.
const debit = (amount: number): EntryLike => ({ amount, direction: "debit" });
const credit = (amount: number): EntryLike => ({ amount, direction: "credit" });

describe("applyEntry", () => {
  it("adds a debit to spent", () => {
    expect(applyEntry(1000, debit(425))).toBe(1425);
  });

  it("subtracts a credit from spent", () => {
    expect(applyEntry(1000, credit(425))).toBe(575);
  });

  it("sums mixed entries via reduce: 200.00 debit + 150.00 credit → 5000", () => {
    const entries = [debit(20_000), credit(15_000)];

    expect(entries.reduce(applyEntry, 0)).toBe(5_000);
  });

  it("allows an exact negative result: a lone 150.00 credit → -15000", () => {
    expect([credit(15_000)].reduce(applyEntry, 0)).toBe(-15_000);
  });

  it("stays exact on cent values that drift as floats (10c + 20c = 30c)", () => {
    expect([debit(10), debit(20)].reduce(applyEntry, 0)).toBe(30);
  });
});

describe("unapplyEntry", () => {
  it("removes a debit from a running total", () => {
    expect(unapplyEntry(1425, debit(425))).toBe(1000);
  });

  it("removing a credit raises spent", () => {
    expect(unapplyEntry(575, credit(425))).toBe(1000);
  });

  it("is the exact inverse of applyEntry for both directions", () => {
    for (const entry of [debit(4_299), credit(4_299)]) {
      expect(unapplyEntry(applyEntry(1_000, entry), entry)).toBe(1_000);

      expect(applyEntry(unapplyEntry(1_000, entry), entry)).toBe(1_000);
    }
  });

  it("inverts across a negative total without clamping", () => {
    expect(unapplyEntry(applyEntry(0, credit(15_000)), credit(15_000))).toBe(0);
  });
});
