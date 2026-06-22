// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonthPicker } from "@/components/month-picker";

beforeEach(() => {
  vi.useFakeTimers();
  // Pin "now" so isCurrentMonth / goToToday are deterministic.
  vi.setSystemTime(new Date("2026-06-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MonthPicker — label formatting", () => {
  it("renders a human-readable month and year from the YYYY-MM string", () => {
    render(<MonthPicker selectedMonth="2026-06" onMonthChange={() => {}} />);
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });
});

describe("MonthPicker — navigation keeps the zero-padded YYYY-MM format", () => {
  it("steps to the previous month within the same year", () => {
    const onMonthChange = vi.fn();
    render(<MonthPicker selectedMonth="2026-06" onMonthChange={onMonthChange} />);
    // Buttons in order: prev chevron, next chevron, Today.
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onMonthChange).toHaveBeenCalledWith("2026-05");
  });

  it("zero-pads single-digit months when stepping forward", () => {
    const onMonthChange = vi.fn();
    render(<MonthPicker selectedMonth="2026-08" onMonthChange={onMonthChange} />);
    // Next button is the second icon button.
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(onMonthChange).toHaveBeenCalledWith("2026-09");
  });

  it("rolls over from December to the next January (year increments)", () => {
    const onMonthChange = vi.fn();
    render(<MonthPicker selectedMonth="2026-12" onMonthChange={onMonthChange} />);
    fireEvent.click(screen.getAllByRole("button")[1]); // next
    expect(onMonthChange).toHaveBeenCalledWith("2027-01");
  });

  it("rolls back from January to the prior December (year decrements)", () => {
    const onMonthChange = vi.fn();
    render(<MonthPicker selectedMonth="2026-01" onMonthChange={onMonthChange} />);
    fireEvent.click(screen.getAllByRole("button")[0]); // prev
    expect(onMonthChange).toHaveBeenCalledWith("2025-12");
  });
});

describe("MonthPicker — Today button", () => {
  it("is disabled when already on the current month", () => {
    render(<MonthPicker selectedMonth="2026-06" onMonthChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Today" })).toBeDisabled();
  });

  it("jumps to the zero-padded current month when clicked from another month", () => {
    const onMonthChange = vi.fn();
    render(<MonthPicker selectedMonth="2026-02" onMonthChange={onMonthChange} />);
    const today = screen.getByRole("button", { name: "Today" });
    expect(today).not.toBeDisabled();
    fireEvent.click(today);
    expect(onMonthChange).toHaveBeenCalledWith("2026-06");
  });
});
