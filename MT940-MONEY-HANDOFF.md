# Budget app — money representation & MT940 import: status + planning handoff

## Context (what this app is)
A Next.js 16 / React 19 / TypeScript / Prisma 6 (Supabase Postgres) personal budgeting app.
Money is stored as Prisma `Float` (Postgres `double precision`). I'm adding an **MT940 bank-statement import** (`feat/mt940-connector`) and want the money handling to be correct before building persistence + reconciliation on top of it.

---

## Part 1 — Float-money investigation (verdict)

**Verdict: latent-but-real today, masked from view; becomes a genuine user-facing bug specifically at MT940 reconciliation.**

- **Storage:** all 4 money columns are `Float` — `SpendingItem.budgeted`, `SpendingItem.spent`, `IncomeSource.amount`, `SpendingEntry.amount`. No `Decimal`/`Int` anywhere.
- **Drift exists** in ~15 `reduce`/`+` sum sites (e.g. `updateSpentAmount` in `app/api/entries/[id]/route.ts`, `app/page.tsx:98`, dashboard/overview totals) and a second, client-side drift source in `components/hooks/use-spending.ts` (keeps `spent` incrementally with `s.spent ± amount`).
- **It's invisible** because every display goes through `formatAmount` (`lib/utils.ts`) → `toLocaleString()`, which caps at 3 fraction digits and rounds the noise away. So the stored double is subtly wrong; the UI never shows it.
- **The one currently-unmasked exposure:** raw-float boolean comparisons that bypass `formatAmount` — `spent > budget`, `remaining >= 0` (budget-overview / sticky-bar). These can flip at the exact-equality boundary.
- **No cents math exists today** (`*100`/`/100` only appear in the color picker), so the classic `Math.floor` cents trap is not currently triggered — but it's a hazard for any future migration (use `Math.round`, never `Math.floor`/`parseInt`).

**Direct answer — will summing imported transactions and reconciling against the closing balance produce false mismatches?**
**Yes, if done in float.** Proven: `10,10 + 20,20 + 0,30 + 1234,56 + 7,50` sums to `1272.6599999999999`, and `=== 1272.66` is `false`. A random 200-transaction batch drifted by `5.46e-12`. An exact `sum === closingBalance` check (or naive tolerance) would intermittently reject clean statements — the worst kind of bug because it's data-dependent and irreproducible.

**Recommendation:** integer minor units (cents) as `Int` over `Decimal` — amounts are simple 2-dp currency, integer math is exact/fast, and it avoids Prisma `Decimal`'s `Decimal.js` object ergonomics at every read/write/sum.

---

## Part 2 — What I already built (DONE, on branch `worktree-mt940-parser`)

Scope was deliberately limited to the **MT940 import path** (the app's `Float` storage is untouched). Files: `lib/import/mt940-parser.ts`, `lib/import/types.ts`, `lib/import/__tests__/mt940-parser.test.ts`, `try-mt940.ts`.

1. **Amounts parsed as integer cents, string→integer (never through a float).**
   `parseSwiftAmount("1234,56") → 123456`. Right-pads a single decimal, half-up rounds >2 decimals, safe-integer guard. `BankTransaction.amount` is now documented as integer minor units.

2. **Balances (previously discarded) are now extracted.**
   The balance regex used to capture only currency; it now captures D/C mark, date, currency, amount. New `parseBalance` → `StatementBalance` (cents). The parser now groups fields into **statements** via `parseStatements(): BankStatement[]`, each carrying opening (`:60F/M:`) + closing (`:62F/M:`) balances. `parse()` unchanged for existing callers — it just flattens.

3. **Exact-integer reconciliation.**
   `reconcile(raw): ReconciliationResult[]` — one per statement — checks `signed(opening) + Σ movements === signed(closing)`, all in cents. Credits `+`, debits `−`; reversals `RD`/`RC` counted by effective direction; overdrawn (`D`) balances handled. `reconciled` is `true` only when both balances are present and match exactly.

4. **Manual tester (`pnpm mt940`)** now prints per-statement reconciliation.

**Verification:** all 310 tests pass (28 files; 33 MT940 tests, 20 new). Regression test proves `10,10+20,20+0,30` reconciles to `30,60` exactly while the float sum does not equal `30.60`. My files are type-clean and lint-clean. On the real UBS export, reconciliation reports `OK`, `diff 0.00` (opening 743.28 + movement 1292.22 = closing 2035.50). (3 pre-existing `tsc` errors in `budget-overview` tests are unrelated.)

**Contract types now available** (`lib/import/types.ts`): `BankTransaction` (amount = cents), `StatementBalance`, `BankStatement`, `ReconciliationResult`.

---

## Part 3 — Open decisions / what to plan next

The parser + reconciliation are done. **Persistence does not exist yet** — nothing consumes `BankTransaction` beyond the parser and the manual tester. Things to decide:

1. **Where cents → major units converts on persistence.** When mapping `BankTransaction` (cents) into `SpendingEntry.amount` (`Float`, major units), divide by 100 at that single boundary. Decide whether to round-trip through `Float` at all, or take this as the trigger to migrate storage to `Int` cents (see #5).

2. **Import → data-model mapping.** How does a bank transaction become app data? Which `SpendingItem`/`Category` does a debit land in? Auto-categorization vs. manual review UI? Credits (income) vs. debits (spending)? This mapping layer is unwritten and is the bulk of the remaining feature.

3. **Dedup on re-import.** `BankTransaction.externalId` (bank reference) is a hint, not guaranteed unique/present; the type's doc says fall back to a date+amount+description heuristic. Decide the dedup key and how to handle partial/overlapping statement re-imports.

4. **Reconciliation UX.** What happens on `reconciled: false`? Block the import, show the `difference` (in cents) for review, allow override? The result object exposes `movement`, `expectedClosing`, `actualClosing`, `difference`.

5. **Whether/when to migrate the whole app to integer cents.** Optional but recommended eventually. Surface: DB migration on 4 `Float`→`Int` columns + a `round(value*100)` data conversion of existing rows; ~20–25 call sites (3 `parseFloat` entry points → `Math.round(parseFloat*100)`, ~15 sum/display sites, fold `/100` into `formatAmount`); update the 3 intentional float-drift assertions in `lib/__tests__/utils.test.ts`. Doing MT940 in cents now means the import path is already integer end-to-end, so this migration would meet it cleanly rather than fighting it.

6. **Currency assumptions.** Parser assumes 2-dp minor units (CHF/EUR/USD). If multi-currency or 0-/3-dp currencies (JPY, etc.) ever matter, revisit the fixed `*100` scale.

7. **MT940 field coverage confidence.** The `:86:` structured-subfield mapping (`?00` booking text, `?20–?29` remittance, `?32/?33` counterparty) follows the common SWIFT convention but should be validated against more real UBS exports — banks vary in which subfields they populate.

**Ship judgment:** the import can ship without a full app-wide cents migration **as long as reconciliation stays in integer cents** (it now is). Never ship a float equality reconciliation check. The parser/reconciliation are safe; the remaining risk is all in the unwritten mapping/persistence/dedup layer.
