// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { CategoryRibbon } from "@/components/category/category-ribbon";

// The ribbon observes its desktop row to re-fit pills on resize; jsdom lacks
// ResizeObserver (and reports zero widths, so the visible count keeps the
// full budget here — the fit-to-width behavior is covered by the Playwright
// suite).
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// jsdom applies no CSS, so BOTH responsive rows render: every category pill
// exists once in the mobile scroll row, and visible ones a second time in the
// desktop row. Assertions therefore count occurrences instead of using
// single-element queries.
const names = ["Groceries", "Transport", "Rent", "Dining", "Shopping", "Gifts", "Kids"];

const categories = names.map((name) => ({ name, icon: "shopping-cart", color: "#34C759" }));

type RibbonProps = ComponentProps<typeof CategoryRibbon>;

function renderRibbon(overrides: Partial<RibbonProps> = {}) {

  const handlers = {
    onSelect: vi.fn(),
    onAddCategory: vi.fn(),
    onManage: vi.fn(),
  };

  const { rerender } = render(
    <CategoryRibbon
      categories={categories}
      selectedCategory="all"
      {...handlers}
      {...overrides}
    />,
  );

  const rerenderRibbon = (next: Partial<RibbonProps> = {}) =>
    rerender(
      <CategoryRibbon
        categories={categories}
        selectedCategory="all"
        {...handlers}
        {...overrides}
        {...next}
      />,
    );

  return { ...handlers, rerenderRibbon };
}

function pillCount(name: string) {
  return screen.queryAllByRole("button", { name }).length;
}

describe("CategoryRibbon — +N overflow peek (desktop)", () => {
  it("renders no overflow pill when categories fit the visible budget", () => {
    renderRibbon({ categories: categories.slice(0, 5) });

    expect(screen.queryByRole("button", { name: /^\+\d/ })).toBeNull();

    // All five appear in both rows.
    expect(pillCount("Shopping")).toBe(2);
  });

  it("collapses categories beyond the budget into a +N pill", () => {
    renderRibbon();

    expect(screen.getByRole("button", { name: "+2" })).toBeDefined();

    // Visible in both rows; hidden ones only in the mobile row.
    expect(pillCount("Shopping")).toBe(2);
    expect(pillCount("Gifts")).toBe(1);
    expect(pillCount("Kids")).toBe(1);
  });

  it("opens the peek on click, listing only the hidden categories", () => {
    renderRibbon();

    fireEvent.click(screen.getByRole("button", { name: "+2" }));

    expect(pillCount("Gifts")).toBe(2);
    expect(pillCount("Kids")).toBe(2);
    expect(pillCount("Shopping")).toBe(2);
  });

  it("opens on hover and closes on mouse leave", () => {
    renderRibbon();

    const wrapper = screen.getByRole("button", { name: "+2" }).parentElement as HTMLElement;

    fireEvent.mouseEnter(wrapper);
    expect(pillCount("Gifts")).toBe(2);

    fireEvent.mouseLeave(wrapper);
    expect(pillCount("Gifts")).toBe(1);
  });

  it("selecting a peeked category fires onSelect and closes the peek", () => {
    const { onSelect } = renderRibbon();

    fireEvent.click(screen.getByRole("button", { name: "+2" }));

    // Index 1 is the peek pill (index 0 is the mobile-row pill).
    fireEvent.click(screen.getAllByRole("button", { name: "Gifts" })[1]);

    expect(onSelect).toHaveBeenCalledWith("Gifts");
    expect(pillCount("Kids")).toBe(1);
  });

  it("promotes a hidden selected category into the visible row", () => {
    renderRibbon({ selectedCategory: "Kids" });

    // Promoted: present in the desktop row without opening the peek.
    expect(pillCount("Kids")).toBe(2);

    // The budget is unchanged, so another category was displaced into hiding.
    expect(screen.getByRole("button", { name: "+2" })).toBeDefined();
    expect(pillCount("Shopping")).toBe(1);
  });

  it("never promotes a category literally named \"all\" for the All-filter sentinel", () => {
    const withAll = [...categories.slice(0, 5), { name: "all", icon: "shopping-cart", color: "#AF52DE" }];

    renderRibbon({ categories: withAll, selectedCategory: "all" });

    // The "all" CATEGORY stays hidden (mobile row only); no promotion, no reorder.
    expect(pillCount("all")).toBe(1);
    expect(screen.getByRole("button", { name: "+1" })).toBeDefined();
    expect(pillCount("Shopping")).toBe(2);
  });

  it("resets a click-opened peek when the overflow empties, so +N never re-mounts pre-opened", () => {
    const { rerenderRibbon } = renderRibbon();

    fireEvent.click(screen.getByRole("button", { name: "+2" }));
    expect(pillCount("Gifts")).toBe(2);

    // Deletions shrink the list under the budget: the wrapper unmounts...
    rerenderRibbon({ categories: categories.slice(0, 5) });
    expect(screen.queryByRole("button", { name: /^\+\d/ })).toBeNull();

    // ...and when the overflow returns, the peek must be closed.
    rerenderRibbon({ categories: categories.slice(0, 6) });

    expect(screen.getByRole("button", { name: "+1" })).toHaveProperty("ariaExpanded", "false");
    expect(pillCount("Gifts")).toBe(1);
  });
});
