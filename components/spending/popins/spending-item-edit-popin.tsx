"use client";

import { useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
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
    const [lastAutoSelected, setLastAutoSelected] = useState<string | null>(null);
    const { settings } = useSettings();

    if (autoSelectCategory && autoSelectCategory !== lastAutoSelected) {
        setSelectedCategory(autoSelectCategory);
        setLastAutoSelected(autoSelectCategory);
    }

    const isCreate = mode === "create";
    const isFormValid =
        name.trim() !== "" &&
        budget !== "" &&
        parseFloat(budget) > 0 &&
        selectedCategory !== "" &&
        startDate !== "";

    const selectedCategoryColor =
        categories.find((c) => c.name === selectedCategory)?.color ?? "#007AFF";

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={isCreate ? "New Spending Item" : "Edit Spending Item"}
            subtitle={isCreate ? "Create a new budget item" : "Update budget and details"}
            footer={
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
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
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={isFormValid
                                ? { backgroundColor: "#007AFF", color: "white", boxShadow: "0 4px 12px rgba(0, 122, 255, 0.3)" }
                                : { backgroundColor: "#E5E5EA", color: "#8E8E93", cursor: "not-allowed" }
                            }
                        >
                            {isCreate ? "Create" : "Save Changes"}
                        </button>
                    </div>
                    {!isCreate && onDelete && (
                        <DeleteConfirmSection
                            label="Delete Spending Item"
                            confirmMessage="Are you sure? This will delete all entries. This cannot be undone."
                            onDelete={onDelete}
                        />
                    )}
                </div>
            }
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="spending-name" className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Name
                    </label>
                    <input
                        id="spending-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Fuel, Netflix, Groceries"
                        aria-required="true"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>

                <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                <fieldset className="space-y-2">
                    <legend className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
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
                                    backgroundColor: selectedCategory === cat.name ? cat.color : "#F5F5F7",
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
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 border-2 border-dashed"
                            style={{ borderColor: "#007AFF", backgroundColor: "rgba(0, 122, 255, 0.05)", color: "#007AFF" }}
                            aria-label="Create new category"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New Category</span>
                        </button>
                    </div>
                </fieldset>

                <div className="space-y-2">
                    <label htmlFor="spending-budget" className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Monthly Budget
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold" style={{ color: "#8E8E93" }} aria-hidden="true">
                            {CURRENCY_SYMBOLS[settings.currency]}
                        </span>
                        <input
                            id="spending-budget"
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder="0"
                            aria-required="true"
                            aria-label="Monthly budget amount"
                            className="w-full pl-9 pr-4 py-3.5 rounded-xl text-lg font-semibold outline-none transition-all duration-200"
                            style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                    </div>
                    <p className="text-xs truncate max-w-[160px]" style={{ color: "#6E6E73" }}>Set how much you want to spend per month</p>
                </div>

                <fieldset className="space-y-2 max-w-full overflow-hidden">
                    <legend className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
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
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: startDate ? "#1D1D1F" : "#6E6E73", WebkitAppearance: "none", minWidth: 0 }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                            <p className="text-xs mt-1 ml-1" style={{ color: "#6E6E73" }}>Start</p>
                        </div>
                        <svg className="hidden sm:block w-5 h-5 flex-shrink-0" style={{ color: "#C7C7CC" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <div className="w-full sm:flex-1 min-w-0">
                            <input
                                id="spending-end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                aria-label="End date (optional)"
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: endDate ? "#1D1D1F" : "#6E6E73", WebkitAppearance: "none", minWidth: 0 }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                            <p className="text-xs mt-1 ml-1" style={{ color: "#6E6E73" }}>End <span style={{ color: "#AEAEB2" }}>(optional)</span></p>
                        </div>
                    </div>
                </fieldset>

                <div className="space-y-2">
                    <label htmlFor="spending-note" className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Note <span className="font-normal" style={{ color: "#6E6E73" }}>(optional)</span>
                    </label>
                    <textarea
                        id="spending-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any details..."
                        rows={3}
                        aria-label="Additional notes (optional)"
                        className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 resize-none"
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>
            </div>
        </PopinWrapper>
    );
}