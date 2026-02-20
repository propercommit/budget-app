"use client";

import { useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { ColorPicker } from "@/components/color-picker";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";
import { iconMap } from "@/lib/icon-map";

interface CategoryPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; icon: string; color: string }) => void;
    onDelete?: () => void;
    mode: "create" | "edit";
    initialName?: string;
    initialIcon?: string;
    initialColor?: string;
}

export function CategoryPopin({
    isOpen,
    onClose,
    onSave,
    onDelete,
    mode,
    initialName = "",
    initialIcon = "shopping-cart",
    initialColor = "#007AFF",
}: CategoryPopinProps) {
    const [name, setName] = useState(initialName);
    const [selectedIcon, setSelectedIcon] = useState(initialIcon);
    const [selectedColor, setSelectedColor] = useState(initialColor);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    useLockScroll(isOpen);

    const isCreate = mode === "create";
    const isNameValid = name.trim() !== "";
    const isFormValid = isNameValid;

    const getInputStyle = (isValid: boolean) => ({
        backgroundColor: "#F5F5F7",
        border: `1px solid ${showErrors && !isValid ? "#FF3B30" : "#E5E5EA"}`,
        color: "#1D1D1F",
    });

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = "#007AFF";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)";
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>, isValid: boolean) => {
        e.currentTarget.style.borderColor = showErrors && !isValid ? "#FF3B30" : "#E5E5EA";
        e.currentTarget.style.boxShadow = "none";
    };

    const handleSave = () => {
        if (!isFormValid) {
            setShowErrors(true);
            return;
        }
        onSave({ name, icon: selectedIcon, color: selectedColor });
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
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
                className="relative w-full sm:max-w-sm bg-white rounded-3xl overflow-hidden mx-3 sm:mx-0 mb-3 sm:mb-0"
                style={{
                    boxShadow: "0 -8px 40px rgba(0, 0, 0, 0.2)",
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
                    <h2 className="text-lg font-semibold" style={{ color: "#1D1D1F" }}>
                        {isCreate ? "New Category" : "Edit Category"}
                    </h2>
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
                <div className="flex-1 overflow-y-auto">
                    {/* Preview Badge */}
                    <div
                        className="flex justify-center py-4"
                        style={{ backgroundColor: "#FAFAFA" }}
                    >
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold"
                            style={{ backgroundColor: selectedColor }}
                        >
                            <span className="text-lg">{iconMap[selectedIcon]}</span>
                            <span>{name || "Category"}</span>
                        </div>
                    </div>

                    <div className="px-5 py-5 space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                                Category Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Transport, Food"
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={getInputStyle(isNameValid)}
                                onFocus={handleFocus}
                                onBlur={(e) => handleBlur(e, isNameValid)}
                                autoFocus
                            />
                            {showErrors && !isNameValid && (
                                <p className="text-xs mt-1" style={{ color: "#FF3B30" }}>Category name is required</p>
                            )}
                        </div>

                        {/* Color Picker */}
                        <ColorPicker value={selectedColor} onChange={setSelectedColor} />

                        {/* Icon Picker */}
                        <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="px-5 py-4 space-y-3"
                    style={{ borderTop: "1px solid #E5E5EA" }}
                >
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
                            onClick={handleSave}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{
                                backgroundColor: "#34C759",
                                color: "white",
                                boxShadow: "0 4px 12px rgba(52, 199, 89, 0.3)",
                            }}
                        >
                            {isCreate ? "Create Category" : "Save Changes"}
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
                                    Delete Category
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
                                        Are you sure? This will delete all spending items in this category. This cannot be undone.
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