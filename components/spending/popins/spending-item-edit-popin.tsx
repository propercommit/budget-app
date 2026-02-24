"use client";

import { useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";

interface Category {
    name: string;
    icon: string;
    color: string;
}

interface SpendingItemEditPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        name: string;
        icon: string;
        category: string;
        categoryColor: string;
        budget: number;
        startDate: string;
        endDate: string;
        note: string;
    }) => void;
    onDelete?: () => void;
    onCreateCategory?: () => void;
    mode: "create" | "edit";
    categories: Category[];
    initialName?: string;
    initialIcon?: string;
    initialCategory?: string;
    initialBudget?: number;
    initialStartDate?: string;
    initialEndDate?: string;
    initialNote?: string;
    autoSelectCategory?: string | null;
}

export function SpendingItemEditPopin({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onCreateCategory,
    mode,
    categories,
    initialName = "",
    initialIcon = "shopping-cart",
    initialCategory = "",
    initialBudget,
    initialStartDate = "",
    initialEndDate = "",
    initialNote = "",
    autoSelectCategory = null,
}: SpendingItemEditPopinProps) {
    const [name, setName] = useState(initialName);
    const [selectedIcon, setSelectedIcon] = useState(initialIcon);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [budget, setBudget] = useState(initialBudget?.toString() ?? "");
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [note, setNote] = useState(initialNote);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [lastAutoSelected, setLastAutoSelected] = useState<string | null>(null);
    const { settings } = useSettings();

    if (autoSelectCategory && autoSelectCategory !== lastAutoSelected) {
        setSelectedCategory(autoSelectCategory);
        setLastAutoSelected(autoSelectCategory);
    }

    useLockScroll(isOpen);

    const isCreate = mode === "create";
    const isFormValid =
        name.trim() !== "" &&
        budget !== "" &&
        parseFloat(budget) > 0 &&
        selectedCategory !== "" &&
        startDate !== "";

    const selectedCategoryColor =
        categories.find((c) => c.name === selectedCategory)?.color ?? "#007AFF";

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Display','SF_Pro_Text',system-ui,sans-serif]"
            role="dialog"
            aria-modal="true"
            aria-label={isCreate ? "New Spending Item" : "Edit Spending Item"}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Popin */}
            <div className="relative w-full sm:max-w-md bg-white rounded-3xl overflow-hidden mx-3 sm:mx-0 mb-3 sm:mb-0 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col">
                {/* Mobile Handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-[#E5E5EA]" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
                    <div>
                        <h2 className="text-lg font-semibold text-[#1D1D1F]">
                            {isCreate ? "New Spending Item" : "Edit Spending Item"}
                        </h2>
                        <p className="text-sm text-[#6E6E73]">
                            {isCreate ? "Create a new budget item" : "Update budget and details"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 bg-[#F5F5F7]"
                        aria-label="Close dialog"
                    >
                        <svg
                            className="w-5 h-5 text-[#6E6E73]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    {/* Name */}
                    <div className="space-y-2">
                        <label htmlFor="spending-name" className="block text-sm font-semibold text-[#1D1D1F]">
                            Name
                        </label>
                        <input
                            id="spending-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Fuel, Netflix, Groceries"
                            aria-required="true"
                            className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200 bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/10"
                        />
                    </div>

                    {/* Icon Picker */}
                    <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                    {/* Category */}
                    <fieldset className="space-y-2">
                        <legend className="block text-sm font-semibold text-[#1D1D1F]">
                            Category
                        </legend>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Select a category">
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    role="radio"
                                    aria-checked={selectedCategory === cat.name}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
                                    style={{
                                        backgroundColor:
                                            selectedCategory === cat.name ? cat.color : "#F5F5F7",
                                        color: selectedCategory === cat.name ? "white" : "#6E6E73",
                                    }}
                                >
                                    <span className="text-sm [&>svg]:w-4 [&>svg]:h-4" aria-hidden="true">
                                        {iconMap[cat.icon] || cat.icon}
                                    </span>
                                    <span>{cat.name}</span>
                                </button>
                            ))}
                            <button
                                onClick={onCreateCategory}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 border-2 border-dashed border-[#007AFF] bg-[#007AFF]/5 text-[#007AFF]"
                                aria-label="Create new category"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                <span>New Category</span>
                            </button>
                        </div>
                    </fieldset>

                    {/* Budget */}
                    <div className="space-y-2">
                        <label htmlFor="spending-budget" className="block text-sm font-semibold text-[#1D1D1F]">
                            Monthly Budget
                        </label>
                        <div className="relative">
                            <span
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-[#6E6E73]"
                                aria-hidden="true"
                            >
                                {CURRENCY_SYMBOLS[settings.currency]}
                            </span>
                            <input
                                id="spending-budget"
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="0"
                                aria-required="true"
                                aria-label="Monthly budget amount in dollars"
                                className="w-full pl-9 pr-4 py-3.5 rounded-xl text-lg font-semibold outline-none transition-all duration-200 bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/10"
                            />
                        </div>
                        <p className="text-xs text-[#6E6E73]">
                            Set how much you want to spend per month
                        </p>
                    </div>

                    {/* Date Range */}
                    <fieldset className="space-y-2 max-w-full overflow-hidden">
                        <legend className="block text-sm font-semibold text-[#1D1D1F]">
                            Date Range
                        </legend>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-full sm:flex-1 min-w-0">
                                <input
                                    id="spending-start-date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    aria-required="true"
                                    aria-label="Start date"
                                    className={`w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200 bg-[#F5F5F7] border border-[#E5E5EA] [appearance:none] [-webkit-appearance:none] min-w-0 focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/10 ${
                                        startDate ? "text-[#1D1D1F]" : "text-[#6E6E73]"
                                    }`}
                                />
                                <p className="text-xs mt-1 ml-1 text-[#6E6E73]">
                                    Start
                                </p>
                            </div>
                            <svg
                                className="hidden sm:block w-5 h-5 flex-shrink-0 text-[#6E6E73]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                            </svg>
                            <div className="w-full sm:flex-1 min-w-0">
                                <input
                                    id="spending-end-date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    aria-label="End date (optional)"
                                    className={`w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200 bg-[#F5F5F7] border border-[#E5E5EA] [appearance:none] [-webkit-appearance:none] min-w-0 focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/10 ${
                                        endDate ? "text-[#1D1D1F]" : "text-[#6E6E73]"
                                    }`}
                                />
                                <p className="text-xs mt-1 ml-1 text-[#6E6E73]">
                                    End <span className="text-[#AEAEB2]">(optional)</span>
                                </p>
                            </div>
                        </div>
                    </fieldset>

                    {/* Note */}
                    <div className="space-y-2">
                        <label htmlFor="spending-note" className="block text-sm font-semibold text-[#1D1D1F]">
                            Note{" "}
                            <span className="text-[#6E6E73] font-normal">(optional)</span>
                        </label>
                        <textarea
                            id="spending-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add any details..."
                            rows={3}
                            aria-label="Additional notes (optional)"
                            className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 resize-none bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/10"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 space-y-3 border-t border-[#E5E5EA]">
                    {/* Primary Action Buttons */}
                    <div
                        className={`flex gap-3 transition-opacity duration-200 ${showDeleteConfirm ? "opacity-40 pointer-events-none" : ""}`}
                    >
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] bg-[#F5F5F7] text-[#1D1D1F]"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() =>
                                onSave({
                                    name,
                                    icon: selectedIcon,
                                    category: selectedCategory,
                                    categoryColor: selectedCategoryColor,
                                    budget: parseFloat(budget),
                                    startDate,
                                    endDate,
                                    note,
                                })
                            }
                            disabled={!isFormValid}
                            aria-disabled={!isFormValid}
                            className={`flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] ${
                                isFormValid
                                    ? "bg-[#007AFF] text-white shadow-[0_4px_12px_rgba(0,122,255,0.3)] cursor-pointer"
                                    : "bg-[#E5E5EA] text-[#6E6E73] cursor-not-allowed"
                            }`}
                        >
                            {isCreate ? "Create" : "Save Changes"}
                        </button>
                    </div>

                    {/* Delete Section — edit mode only */}
                    {!isCreate && onDelete && (
                        <div className="pt-2">
                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] hover:bg-red-50 flex items-center justify-center gap-2 border border-[#FF3B30] text-[#FF3B30]"
                                    aria-label="Delete this spending item"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        aria-hidden="true"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                    Delete Spending Item
                                </button>
                            ) : (
                                <div
                                    className="p-4 rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10"
                                    role="alert"
                                >
                                    <p className="text-sm font-medium text-center mb-3 text-[#1D1D1F]">
                                        Are you sure? This will delete all entries. This cannot be undone.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] bg-[#F5F5F7] text-[#1D1D1F]"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                onDelete?.();
                                            }}
                                            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98] bg-[#FF3B30]"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}