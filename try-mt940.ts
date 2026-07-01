/**
 * Manual, folder-based tester for the MT940 parser. NOT part of the app build.
 *
 * Workflow:
 *   1. Drop one or more MT940 statement files into `mt940-input/`.
 *   2. Run `pnpm mt940` (or `pnpm exec tsx try-mt940.ts`).
 *   3. Read the generated `<name>.out.txt` in `mt940-output/` — it shows
 *      `canParse`, a readable transaction table, and the full parsed JSON so you
 *      can eyeball dates, amounts, directions, descriptions and counterparties
 *      against the real export.
 *
 * Every input file produces exactly one output file; a parser error is written
 * into that file rather than aborting the whole run, so one bad statement never
 * hides the results of the others.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { mt940Parser } from "./lib/import/mt940-parser";
import type {
  BankTransaction,
  ReconciliationResult,
  StatementBalance,
} from "./lib/import/types";

const INPUT_DIR = join(process.cwd(), "mt940-input");
const OUTPUT_DIR = join(process.cwd(), "mt940-output");

/**
 * The `BankTransaction` type declaration, printed above the parsed data so the
 * output is self-describing — you can read the shape (which fields are optional)
 * without opening `lib/import/types.ts`. Kept as a literal string on purpose:
 * types are erased at runtime, so the declaration cannot be reflected from the
 * imported type. If `lib/import/types.ts` changes, update this to match.
 */
const TYPE_DECLARATION = `type TransactionDirection = "debit" | "credit";

interface BankTransaction {
  date: string;                    // zero-padded YYYY-MM-DD (value date)
  amount: number;                  // integer minor units (cents); always positive; direction carries the sign
  direction: TransactionDirection; // "debit" = money out, "credit" = money in
  description: string;             // never undefined; may be ""
  counterparty?: string;           // optional
  reference?: string;              // optional; account-owner reference (not NONREF)
  externalId?: string;             // optional; bank reference, dedup hint
  currency?: string;               // optional; ISO 4217 (e.g. CHF)
}`;

/** Right-pad `value` to `width` columns so the plain-text table lines up. */
function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

/** Render integer minor units (cents) back to a signed major-unit string, e.g. `-30.60`. */
function formatCents(cents: number): string {

  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);

  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Render a balance as `<CUR> <signed major-unit amount>`, e.g. `CHF 3445.70`. */
function formatBalance(balance: StatementBalance): string {
  return `${balance.currency} ${formatCents(signedCents(balance))}`;
}

/** Signed value of a balance in cents (mirrors the parser: credit `+`, debit `−`). */
function signedCents(balance: StatementBalance): number {
  return balance.direction === "credit" ? balance.amount : -balance.amount;
}

/** Render parsed transactions as a fixed-width, human-scannable table. */
function renderTable(transactions: BankTransaction[]): string {

  const header = [
    pad("date", 12),
    pad("dir", 8),
    pad("amount", 12),
    pad("cur", 5),
    pad("description", 42),
    pad("counterparty", 24),
  ].join(" | ");

  const rows = transactions.map((t) =>
    [
      pad(t.date, 12),
      pad(t.direction, 8),
      pad(formatCents(t.amount), 12),
      pad(t.currency ?? "", 5),
      pad(t.description.slice(0, 40), 42),
      pad((t.counterparty ?? "").slice(0, 22), 24),
    ].join(" | "),
  );

  return [header, "-".repeat(header.length), ...rows].join("\n");
}

/**
 * Map a transaction onto an object with every `BankTransaction` field present.
 *
 * `JSON.stringify` silently drops optional fields the parser left `undefined`
 * (`counterparty`, `reference`, `externalId`, `currency`), so a raw dump hides
 * the true shape of the type. Coalescing absent optionals to `null` makes the
 * serialized output reflect the complete `BankTransaction` structure — you can
 * see which fields the parser populated and which it genuinely left empty.
 */
function toExplicitShape(t: BankTransaction): Record<keyof BankTransaction, string | number | null> {
  return {
    date: t.date,
    amount: t.amount,
    direction: t.direction,
    description: t.description,
    counterparty: t.counterparty ?? null,
    reference: t.reference ?? null,
    externalId: t.externalId ?? null,
    currency: t.currency ?? null,
  };
}

/**
 * Render the per-statement reconciliation check so a real UBS export can be
 * eyeballed for correctness: does the sum of parsed movements match the bank's
 * own closing balance? All figures are exact integer cents, shown here as
 * major units. `MISMATCH` means the parse dropped/misread a line or the file
 * is inconsistent — either way the import should not be trusted.
 */
function renderReconciliation(results: ReconciliationResult[]): string {

  const blocks = results.map((result, index) => {

    const status = result.reconciled ? "OK" : "MISMATCH";

    const opening =
      result.openingBalance !== undefined ? formatBalance(result.openingBalance) : "(none)";

    const closing =
      result.closingBalance !== undefined ? formatBalance(result.closingBalance) : "(none)";

    return [
      `statement ${index + 1}: ${status}`,
      `  opening:  ${opening}`,
      `  movement: ${formatCents(result.movement)}`,
      `  expected: ${formatCents(result.expectedClosing)}`,
      `  closing:  ${closing}`,
      `  diff:     ${formatCents(result.difference)}`,
    ].join("\n");
  });

  return blocks.join("\n\n");
}

/** Parse one statement file and return the full report text written to disk. */
function buildReport(fileName: string, raw: string): string {

  const canParse = mt940Parser.canParse(raw);

  const lines = [`file: ${fileName}`, `canParse: ${canParse}`, ""];

  if (canParse === false) {
    lines.push("Parser does not recognize this file as MT940 — nothing parsed.");

    return lines.join("\n") + "\n";
  }

  try {
    const transactions = mt940Parser.parse(raw);
    const reconciliation = mt940Parser.reconcile(raw);

    lines.push(
      `parsed ${transactions.length} transaction(s):`,
      "",
      renderTable(transactions),
      "",
      "Reconciliation (opening + movements vs. closing balance, exact integer cents):",
      "",
      renderReconciliation(reconciliation),
      "",
      "Type declaration:",
      "",
      TYPE_DECLARATION,
      "",
      "Full BankTransaction data (every type field; null = parser left it empty):",
      "",
      JSON.stringify(transactions.map(toExplicitShape), null, 2),
      "",
    );

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    lines.push(`PARSE ERROR: ${message}`, "");

    return lines.join("\n");
  }
}

function main(): void {

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = readdirSync(INPUT_DIR).filter((name) => name.startsWith(".") === false);

  if (files.length === 0) {
    console.log(`No files found in ${INPUT_DIR}. Drop an MT940 statement there and re-run.`);

    return;
  }

  for (const fileName of files) {
    const raw = readFileSync(join(INPUT_DIR, fileName), "utf8");
    const report = buildReport(fileName, raw);

    const outName = `${basename(fileName, extname(fileName))}.out.txt`;

    writeFileSync(join(OUTPUT_DIR, outName), report, "utf8");

    console.log(`${fileName} -> mt940-output/${outName}`);
  }

  console.log(`\nDone. ${files.length} file(s) processed.`);
}

main();
