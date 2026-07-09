import { Category } from "./types";

/** A quick-start chip in the guided step-2 empty state. Colors come from the ColorPicker presets; icons are iconMap ids. */
export interface StarterCategory {
    name: string;
    color: string;
    icon: string;
}

/** The six-chip quick-add pack from the first-run design handoff. */
export const STARTER_CATEGORIES: StarterCategory[] = [
    { name: "Housing", color: "#f59e0b", icon: "home" },
    { name: "Food", color: "#ef4444", icon: "utensils" },
    { name: "Transport", color: "#3b82f6", icon: "car" },
    { name: "Fun", color: "#a855f7", icon: "film" },
    { name: "Health", color: "#10b981", icon: "heart-pulse" },
    { name: "Savings", color: "#64748b", icon: "piggy-bank" },
];

/**
 * The existing category a starter chip should reuse, if any — matched on the
 * trimmed, case-insensitive label so a user's "housing" blocks a duplicate
 * "Housing". Deliberately stricter than the API's exact-label unique
 * constraint: reuse beats near-duplicate creation, and a reused category is
 * never restyled. Returns undefined when the chip should create the category.
 */
export function findStarterCategory(categories: Category[], starterName: string): Category | undefined {

    const normalized = starterName.trim().toLowerCase();

    return categories.find(category => category.label.trim().toLowerCase() === normalized);
}
