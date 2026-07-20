import type { Category } from "@/lib/types";
import { INCOME_DESTINATION_ID } from "@/lib/import/review";

/** Display coordinates of a review destination (a category, or Income). */
export interface DestinationInfo {
  id: string;
  label: string;
  icon: string;
  color: string;
}

/** The pseudo-destination for routing a credit to income. */
export const INCOME_DESTINATION: DestinationInfo = {
  id: INCOME_DESTINATION_ID,
  label: "Income",
  icon: "banknote-arrow-up",
  color: "#34C759",
};

/**
 * Resolves a destination id to its display info. Unknown ids (e.g. a category
 * deleted mid-review) degrade to a neutral gray so the row stays legible.
 */
export function destinationInfo(dest: string, categories: Category[]): DestinationInfo {

  if (dest === INCOME_DESTINATION_ID) return INCOME_DESTINATION;

  const category = categories.find((entry) => entry.id === dest);

  if (category === undefined) return { id: dest, label: "Unknown", icon: "grid", color: "#8E8E93" };

  return { id: category.id, label: category.label, icon: category.icon, color: category.color };
}
