import { describe, it, expect } from "vitest";
import type { BankTransaction } from "@/lib/import/types";
import {
  assignDestination,
  buildCommitPayload,
  buildReviewRows,
  cascadeChipConfirm,
  excludeRow,
  sectionsOf,
  type PreviewCandidate,
  type PreviewResponse,
  type ReviewRow,
} from "@/lib/import/review";

// --- fixtures ---------------------------------------------------------------

const btx = (over: Partial<BankTransaction> = {}): BankTransaction => ({
  date: "2026-06-03",
  amount: 5430, // integer cents
  direction: "debit",
  description: "TWINT SBB EASYRIDE",
  ...over,
});

const candidate = (value: PreviewCandidate["value"]): PreviewCandidate => ({
  rule: { id: "rule-1", match: "SBB", valueType: value.type, categoryId: value.type === "spending" ? value.categoryId : null, useCount: 3 },
  value,
  ruleId: "rule-1",
  destination: null,
});

const preview = (transactions: PreviewResponse["transactions"]): PreviewResponse => ({ reconciliation: [], transactions });

/** Builds review rows from unknown-match transactions. */
const unknownRows = (...txs: BankTransaction[]): ReviewRow[] =>
  buildReviewRows(preview(txs.map((tx) => ({ tx, match: { tier: "unknown" }, statementIndex: 0 }))));

const fateOfRow = (rows: ReviewRow[], index: number) => buildCommitPayload(rows, "f.mt940", []).transactions[index].fate;

// --- cascade ----------------------------------------------------------------

describe("cascadeChipConfirm — one decision applies to all matching unknowns", () => {
  it("resolves every remaining unknown containing the confirmed key: same destination, same learnKey", () => {
    // Five SBB transactions, one decision (EL-D18 convergence). The default
    // chip token skips the TWINT noise and lands on SBB.
    const rows = unknownRows(
      btx({ description: "TWINT SBB EASYRIDE" }),
      btx({ description: "SBB CFF FFS BILLETT ZUERICH" }),
      btx({ description: "sbb mobile tickets" }),
      btx({ description: "PAYMENT 4711", counterparty: "SBB AG" }),
      btx({ description: "MIGROS ZUERICH" }),
    );

    const source = assignDestination(rows[0], "cat-transport");

    expect(source.chip?.tokens[source.chip.selected]).toBe("SBB");

    const out = cascadeChipConfirm([source, ...rows.slice(1)], source.id);

    // Source chip confirmed and stamped with the cascade count.
    expect(out[0].chip?.status).toBe("confirmed");
    expect(out[0].chip?.cascaded).toBe(3);

    // Description matches, case-insensitive, and the counterparty-only match
    // (same haystack rule as the matcher) all resolve identically.
    for (const index of [1, 2, 3]) {
      expect(out[index].tier).toBe("assigned");
      expect(out[index].dest).toBe("cat-transport");
      expect(fateOfRow(out, index)).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-transport" }, learnKey: "SBB" });
    }

    // Identical to the source's own fate — the engine's batch collapsing then
    // yields ONE rule create with bumps, one card.
    expect(fateOfRow(out, 0)).toEqual(fateOfRow(out, 1));

    // The non-matching unknown is untouched.
    expect(out[4].tier).toBe("unknown");
    expect(out[4]).toBe(rows[4]);
  });

  it("matches the key as one contiguous, case-insensitive substring", () => {
    const rows = unknownRows(
      btx({ description: "MIGROS RESTAURANT ZUERICH" }),
      btx({ description: "twint migros restaurant basel" }),
      btx({ description: "MIGROS BASEL RESTAURANT" }),
    );

    // A multi-token confirmed key (user-confirmed compound identity).
    const source: ReviewRow = {
      ...assignDestination(rows[0], "cat-food"),
      chip: { kind: "assign", tokens: ["MIGROS RESTAURANT"], selected: 0, status: "open" },
    };

    const out = cascadeChipConfirm([source, ...rows.slice(1)], source.id);

    expect(out[1].tier).toBe("assigned");
    expect(fateOfRow(out, 1)).toEqual({ kind: "route", value: { type: "spending", categoryId: "cat-food" }, learnKey: "MIGROS RESTAURANT" });

    // Non-contiguous tokens do not match.
    expect(out[2].tier).toBe("unknown");
  });

  it("always-exclude cascades identically and lands the rows in the excluded pile", () => {
    const rows = unknownRows(
      btx({ description: "VISECA KREDITKARTE ABRECHNUNG" }),
      btx({ description: "VISECA CARD SERVICES" }),
      btx({ description: "COOP PRONTO" }),
    );

    const source = excludeRow(rows[0], "always");

    expect(source.chip?.tokens[source.chip.selected]).toBe("VISECA");

    const out = cascadeChipConfirm([source, ...rows.slice(1)], source.id);

    expect(out[1].tier).toBe("excluded");
    expect(out[1].excludeKind).toBe("always");
    expect(fateOfRow(out, 0)).toEqual({ kind: "alwaysExclude", learnKey: "VISECA" });
    expect(fateOfRow(out, 1)).toEqual({ kind: "alwaysExclude", learnKey: "VISECA" });

    expect(sectionsOf(out).excluded).toHaveLength(2);

    expect(out[2].tier).toBe("unknown");
  });

  it("never touches suggested or matched rows, even when their text contains the key", () => {
    const spending = candidate({ type: "spending", categoryId: "cat-a" });
    const rows = buildReviewRows(preview([
      { tx: btx({ description: "TWINT SBB EASYRIDE" }), match: { tier: "unknown" }, statementIndex: 0 },
      { tx: btx({ description: "SBB HALBTAX ABO" }), match: { tier: "suggested", candidates: [spending] }, statementIndex: 0 },
      { tx: btx({ description: "SBB GA TRAVELCARD" }), match: { tier: "confident", candidate: spending }, statementIndex: 0 },
    ]));

    const source = assignDestination(rows[0], "cat-transport");
    const out = cascadeChipConfirm([source, ...rows.slice(1)], source.id);

    expect(out[1]).toBe(rows[1]);
    expect(out[2]).toBe(rows[2]);
  });

  it("skips (leave out) have no cascade path — only a chip confirm cascades", () => {
    const rows = unknownRows(
      btx({ description: "SBB EASYRIDE" }),
      btx({ description: "SBB BILLETT" }),
    );

    const source = excludeRow(rows[0], "once");

    expect(source.chip).toBeNull();

    expect(cascadeChipConfirm([source, rows[1]], source.id)).toEqual([source, rows[1]]);
  });

  it("an empty or whitespace confirmed key cascades nothing", () => {
    const rows = unknownRows(
      btx({ description: "SBB EASYRIDE" }),
      btx({ description: "SBB BILLETT" }),
    );

    const source: ReviewRow = {
      ...assignDestination(rows[0], "cat-transport"),
      chip: { kind: "assign", tokens: ["   "], selected: 0, status: "open" },
    };

    const out = cascadeChipConfirm([source, rows[1]], source.id);

    expect(out[0].chip?.status).toBe("confirmed");
    expect(out[0].chip?.cascaded).toBe(0);
    expect(out[1].tier).toBe("unknown");
  });

  it("never matches a text-less row — an empty haystack contains no key", () => {
    const rows = unknownRows(
      btx({ description: "SBB EASYRIDE" }),
      btx({ description: "" }),
    );

    const source = assignDestination(rows[0], "cat-transport");
    const out = cascadeChipConfirm([source, rows[1]], source.id);

    expect(out[1].tier).toBe("unknown");
    expect(out[1].excludeOnly).toBe(true);
  });

  it("cascaded rows stay individually correctable — no un-cascade", () => {
    const rows = unknownRows(
      btx({ description: "SBB EASYRIDE" }),
      btx({ description: "SBB BILLETT" }),
      btx({ description: "SBB HALBTAX" }),
    );

    const source = assignDestination(rows[0], "cat-transport");
    const out = cascadeChipConfirm([source, ...rows.slice(1)], source.id);

    const corrected = out.map((row) => (row.id === 1 ? assignDestination(row, "cat-other") : row));

    expect(corrected[1].dest).toBe("cat-other");
    expect(corrected[0].dest).toBe("cat-transport");
    expect(corrected[2].dest).toBe("cat-transport");
  });

  it("is the identity for an unknown source id or a chipless source", () => {
    const rows = unknownRows(btx());

    expect(cascadeChipConfirm(rows, 99)).toEqual(rows);
  });
});
