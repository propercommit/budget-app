/**
 * Presentation rule for a card's budget health, shared by the collapsed and
 * expanded card (progress bar and remaining pill): red once over budget,
 * orange from 85% of budget, green below. `tint` is the 10%-alpha hex-suffix
 * variant used as the remaining pill's background. Display-only — these
 * thresholds must never feed business logic.
 */
export function budgetStatusColor(budgetNumber: number, totalSpent: number): { color: string; tint: string } {

    const isOverBudget = totalSpent > budgetNumber;
    const isNearBudget = budgetNumber > 0 && totalSpent / budgetNumber >= 0.85;
    const color = isOverBudget ? "#FF3B30" : isNearBudget ? "#FF9500" : "#34C759";

    return { color, tint: `${color}1A` };
}
