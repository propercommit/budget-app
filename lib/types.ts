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
  /** Synthesized `"YYYY-MM-01"` — no longer stored; kept until the UI drops it. */
  startDate: string;
  /** Always `null` since the series refactor; kept until the UI drops it. */
  endDate?: string | null;
  note?: string | null;
  categoryId: string;
  category?: Category;
  entries?: SpendingEntry[];
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