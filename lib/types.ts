export interface SpendingEntry {
  id: string;
  name: string;
  amount: number;
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
  name: string;
  icon: string;
  budgeted: number;
  spent: number;
  month: string;
  startDate: string;
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
};