"use client";

import { useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";

// ============================================
// SPENDING ITEM EDIT POPIN (Create/Edit Mode)
// ============================================

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
}: SpendingItemEditPopinProps) {
    const [name, setName] = useState(initialName);
    const [selectedIcon, setSelectedIcon] = useState(initialIcon);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [budget, setBudget] = useState(initialBudget?.toString() ?? "");
    const [startDate, setStartDate] = useState(initialStartDate);
    const [endDate, setEndDate] = useState(initialEndDate);
    const [note, setNote] = useState(initialNote);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useLockScroll(isOpen);

    const isCreate = mode === "create";
    const isFormValid =
        name.trim() !== "" &&
        budget !== "" &&
        parseFloat(budget) > 0 &&
        selectedCategory !== "";

    const selectedCategoryColor =
        categories.find((c) => c.name === selectedCategory)?.color ?? "#007AFF";

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
                onClick={onClose}
            />

            {/* Popin */}
            <div
                className="relative w-full sm:max-w-md bg-white rounded-3xl overflow-hidden mx-3 sm:mx-0 mb-3 sm:mb-0"
                style={{
                    boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.15)",
                    maxHeight: "90vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Mobile Handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full" style={{ backgroundColor: "#E5E5EA" }} />
                </div>

                {/* Header */}
                <div
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: "1px solid #E5E5EA" }}
                >
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>
                            {isCreate ? "New Spending Item" : "Edit Spending Item"}
                        </h2>
                        <p className="text-sm" style={{ color: "#6E6E73" }}>
                            {isCreate ? "Create a new budget item" : "Update budget and details"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                        style={{ backgroundColor: "#F5F5F7" }}
                    >
                        <svg
                            className="w-5 h-5"
                            style={{ color: "#6E6E73" }}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
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
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Fuel, Netflix, Groceries"
                            className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                            style={{
                                backgroundColor: "#F5F5F7",
                                border: "1px solid #E5E5EA",
                                color: "#1D1D1F",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#007AFF";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)";
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#E5E5EA";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        />
                    </div>

                    {/* Icon Picker */}
                    <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.name}
                                    onClick={() => setSelectedCategory(cat.name)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95"
                                    style={{
                                        backgroundColor:
                                            selectedCategory === cat.name ? cat.color : "#F5F5F7",
                                        color: selectedCategory === cat.name ? "white" : "#6E6E73",
                                    }}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </button>
                            ))}
                            <button
                                onClick={onCreateCategory}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 border-2 border-dashed"
                                style={{
                                    borderColor: "#007AFF",
                                    backgroundColor: "rgba(0, 122, 255, 0.05)",
                                    color: "#007AFF",
                                }}
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
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
                    </div>

                    {/* Budget */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Monthly Budget
                        </label>
                        <div className="relative">
                            <span
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold"
                                style={{ color: "#6E6E73" }}
                            >
                                $
                            </span>
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="0"
                                className="w-full pl-9 pr-4 py-3.5 rounded-xl text-lg font-semibold outline-none transition-all duration-200"
                                style={{
                                    backgroundColor: "#F5F5F7",
                                    border: "1px solid #E5E5EA",
                                    color: "#1D1D1F",
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = "#007AFF";
                                    e.currentTarget.style.boxShadow =
                                        "0 0 0 3px rgba(0, 122, 255, 0.1)";
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = "#E5E5EA";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            />
                        </div>
                        <p className="text-xs" style={{ color: "#6E6E73" }}>
                            Set how much you want to spend per month
                        </p>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2 max-w-full overflow-hidden">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Date Range
                        </label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="w-full sm:flex-1 min-w-0">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                    style={{
                                        backgroundColor: "#F5F5F7",
                                        border: "1px solid #E5E5EA",
                                        color: startDate ? "#1D1D1F" : "#6E6E73",
                                        WebkitAppearance: "none",
                                        minWidth: 0,
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#007AFF";
                                        e.currentTarget.style.boxShadow =
                                            "0 0 0 3px rgba(0, 122, 255, 0.1)";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "#E5E5EA";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                />
                                <p className="text-xs mt-1 ml-1" style={{ color: "#6E6E73" }}>
                                    Start
                                </p>
                            </div>
                            <svg
                                className="hidden sm:block w-5 h-5 flex-shrink-0"
                                style={{ color: "#6E6E73" }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
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
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                    style={{
                                        backgroundColor: "#F5F5F7",
                                        border: "1px solid #E5E5EA",
                                        color: endDate ? "#1D1D1F" : "#6E6E73",
                                        WebkitAppearance: "none",
                                        minWidth: 0,
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = "#007AFF";
                                        e.currentTarget.style.boxShadow =
                                            "0 0 0 3px rgba(0, 122, 255, 0.1)";
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = "#E5E5EA";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                />
                                <p className="text-xs mt-1 ml-1" style={{ color: "#6E6E73" }}>
                                    End <span style={{ color: "#AEAEB2" }}>(optional)</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Note{" "}
                            <span style={{ color: "#6E6E73", fontWeight: 400 }}>(optional)</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add any details..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 resize-none"
                            style={{
                                backgroundColor: "#F5F5F7",
                                border: "1px solid #E5E5EA",
                                color: "#1D1D1F",
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.borderColor = "#007AFF";
                                e.currentTarget.style.boxShadow =
                                    "0 0 0 3px rgba(0, 122, 255, 0.1)";
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#E5E5EA";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-5 py-4 space-y-3"
                    style={{ borderTop: "1px solid #E5E5EA" }}
                >
                    {/* Primary Action Buttons */}
                    <div
                        className={`flex gap-3 transition-opacity duration-200 ${showDeleteConfirm ? "opacity-40 pointer-events-none" : ""}`}
                    >
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
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{
                                backgroundColor: isFormValid ? "#007AFF" : "#E5E5EA",
                                color: isFormValid ? "white" : "#6E6E73",
                                cursor: isFormValid ? "pointer" : "not-allowed",
                                boxShadow: isFormValid ? "0 4px 12px rgba(0, 122, 255, 0.3)" : "none",
                            }}
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
                                    className="w-full py-3 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] hover:bg-red-50 flex items-center justify-center gap-2"
                                    style={{
                                        border: "1px solid #FF3B30",
                                        color: "#FF3B30",
                                    }}
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
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
                                    className="p-4 rounded-xl"
                                    style={{
                                        backgroundColor: "rgba(255, 59, 48, 0.05)",
                                        border: "1px solid rgba(255, 59, 48, 0.1)",
                                    }}
                                >
                                    <p
                                        className="text-sm font-medium text-center mb-3"
                                        style={{ color: "#1D1D1F" }}
                                    >
                                        Are you sure? This will delete all entries. This cannot be undone.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                                            style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowDeleteConfirm(false);
                                                onDelete?.();
                                            }}
                                            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 active:scale-[0.98]"
                                            style={{ backgroundColor: "#FF3B30" }}
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