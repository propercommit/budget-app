// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/lib/api", async (importOriginal) => ({
  // Keep the real module (ApiError) — only the fetchers are stubbed.
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { SettingsProvider, useSettings } from "@/lib/settings-context";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import toast from "react-hot-toast";

const settings = (over: Partial<{ currency: string; dateFormat: string; darkMode: boolean }> = {}) => ({
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  darkMode: false,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();

  // Each test asserts against the real <html> class list, so start clean.
  document.documentElement.classList.remove("dark");

  vi.mocked(api.updateSettings).mockResolvedValue(settings());
});

describe("SettingsProvider — mirrors darkMode onto the <html> dark class", () => {
  it("applies the dark class once settings load with darkMode enabled", async () => {
    vi.mocked(api.getSettings).mockResolvedValue(settings({ darkMode: true }));

    renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
  });

  it("removes a stale dark class when settings load with darkMode disabled", async () => {
    document.documentElement.classList.add("dark");

    vi.mocked(api.getSettings).mockResolvedValue(settings());

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggles the class optimistically when updateDarkMode succeeds", async () => {
    vi.mocked(api.getSettings).mockResolvedValue(settings());

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.updateDarkMode(true); });

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    await act(async () => { await result.current.updateDarkMode(false); });

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("rolls the class back when persisting darkMode fails", async () => {
    vi.mocked(api.getSettings).mockResolvedValue(settings());
    vi.mocked(api.updateSettings).mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.updateDarkMode(true); });

    expect(toast.error).toHaveBeenCalledWith("Failed to update dark mode");

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("SettingsProvider — initial load failures", () => {
  let consoleError: MockInstance;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("keeps the defaults silently when the fetch 401s (unauthenticated visitor)", async () => {
    vi.mocked(api.getSettings).mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.settings).toEqual(settings());

    expect(consoleError).not.toHaveBeenCalledWith("Failed to load settings:", expect.anything());
  });

  it("still logs non-401 load failures", async () => {
    vi.mocked(api.getSettings).mockRejectedValue(new ApiError("API request failed", 500));

    const { result } = renderHook(() => useSettings(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(consoleError).toHaveBeenCalledWith("Failed to load settings:", expect.any(ApiError));
  });
});
