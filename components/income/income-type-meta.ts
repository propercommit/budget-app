import { IncomeSource } from "@/lib/types";

export type IncomeType = IncomeSource["type"];

/** Static presentation attributes per income type, shared by the card views. */
export const INCOME_TYPE_META: Record<IncomeType, { color: string; label: string }> = {
    active: { color: "var(--primary)", label: "Active" },
    passive: { color: "var(--attention)", label: "Passive" },
};

/** Display order of the types in donuts, legends and breakdown lists. */
export const INCOME_TYPES: IncomeType[] = ["active", "passive"];

/**
 * Per-type figures derived once by the parent card ({@link INCOME_TYPE_META}
 * plus the month's totals) and consumed by both the collapsed and expanded views.
 */
export interface IncomeTypeFigures {
    type: IncomeType;
    color: string;
    label: string;
    total: number;
    percentage: number;
}
