"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSettings, updateSettings } from "@/lib/api";
import { formatAmount as formatAmountUtil } from "@/lib/utils";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Currency, DateFormat, CURRENCY_SYMBOLS, DATE_FORMAT_TOKENS, DATE_FORMAT_SHORT_TOKENS, DATE_FORMAT_FULL_TOKENS } from "@/lib/constants";
// Types
interface Settings {
  currency: Currency;
  dateFormat: DateFormat;
  darkMode: boolean;
}

interface SettingsContextValue {
  settings: Settings;
  isLoading: boolean;
  updateCurrency: (currency: Currency) => Promise<void>;
  updateDateFormat: (dateFormat: DateFormat) => Promise<void>;
  updateDarkMode: (darkMode: boolean) => Promise<void>;
  formatAmount: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  formatDateShort: (date: string | Date) => string;
  formatDateFull: (date: string | Date) => string;
}

// Defaults
const DEFAULT_SETTINGS: Settings = {
  currency: "USD",
  dateFormat: "MM/DD/YYYY",
  darkMode: false,
};

// Context
const SettingsContext = createContext<SettingsContextValue | null>(null);

// Provider
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSettings();
        setSettings({
          currency: data.currency,
          dateFormat: data.dateFormat,
          darkMode: data.darkMode,
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Update helpers — optimistic with rollback
  const updateCurrency = useCallback(async (currency: Currency) => {
    const previous = settings.currency;
    setSettings(prev => ({ ...prev, currency }));
    try {
      await updateSettings({ currency });
    } catch {
      toast.error("Failed to update currency");
      setSettings(prev => ({ ...prev, currency: previous }));
    }
  }, [settings.currency]);

  const updateDateFormat = useCallback(async (dateFormat: DateFormat) => {
    const previous = settings.dateFormat;
    setSettings(prev => ({ ...prev, dateFormat }));
    try {
      await updateSettings({ dateFormat });
    } catch {
      toast.error("Failed to update date format");
      setSettings(prev => ({ ...prev, dateFormat: previous }));
    }
  }, [settings.dateFormat]);

  const updateDarkMode = useCallback(async (darkMode: boolean) => {
    const previous = settings.darkMode;
    setSettings(prev => ({ ...prev, darkMode }));
    try {
      await updateSettings({ darkMode });
    } catch {
      toast.error("Failed to update dark mode");
      setSettings(prev => ({ ...prev, darkMode: previous }));
    }
  }, [settings.darkMode]);

  // Format amount using the user's currency
  const formatAmount = useCallback((amount: number): string => {
    return formatAmountUtil(amount, CURRENCY_SYMBOLS[settings.currency]);
  }, [settings.currency]);

  // Format date using the user's date format (full: "Jan 5, 2026")
  const formatDate = useCallback((date: string | Date): string => {
    return format(new Date(date), DATE_FORMAT_TOKENS[settings.dateFormat]);
  }, [settings.dateFormat]);

  // Format date short (no year: "Jan 05")
  const formatDateShort = useCallback((date: string | Date): string => {
    return format(new Date(date), DATE_FORMAT_SHORT_TOKENS[settings.dateFormat]);
  }, [settings.dateFormat]);

  const formatDateFull = useCallback((date: string | Date): string => {
    return format(new Date(date), DATE_FORMAT_FULL_TOKENS[settings.dateFormat]);
  }, [settings.dateFormat]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        updateCurrency,
        updateDateFormat,
        updateDarkMode,
        formatAmount,
        formatDate,
        formatDateShort,
        formatDateFull,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// Hook
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}