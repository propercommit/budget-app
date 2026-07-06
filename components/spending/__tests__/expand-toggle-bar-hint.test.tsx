// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExpandToggleBar as ExpandToggleBarType } from "@/components/spending/expand-toggle-bar";

// The one-per-load gate is a module-scope flag, so each test re-imports a
// fresh module to start from an unconsumed hint.
beforeEach(() => {
  vi.resetModules();
});

async function freshExpandToggleBar(): Promise<typeof ExpandToggleBarType> {
  const barModule = await import("@/components/spending/expand-toggle-bar");

  return barModule.ExpandToggleBar;
}

describe("ExpandToggleBar — one-time 'View entries' hint", () => {
  it("shows the hint on the first collapsed bar, then never again that load", async () => {
    const ExpandToggleBar = await freshExpandToggleBar();

    const first = render(<ExpandToggleBar isExpanded={false} onToggle={() => {}} />);

    expect(await screen.findByText("View entries")).toBeInTheDocument();

    first.unmount();

    render(<ExpandToggleBar isExpanded={false} onToggle={() => {}} />);

    expect(screen.queryByText("View entries")).toBeNull();
  });

  it("never shows the hint on an expanded bar", async () => {
    const ExpandToggleBar = await freshExpandToggleBar();

    render(<ExpandToggleBar isExpanded={true} onToggle={() => {}} />);

    expect(screen.queryByText("View entries")).toBeNull();
  });

  it("keeps the hint unconsumed while only expanded bars have mounted", async () => {
    const ExpandToggleBar = await freshExpandToggleBar();

    render(<ExpandToggleBar isExpanded={true} onToggle={() => {}} />);

    render(<ExpandToggleBar isExpanded={false} onToggle={() => {}} />);

    expect(await screen.findByText("View entries")).toBeInTheDocument();
  });
});
