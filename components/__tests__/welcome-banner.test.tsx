// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeBanner } from "@/components/welcome-banner";
import { WELCOME_BANNER_DISMISSED_KEY } from "@/lib/first-run";

describe("WelcomeBanner", () => {
  beforeEach(() => localStorage.clear());

  it("appears once the dismissed flag is known to be absent", () => {
    render(<WelcomeBanner />);

    expect(screen.getByText("Welcome to Budget Planner")).toBeInTheDocument();

    expect(screen.getByText("Two quick steps to get set up.")).toBeInTheDocument();
  });

  it("dismisses on the close button and persists the flag", () => {
    render(<WelcomeBanner />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss welcome banner" }));

    expect(screen.queryByText("Welcome to Budget Planner")).toBeNull();

    expect(localStorage.getItem(WELCOME_BANNER_DISMISSED_KEY)).toBe("1");
  });

  it("stays hidden when previously dismissed", () => {
    localStorage.setItem(WELCOME_BANNER_DISMISSED_KEY, "1");

    render(<WelcomeBanner />);

    expect(screen.queryByText("Welcome to Budget Planner")).toBeNull();
  });
});
