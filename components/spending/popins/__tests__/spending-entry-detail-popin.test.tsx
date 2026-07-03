// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EntryDetailPopin } from "@/components/spending/popins/spending-entry-detail-popin";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { SettingsProvider } from "@/lib/settings-context";

// SettingsProvider calls getSettings() on mount; keep it offline so it falls
// back to the USD default.
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

const entries: SpendingEntry[] = [
  { id: "e1", name: "Coop", date: "2026-06-01", amount: 1200, direction: "debit" },
  { id: "e2", name: "Migros", date: "2026-06-10", amount: 3400, direction: "debit" },
  { id: "e3", name: "Aldi", date: "2026-06-20", amount: 560, direction: "debit" },
];

type PopinProps = ComponentProps<typeof EntryDetailPopin>;

function renderPopin(overrides: Partial<PopinProps> = {}) {

  const onNavigate = vi.fn();

  const props: PopinProps = {
    isOpen: true,
    onClose: vi.fn(),
    onEdit: vi.fn(),
    entry: entries[1],
    entries,
    onNavigate,
    spendingName: "Groceries",
    spendingItemIcon: "shopping-cart",
    spendingCategoryColor: "#34C759",
    ...overrides,
  };

  const { rerender } = render(
    <SettingsProvider>
      <EntryDetailPopin {...props} />
    </SettingsProvider>,
  );

  const rerenderPopin = (next: Partial<PopinProps>) =>
    rerender(
      <SettingsProvider>
        <EntryDetailPopin {...props} {...next} />
      </SettingsProvider>,
    );

  return { onNavigate, rerenderPopin };
}

function swipe(target: HTMLElement, fromX: number, toX: number, y = 300) {
  fireEvent.touchStart(target, { touches: [{ clientX: fromX, clientY: y }] });
  fireEvent.touchEnd(target, { changedTouches: [{ clientX: toX, clientY: y }] });
}

describe("EntryDetailPopin — sibling paging", () => {
  it("shows the position counter when siblings exist", () => {
    renderPopin();

    expect(screen.getByText("Entry 2 of 3")).toBeDefined();
  });

  it("hides the counter for a single entry", () => {
    renderPopin({ entries: [entries[1]] });

    expect(screen.queryByText(/Entry \d+ of/)).toBeNull();
  });

  it("pages with the keyboard arrows", () => {
    const { onNavigate } = renderPopin();

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(onNavigate).toHaveBeenCalledWith(entries[2]);

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(onNavigate).toHaveBeenCalledWith(entries[0]);
  });

  it("does not page past either end", () => {
    const { onNavigate } = renderPopin({ entry: entries[0] });

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("pages on a horizontal swipe (left = next, right = previous)", () => {
    const { onNavigate } = renderPopin();
    const content = screen.getByText("Migros").closest(".space-y-5") as HTMLElement;

    swipe(content, 300, 100);

    expect(onNavigate).toHaveBeenCalledWith(entries[2]);

    swipe(content, 100, 300);

    expect(onNavigate).toHaveBeenCalledWith(entries[0]);
  });

  it("ignores short and mostly-vertical touches", () => {
    const { onNavigate } = renderPopin();
    const content = screen.getByText("Migros").closest(".space-y-5") as HTMLElement;

    swipe(content, 300, 280);

    fireEvent.touchStart(content, { touches: [{ clientX: 300, clientY: 100 }] });
    fireEvent.touchEnd(content, { changedTouches: [{ clientX: 200, clientY: 400 }] });

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("slides the whole sheet in from the side the user paged toward", () => {
    const { onNavigate, rerenderPopin } = renderPopin();
    const sheet = () => screen.getByText("Groceries").closest('[tabindex="-1"]') as HTMLElement;

    // Initial open renders without a slide.
    expect(sheet().className).not.toContain("animate-in");

    swipe(sheet(), 300, 100);

    expect(onNavigate).toHaveBeenCalledWith(entries[2]);

    // The parent applies the navigation; the incoming sheet slides from the right.
    rerenderPopin({ entry: entries[2] });

    expect(sheet().className).toContain("slide-in-from-right-7");

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    rerenderPopin({ entry: entries[1] });

    expect(sheet().className).toContain("slide-in-from-left-7");
  });

  it("shows no pager affordance when the entry is not among the siblings", () => {
    const orphan: SpendingEntry = { id: "zz", name: "Orphan", date: "2026-06-05", amount: 100, direction: "debit" };

    const { onNavigate } = renderPopin({ entry: orphan });

    expect(screen.queryByText(/Entry \d+ of/)).toBeNull();

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
