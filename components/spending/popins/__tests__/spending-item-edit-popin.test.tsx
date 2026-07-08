// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// SettingsProvider calls getSettings() on mount; offline → USD defaults.
vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { SpendingItemEditPopin } from "@/components/spending/popins/spending-item-edit-popin";
import type { BudgetSeriesSummary } from "@/lib/types";

const categories = [
  { name: "Entertainment", icon: "film", color: "#AF52DE" },
  { name: "Utilities", icon: "zap", color: "#007AFF" },
];

// Genuinely dormant: recurring off is what makes a series "Paused" (the
// Resume row) — an active series missing from the month is an Add row instead.
const netflix: BudgetSeriesSummary = {
  id: "ser-netflix",
  name: "Netflix",
  icon: "film",
  categoryId: "c-fun",
  categoryLabel: "Entertainment",
  categoryColor: "#AF52DE",
  recurring: false,
  firstActiveMonth: "2025-01",
  lastActiveMonth: "2025-05",
  lastBudgeted: 1890,
};

// Active (recurring) series with no incarnation in the open month — the
// typeahead's third row state (Add). Named to miss the "net" queries so the
// dormant/disabled tests keep their exact row sets.
const spotify: BudgetSeriesSummary = {
  id: "ser-spotify",
  name: "Spotify",
  icon: "film",
  categoryId: "c-fun",
  categoryLabel: "Entertainment",
  categoryColor: "#AF52DE",
  recurring: true,
  firstActiveMonth: "2026-01",
  lastActiveMonth: "2026-06",
  lastBudgeted: 1290,
};

const internet: BudgetSeriesSummary = {
  id: "ser-internet",
  name: "Internet",
  icon: "zap",
  categoryId: "c-util",
  categoryLabel: "Utilities",
  categoryColor: "#007AFF",
  recurring: true,
  firstActiveMonth: "2026-01",
  lastActiveMonth: "2026-07",
  lastBudgeted: 4900,
};

function renderCreatePopin(over: Partial<Parameters<typeof SpendingItemEditPopin>[0]> = {}) {
  return render(
    <SettingsProvider>
      <SpendingItemEditPopin
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        mode="create"
        categories={categories}
        seriesOptions={[netflix, internet, spotify]}
        activeSeriesIds={["ser-internet"]}
        selectedMonth="2026-07"
        {...over}
      />
    </SettingsProvider>
  );
}

function typeName(value: string) {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SpendingItemEditPopin — series typeahead", () => {
  it("lists dormant matches with a Resume pill and paused summary", () => {
    renderCreatePopin();

    typeName("Net");

    expect(screen.getByText("Resume")).toBeInTheDocument();
    expect(screen.getByText("Paused · Jan – May 2025 · Budget: $ 18.90")).toBeInTheDocument();
  });

  it("disables a series already active in the open month", () => {
    renderCreatePopin();

    typeName("net"); // matches Netflix AND Internet, case-insensitively

    expect(screen.getByText("Already in July 2026 · Utilities")).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    const disabledRow = options.find((o) => o.getAttribute("aria-disabled") === "true");
    expect(disabledRow).toBeDefined();
  });

  it("always offers create-as-new for a non-exact query, never for an exact match (D24)", () => {
    renderCreatePopin();

    typeName("Net");
    expect(screen.getByText("Create “Net” as a new item")).toBeInTheDocument();

    typeName("Netflix");
    expect(screen.queryByText(/as a new item/)).not.toBeInTheDocument();
  });

  it("resume selection prefills the form and flips the submit label to Resume", () => {
    renderCreatePopin();

    typeName("Net");
    fireEvent.click(screen.getByText("Resume").closest("button") as HTMLButtonElement);

    expect(screen.getByLabelText("Name")).toHaveValue("Netflix");
    expect(screen.getByLabelText("Monthly budget amount")).toHaveValue(18.9);
    expect(screen.getByRole("radio", { name: /Entertainment/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("submits a resume with the seriesId and the series' recurring flag", async () => {
    const onSave = vi.fn();
    renderCreatePopin({ onSave });

    typeName("Net");
    fireEvent.click(screen.getByText("Resume").closest("button") as HTMLButtonElement);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Netflix",
      icon: "film",
      category: "Entertainment",
      budget: 1890,
      recurring: false,
      seriesId: "ser-netflix",
    });
  });

  it("lists an active series missing from the month with an Add pill and active summary", () => {
    renderCreatePopin();

    typeName("Spo");

    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("Active · Budget: $ 12.90")).toBeInTheDocument();
    expect(screen.queryByText(/Paused/)).not.toBeInTheDocument();
  });

  it("falls back to a plain Active subtitle when the active series has no incarnations", () => {
    renderCreatePopin({
      seriesOptions: [{ ...spotify, firstActiveMonth: null, lastActiveMonth: null, lastBudgeted: null }],
    });

    typeName("Spo");

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("add selection prefills the form and flips the submit label to Add", () => {
    renderCreatePopin();

    typeName("Spo");
    fireEvent.click(screen.getByText("Add").closest("button") as HTMLButtonElement);

    expect(screen.getByLabelText("Name")).toHaveValue("Spotify");
    expect(screen.getByLabelText("Monthly budget amount")).toHaveValue(12.9);
    expect(screen.getByRole("radio", { name: /Entertainment/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("submits an add with the seriesId and recurring left on", async () => {
    const onSave = vi.fn();
    renderCreatePopin({ onSave });

    typeName("Spo");
    fireEvent.click(screen.getByText("Add").closest("button") as HTMLButtonElement);
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: "Spotify",
      icon: "film",
      category: "Entertainment",
      budget: 1290,
      recurring: true,
      seriesId: "ser-spotify",
    });
  });

  it("editing the name after a selection reverts to a plain create (no seriesId)", async () => {
    const onSave = vi.fn();
    renderCreatePopin({ onSave });

    typeName("Net");
    fireEvent.click(screen.getByText("Resume").closest("button") as HTMLButtonElement);

    typeName("Netflix Premium");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].seriesId).toBeUndefined();
    expect(onSave.mock.calls[0][0].name).toBe("Netflix Premium");
  });
});

describe("SpendingItemEditPopin — recurring toggle", () => {
  it("defaults ON with the carry-forward copy and flips copy when toggled", () => {
    renderCreatePopin();

    const toggle = screen.getByRole("switch", { name: "Recurring" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Carry this item into future months")).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Keep this item in this month only")).toBeInTheDocument();
  });

  it("sends the toggled-off value on submit", async () => {
    const onSave = vi.fn();
    renderCreatePopin({ onSave });

    typeName("Gym");
    fireEvent.change(screen.getByLabelText("Monthly budget amount"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("radio", { name: /Utilities/ }));
    fireEvent.click(screen.getByRole("switch", { name: "Recurring" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].recurring).toBe(false);
  });
});

describe("SpendingItemEditPopin — conflict safety net", () => {
  it("stays open and shows the inline dormant-conflict state when onSave answers a 409", async () => {
    const onSave = vi.fn().mockResolvedValue("series_dormant");
    renderCreatePopin({ onSave });

    typeName("Netflix Premium");
    fireEvent.change(screen.getByLabelText("Monthly budget amount"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("radio", { name: /Entertainment/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toContain("pick it in the list below to resume it");
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("shows the inline not-in-month conflict state pointing at the list", async () => {
    const onSave = vi.fn().mockResolvedValue("series_not_in_month");
    renderCreatePopin({ onSave });

    typeName("Spotify");
    fireEvent.change(screen.getByLabelText("Monthly budget amount"), { target: { value: "13" } });
    fireEvent.click(screen.getByRole("radio", { name: /Entertainment/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toContain("pick it in the list below to add it to July 2026");
    expect(screen.getByLabelText("Name")).toHaveFocus();
  });

  it("names the month in the active-conflict state", async () => {
    const onSave = vi.fn().mockResolvedValue("series_active_this_month");
    renderCreatePopin({ onSave });

    typeName("Internet 2");
    fireEvent.change(screen.getByLabelText("Monthly budget amount"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("radio", { name: /Utilities/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toContain("already in July 2026");
  });
});

describe("SpendingItemEditPopin — edit mode", () => {
  function renderEditPopin(onSave = vi.fn(), initialRecurring = false) {
    return render(
      <SettingsProvider>
        <SpendingItemEditPopin
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
          mode="edit"
          categories={categories}
          initialName="Netflix"
          initialIcon="film"
          initialCategory="Entertainment"
          initialBudget={1890}
          initialRecurring={initialRecurring}
        />
      </SettingsProvider>
    );
  }

  it("shows no typeahead and keeps the Save label", () => {
    renderEditPopin();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Netfl" } });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("seeds the recurring toggle from the series' current value", () => {
    renderEditPopin();

    const toggle = screen.getByRole("switch", { name: "Recurring" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Keep this item in this month only")).toBeInTheDocument();
  });

  it("saves a recurring change made in edit mode", async () => {
    const onSave = vi.fn();
    renderEditPopin(onSave);

    fireEvent.click(screen.getByRole("switch", { name: "Recurring" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].recurring).toBe(true);
    expect(onSave.mock.calls[0][0].seriesId).toBeUndefined();
  });
});
