// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock the full client -> /api boundary; the SettingsProvider stays offline
// and falls back to defaults, everything else is asserted per test.
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
  getSpending: vi.fn(),
  createSpending: vi.fn(),
  updateSpending: vi.fn(),
  deleteSpending: vi.fn(),
  // Fires on Dashboard mount; rejecting keeps the initial bucket untouched
  // (the hook swallows materialize failures by design).
  materializeMonth: vi.fn().mockRejectedValue(new Error("offline")),
  getSeries: vi.fn().mockResolvedValue([]),
  getIncomeSources: vi.fn(),
  getAllIncomeSources: vi.fn(),
  createIncomeSource: vi.fn(),
  updateIncomeSource: vi.fn(),
  deleteIncomeSource: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  issueReceiptUpload: vi.fn(),
  confirmReceipt: vi.fn(),
  getReceiptUrl: vi.fn(),
  deleteReceipt: vi.fn(),
}));

// The browser->Storage leg of the receipt chain — the hook-test seam. Never
// mock @supabase/supabase-js here: lib/supabase builds its client via
// @supabase/ssr.
vi.mock("@/lib/upload-receipt", () => ({
  uploadReceiptFile: vi.fn(),
}));

// Compression is canvas-based and impossible in jsdom — the popin's file
// handler is driven through a mocked prepare step instead.
vi.mock("@/lib/receipt-file", () => ({
  prepareReceiptFile: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
}));

// The Header runs its own supabase.auth.getUser() on mount.
vi.mock("@/lib/supabase", () => ({
  createClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { Dashboard } from "@/components/dashboard";
import { SettingsProvider } from "@/lib/settings-context";
import * as api from "@/lib/api";
import { uploadReceiptFile } from "@/lib/upload-receipt";
import { prepareReceiptFile } from "@/lib/receipt-file";
import { showErrorToast } from "@/lib/toast";
import type { Category, SpendingItem } from "@/lib/types";

// jsdom lacks ResizeObserver (Radix Select in the expanded card) and the
// object-URL API (the staged receipt preview).
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  URL.createObjectURL = vi.fn(() => "blob:receipt-preview");
  URL.revokeObjectURL = vi.fn();
});

const MONTH = "2026-06";

const CATEGORY: Category = { id: "cat-1", label: "Food", icon: "shopping-cart", color: "#FF9500" };

function makeItem(): SpendingItem {
  return {
    id: "item-1",
    seriesId: "ser-1",
    name: "Groceries",
    icon: "shopping-cart",
    recurring: true,
    budgeted: 10_000,
    spent: 450,
    month: MONTH,
    note: null,
    categoryId: CATEGORY.id,
    category: CATEGORY,
    entries: [
      {
        id: "e1",
        name: "Migros",
        amount: 450,
        direction: "debit",
        receiptPath: null,
        link: null,
        date: "2026-06-05",
        spendingItemId: "item-1",
      },
    ],
  };
}

function renderDashboard() {
  render(
    <SettingsProvider>
      <Dashboard
        initialCategories={[CATEGORY]}
        initialSpendingData={{ [MONTH]: [makeItem()] }}
        initialIncomeSources={[]}
        initialAllIncomeSources={[]}
        initialMonth={MONTH}
      />
    </SettingsProvider>,
  );
}

/** Expands the card, opens the Add Entry popin and fills the required fields. */
function openPopinAndFill(name: string, amount: string) {

  fireEvent.click(screen.getByRole("button", { name: "Show entries" }));

  // Only the card's button exists yet — the popin (with its same-named footer
  // button) is portaled in after this click.
  fireEvent.click(screen.getByRole("button", { name: "Add Entry" }));

  fireEvent.change(screen.getByPlaceholderText("e.g., Shell Station, Grocery run"), { target: { value: name } });

  fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: amount } });
}

/** The popin footer's save button — the card's opener carries the Plus svg. */
function clickSave() {

  const save = screen
    .getAllByRole("button", { name: "Add Entry" })
    .find((b) => b.querySelector("svg") === null);

  expect(save).toBeDefined();

  fireEvent.click(save as HTMLElement);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Dashboard — entry save (receipt never rides the entry body)", () => {
  it("saves a plain entry: createEntry gets no receipt/receiptUrl/receiptPath key and no upload chain runs", async () => {
    vi.mocked(api.createEntry).mockResolvedValue({
      id: "entry-real-1",
      name: "Coffee",
      amount: 450,
      direction: "debit",
      receiptPath: null,
      link: null,
      date: "2026-06-10",
      spendingItemId: "item-1",
    });

    renderDashboard();

    openPopinAndFill("Coffee", "4.50");

    clickSave();

    await waitFor(() => expect(api.createEntry).toHaveBeenCalledTimes(1));

    const payload = vi.mocked(api.createEntry).mock.calls[0][0];
    expect(payload).toEqual({
      spendingItemId: "item-1",
      name: "Coffee",
      amount: 450,
      direction: "debit",
      date: expect.any(String),
      link: undefined,
    });
    expect("receipt" in payload).toBe(false);
    expect("receiptUrl" in payload).toBe(false);
    expect("receiptPath" in payload).toBe(false);

    // Flush the post-save continuations: with a "keep" action the receipt
    // chain must never start.
    await act(async () => {});

    expect(api.issueReceiptUpload).not.toHaveBeenCalled();
    expect(uploadReceiptFile).not.toHaveBeenCalled();
    expect(api.confirmReceipt).not.toHaveBeenCalled();
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it("saves with a staged file: issue -> upload -> confirm run in order against the SERVER-returned id", async () => {
    const rawFile = new File(["raw-receipt-bytes"], "receipt.jpg", { type: "image/jpeg" });
    const preparedFile = new File(["prepared-receipt"], "receipt.jpg", { type: "image/jpeg" });

    vi.mocked(prepareReceiptFile).mockResolvedValue({ kind: "ready", file: preparedFile });
    vi.mocked(api.createEntry).mockResolvedValue({
      id: "entry-real-9",
      name: "Dinner",
      amount: 1200,
      direction: "debit",
      receiptPath: null,
      link: null,
      date: "2026-06-12",
      spendingItemId: "item-1",
    });
    vi.mocked(api.issueReceiptUpload).mockResolvedValue({ path: "user-123/entry-real-9", token: "tok-1" });
    vi.mocked(uploadReceiptFile).mockResolvedValue(undefined);
    vi.mocked(api.confirmReceipt).mockResolvedValue({ receiptPath: "user-123/entry-real-9", receiptSizeBytes: 1234 });

    renderDashboard();

    openPopinAndFill("Dinner", "12.00");

    fireEvent.change(screen.getByLabelText(/Upload receipt/), { target: { files: [rawFile] } });

    // The staged preview means prepareReceiptFile resolved and the popin holds
    // an attach action.
    await waitFor(() => expect(screen.getByAltText("Receipt preview")).toBeInTheDocument());

    expect(prepareReceiptFile).toHaveBeenCalledWith(rawFile);

    clickSave();

    // The chain starts only after the POST returned the persisted id — the
    // optimistic temp id never reaches the receipt route.
    await waitFor(() => expect(api.confirmReceipt).toHaveBeenCalledWith("entry-real-9"));

    const payload = vi.mocked(api.createEntry).mock.calls[0][0];
    expect("receipt" in payload).toBe(false);
    expect("receiptUrl" in payload).toBe(false);
    expect("receiptPath" in payload).toBe(false);

    expect(api.issueReceiptUpload).toHaveBeenCalledTimes(1);
    expect(api.issueReceiptUpload).toHaveBeenCalledWith("entry-real-9", { sizeBytes: preparedFile.size });

    expect(uploadReceiptFile).toHaveBeenCalledTimes(1);
    expect(uploadReceiptFile).toHaveBeenCalledWith("user-123/entry-real-9", "tok-1", preparedFile);

    const createOrder = vi.mocked(api.createEntry).mock.invocationCallOrder[0];
    const issueOrder = vi.mocked(api.issueReceiptUpload).mock.invocationCallOrder[0];
    const uploadOrder = vi.mocked(uploadReceiptFile).mock.invocationCallOrder[0];
    const confirmOrder = vi.mocked(api.confirmReceipt).mock.invocationCallOrder[0];

    expect(createOrder).toBeLessThan(issueOrder);
    expect(issueOrder).toBeLessThan(uploadOrder);
    expect(uploadOrder).toBeLessThan(confirmOrder);

    expect(showErrorToast).not.toHaveBeenCalled();
  });
});
