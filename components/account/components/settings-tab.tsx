"use client";

import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS } from "@/lib/constants";
import { Currency, DateFormat } from "@/lib/constants";

export function SettingsTab() {
    const { settings, isLoading, updateCurrency, updateDateFormat, updateDarkMode } = useSettings();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 sm:px-4">
            {/* Preferences Card */}
            <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Preferences
                    </h2>

                    <div className="space-y-1">
                        {/* Currency */}
                        <div className="flex items-center justify-between py-4 border-b border-gray-100">
                            <div className="pr-4">
                                <h4 className="font-medium text-gray-900">Currency</h4>
                                <p className="text-sm text-gray-500">Your preferred currency</p>
                            </div>
                            <select
                                value={settings.currency}
                                onChange={(e) => updateCurrency(e.target.value as Currency)}
                                className="h-12 sm:h-10 px-4 border border-gray-300 rounded-xl text-base sm:text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none touch-manipulation"
                            >
                                {CURRENCY_OPTIONS.map((option) => (
                                    <option key={option.code} value={option.code}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Format */}
                        <div className="flex items-center justify-between py-4 border-b border-gray-100">
                            <div className="pr-4">
                                <h4 className="font-medium text-gray-900">Date Format</h4>
                                <p className="text-sm text-gray-500">How dates are displayed</p>
                            </div>
                            <select
                                value={settings.dateFormat}
                                onChange={(e) => updateDateFormat(e.target.value as DateFormat)}
                                className="h-12 sm:h-10 px-4 border border-gray-300 rounded-xl text-base sm:text-sm bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none touch-manipulation"
                            >
                                {DATE_FORMAT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Dark Mode */}
                        <div className="flex items-center justify-between py-4">
                            <div>
                                <h4 className="font-medium text-gray-900">Dark Mode</h4>
                                <p className="text-sm text-gray-500">Use dark theme</p>
                            </div>
                            <button
                                onClick={() => updateDarkMode(!settings.darkMode)}
                                className={`relative w-14 h-8 sm:w-12 sm:h-7 rounded-full transition-colors touch-manipulation ${
                                    settings.darkMode ? "bg-green-500" : "bg-gray-200"
                                }`}
                                aria-label="Toggle dark mode"
                            >
                                <span
                                    className={`absolute left-1 top-1 w-6 h-6 sm:w-5 sm:h-5 bg-white rounded-full shadow transition-transform ${
                                        settings.darkMode ? "translate-x-6 sm:translate-x-5" : ""
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Export Card */}
            <div className="bg-white border-y sm:border sm:rounded-2xl border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Data</h2>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-gray-900">Export Your Data</h4>
                            <p className="text-sm text-gray-500">
                                Download all your budget data as CSV
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="h-12 sm:h-10 text-green-600 border-green-300 hover:bg-green-50 active:bg-green-100 rounded-xl touch-manipulation"
                        >
                            Export Data
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}