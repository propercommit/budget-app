// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { TrendsCard } from "@/components/trends/trends-card";

const props = { spendingData: [], incomeData: [], categoryData: {}, categories: [] };

describe("TrendsCard — first-run empty state", () => {
  it("renders the unlock pill instead of the stat boxes when isEmpty", () => {
    render(
      <SettingsProvider>
        <TrendsCard {...props} isEmpty />
      </SettingsProvider>,
    );

    expect(screen.getByText("Unlocks after month 1")).toBeInTheDocument();

    expect(screen.queryByText("Net Savings")).toBeNull();
  });

  it("keeps the stat boxes without isEmpty", () => {
    render(
      <SettingsProvider>
        <TrendsCard {...props} />
      </SettingsProvider>,
    );

    expect(screen.getByText("Net Savings")).toBeInTheDocument();

    expect(screen.queryByText("Unlocks after month 1")).toBeNull();
  });
});
