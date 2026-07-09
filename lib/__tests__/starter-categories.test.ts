import { describe, it, expect } from "vitest";
import { STARTER_CATEGORIES, findStarterCategory } from "@/lib/starter-categories";
import { iconMap, availableIcons } from "@/lib/icon-map";
import { Category } from "@/lib/types";

const category = (label: string): Category => ({ id: `cat-${label}`, label, icon: "shopping-cart", color: "#FF3B30" });

describe("findStarterCategory", () => {
  it("matches an exact label", () => {
    expect(findStarterCategory([category("Housing")], "Housing")?.label).toBe("Housing");
  });

  it("matches case-insensitively", () => {
    expect(findStarterCategory([category("housing")], "Housing")?.label).toBe("housing");
  });

  it("matches ignoring surrounding whitespace", () => {
    expect(findStarterCategory([category(" Housing ")], "Housing")?.label).toBe(" Housing ");
  });

  it("returns undefined when no label matches", () => {
    expect(findStarterCategory([category("Food")], "Housing")).toBeUndefined();
  });

  it("returns undefined for an empty category list", () => {
    expect(findStarterCategory([], "Housing")).toBeUndefined();
  });
});

describe("STARTER_CATEGORIES", () => {
  it("is the six-chip pack from the design handoff", () => {
    expect(STARTER_CATEGORIES).toEqual([
      { name: "Housing", color: "#f59e0b", icon: "home" },
      { name: "Food", color: "#ef4444", icon: "utensils" },
      { name: "Transport", color: "#3b82f6", icon: "car" },
      { name: "Fun", color: "#a855f7", icon: "film" },
      { name: "Health", color: "#10b981", icon: "heart-pulse" },
      { name: "Savings", color: "#64748b", icon: "piggy-bank" },
    ]);
  });

  it("uses only icons that exist in iconMap and the IconPicker set", () => {
    for (const starter of STARTER_CATEGORIES) {
      expect(iconMap[starter.icon]).toBeDefined();

      expect(availableIcons.some(icon => icon.id === starter.icon)).toBe(true);
    }
  });
});
