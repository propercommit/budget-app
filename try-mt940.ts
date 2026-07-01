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
import type { BankTransaction } from "./lib/import/types";

const INPUT_DIR = join(process.cwd(), "mt940-input");
const OUTPUT_DIR = join(process.cwd(), "mt940-output");

/** Right-pad `value` to `width` columns so the plain-text table lines up. */
function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
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
      pad(t.amount.toFixed(2), 12),
      pad(t.currency ?? "", 5),
      pad(t.description.slice(0, 40), 42),
      pad((t.counterparty ?? "").slice(0, 22), 24),
    ].join(" | "),
  );

  return [header, "-".repeat(header.length), ...rows].join("\n");
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

    lines.push(
      `parsed ${transactions.length} transaction(s):`,
      "",
      renderTable(transactions),
      "",
      "Full JSON:",
      "",
      JSON.stringify(transactions, null, 2),
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
