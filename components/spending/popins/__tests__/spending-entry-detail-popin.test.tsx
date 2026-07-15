// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { EntryDetailPopin } from "@/components/spending/popins/spending-entry-detail-popin";
import type { SpendingEntry } from "@/components/spending/spending-card-expanded";
import { SettingsProvider } from "@/lib/settings-context";
import { getReceiptUrl } from "@/lib/api";
import { ApiError } from "@/lib/api-error";

// SettingsProvider calls getSettings() on mount; keep it offline so it falls
// back to the USD default. getReceiptUrl backs useReceiptUrl's fetch-on-open;
// each receipt test programs it explicitly.
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
  getReceiptUrl: vi.fn(),
}));

const getReceiptUrlMock = vi.mocked(getReceiptUrl);

beforeEach(() => {
  getReceiptUrlMock.mockReset();
});

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

describe("EntryDetailPopin — receipt block", () => {

  const receiptEntry: SpendingEntry = { id: "e9", name: "Pharmacy", date: "2026-06-15", amount: 2500, direction: "debit", receiptPath: "user-1/e9" };

  it("fetches a signed URL once and renders the thumbnail from it", async () => {
    getReceiptUrlMock.mockResolvedValue({ url: "https://signed.example/receipts/user-1/e9?token=abc" });

    renderPopin({ entry: receiptEntry, entries: [receiptEntry] });

    const thumbnail = await screen.findByAltText("Receipt");

    expect(thumbnail).toHaveAttribute("src", "https://signed.example/receipts/user-1/e9?token=abc");

    expect(getReceiptUrlMock).toHaveBeenCalledTimes(1);

    expect(getReceiptUrlMock).toHaveBeenCalledWith("e9");
  });

  it("shows no receipt block and fetches nothing when the entry has no receiptPath", () => {
    renderPopin();

    expect(screen.queryByText("Receipt")).toBeNull();

    expect(getReceiptUrlMock).not.toHaveBeenCalled();
  });

  it("treats a 404 as receipt-gone: no thumbnail, no retry, and the owner is told", async () => {
    getReceiptUrlMock.mockRejectedValue(new ApiError("no_receipt", 404));

    const onReceiptGone = vi.fn();

    const { rerenderPopin } = renderPopin({ entry: receiptEntry, entries: [receiptEntry], onReceiptGone });

    await waitFor(() => expect(onReceiptGone).toHaveBeenCalledWith("e9"));

    expect(screen.queryByAltText("Receipt")).toBeNull();

    expect(screen.queryByText(/tap to retry/)).toBeNull();

    // The gone-callback lets the owner clear the stale pointer — once it
    // does, the whole receipt block disappears.
    rerenderPopin({ entry: { ...receiptEntry, receiptPath: null }, entries: [receiptEntry], onReceiptGone });

    expect(screen.queryByText("Receipt")).toBeNull();
  });

  it("renders the retry affordance on a 500 and refetches on tap", async () => {
    getReceiptUrlMock
      .mockRejectedValueOnce(new ApiError("Failed to create receipt URL", 500))
      .mockResolvedValueOnce({ url: "https://signed.example/fresh" });

    renderPopin({ entry: receiptEntry, entries: [receiptEntry] });

    const retryButton = await screen.findByRole("button", { name: "Couldn't load receipt — tap to retry" });

    fireEvent.click(retryButton);

    const thumbnail = await screen.findByAltText("Receipt");

    expect(thumbnail).toHaveAttribute("src", "https://signed.example/fresh");

    expect(getReceiptUrlMock).toHaveBeenCalledTimes(2);
  });
});
