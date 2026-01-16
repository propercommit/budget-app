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
  categoryId: string;
  category?: Category;
}

export interface MonthlyIncome {
  id: string;
  month: string;
  active: number;
  passive: number;
}