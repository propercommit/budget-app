// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  getSettings: vi.fn().mockRejectedValue(new Error("offline")),
  updateSettings: vi.fn(),
}));

import { SettingsProvider } from "@/lib/settings-context";
import { TrendsCard } from "@/components/trends/trends-card";

describe("TrendsCard — single month of data", () => {
  it("shows the month's real values and hides the change badges", () => {
    render(
      <SettingsProvider>
        <TrendsCard
          spendingData={[{ label: "Jul", value: 4200 }]}
          incomeData={[{ label: "Jul", value: 5800 }]}
          categoryData={{}}
          categories={[]}
        />
      </SettingsProvider>,
    );

    expect(screen.getByText(/42/)).toBeInTheDocument();

    expect(screen.getByText(/58/)).toBeInTheDocument();

    expect(screen.getByText("Net Savings")).toBeInTheDocument();

    expect(screen.getByText(/16/)).toBeInTheDocument();

    expect(screen.queryByText("vs last")).toBeNull();
  });

  it("brings the change badges back once a previous month exists", () => {
    render(
      <SettingsProvider>
        <TrendsCard
          spendingData={[{ label: "Jun", value: 4000 }, { label: "Jul", value: 4200 }]}
          incomeData={[{ label: "Jun", value: 5000 }, { label: "Jul", value: 5800 }]}
          categoryData={{}}
          categories={[]}
        />
      </SettingsProvider>,
    );

    expect(screen.getAllByText("vs last")).toHaveLength(2);
  });
});
