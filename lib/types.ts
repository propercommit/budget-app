export interface SpendingEntry {
  id: string;
  name: string;
  amount: number; // integer cents, always a positive magnitude
  direction: "debit" | "credit"; // sign of the entry's effect on spent
  receiptUrl: string | null;
  link: string | null;
  date: string;
  spendingItemId: string;
}

export interface Category {
  id: string;
  icon: string;
  label: string;
  color: string;
}

export interface SpendingItem {
  id: string;
  /** The BudgetSeries this incarnation belongs to — identity across months. */
  seriesId: string;
  name: string;
  icon: string;
  /** Series-level flag: whether this line materializes into future months. */
  recurring: boolean;
  budgeted: number;
  spent: number;
  month: string;
  note?: string | null;
  categoryId: string;
  category?: Category;
  entries?: SpendingEntry[];
}

/**
 * A series as listed by GET /api/spending/series — the create popin's
 * typeahead rows. The activity summary tells dormant from active and feeds
 * the Resume prefill (last budget) and the "Paused · Jan – May 2025" copy.
 */
export interface BudgetSeriesSummary {
  id: string;
  name: string;
  icon: string;
  categoryId: string;
  categoryLabel: string;
  categoryColor: string;
  recurring: boolean;
  firstActiveMonth: string | null;
  lastActiveMonth: string | null;
  /** Integer cents of the latest incarnation's budget; null if none exist. */
  lastBudgeted: number | null;
}

export type IncomeSource = {
    id: string;
    name: string;
    amount: number;
    icon: string;
    type: "active" | "passive";
    startDate: Date;
    endDate?: Date;
    note?: string;
    month: string;
};