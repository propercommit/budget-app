"use client";

import { useEffect, useRef, useState } from "react";
import { SpendingEntry } from "../spending-card-expanded";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { iconMap } from "@/lib/icon-map";

interface EntryEditPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; amount: number; date: string; receipt: string | null; link: string | null }) => void;
    onDelete?: () => void;
    mode: "create" | "edit";
    entry?: SpendingEntry | null;
    spendingName: string;
    spendingItemIcon: string;
    spendingCategoryName: string;
    spendingCategoryColor: string;
}

export function EntryEditPopin({
    isOpen,
    onClose,
    onSave,
    onDelete,
    mode,
    entry = null,
    spendingName,
    spendingItemIcon,
    spendingCategoryName,
    spendingCategoryColor,
}: EntryEditPopinProps) {
    const [name, setName] = useState(entry?.name || "");
    const [amount, setAmount] = useState(entry?.amount?.toString() || "");
    const [date, setDate] = useState(entry?.date || new Date().toISOString().split("T")[0]);
    const [receipt, setReceipt] = useState<string | null>(entry?.receipt || null);
    const [link, setLink] = useState(entry?.link || "");
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { settings } = useSettings();
    const popinRef = useRef<HTMLDivElement>(null);

    useLockScroll(isOpen);

    const isCreate = mode === "create";
    const isFormValid = name.trim() !== "" && amount !== "" && parseFloat(amount) > 0 && date !== "";

    const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("File size must be less than 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => setReceipt(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    useEffect(() => {
        if (isOpen) {
            popinRef.current?.focus();
        }
    }, [isOpen]);


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
                ref={popinRef}
                tabIndex={-1}
                className="relative w-full sm:max-w-md lg:max-w-lg xl:max-w-xl bg-white rounded-3xl overflow-hidden outline-none mx-3 sm:mx-0 mb-3 sm:mb-0"
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
                            {isCreate ? "Add Entry" : "Edit Entry"}
                        </h2>
                        <p className="text-sm" style={{ color: "#6E6E73" }}>
                            {isCreate ? "Add a new spending entry" : "Update entry details"}
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

                {/* Spending Item Badge */}
                <div className="px-5 pt-4">
                    <div
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl"
                        style={{ backgroundColor: `${spendingCategoryColor}15` }}
                    >
                        <span className="text-lg">{iconMap[spendingItemIcon] || spendingItemIcon}</span>
                        <span className="text-sm font-medium" style={{ color: "#1D1D1F" }}>
                            {spendingName}
                        </span>
                        <span
                            className="text-xs px-2 py-0.5 rounded-md text-white"
                            style={{ backgroundColor: spendingCategoryColor }}
                        >
                            {spendingCategoryName}
                        </span>
                    </div>
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
                            placeholder="e.g., Shell Station, Grocery run"
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

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Amount
                        </label>
                        <div className="relative">
                            <span
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold"
                                style={{ color: "#6E6E73" }}
                            >
                                {CURRENCY_SYMBOLS[settings.currency]}
                            </span>
                            <input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
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
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                            style={{
                                backgroundColor: "#F5F5F7",
                                border: "1px solid #E5E5EA",
                                color: "#1D1D1F",
                                WebkitAppearance: "none",
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

                    {/* Receipt */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Receipt{" "}
                            <span style={{ color: "#6E6E73", fontWeight: 400 }}>(optional)</span>
                        </label>

                        {receipt ? (
                            <div
                                className="relative rounded-xl overflow-hidden"
                                style={{ backgroundColor: "#F5F5F7" }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={receipt}
                                    alt="Receipt preview"
                                    className="w-full h-40 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                    <button
                                        onClick={() => setReceipt(null)}
                                        className="px-4 py-2 rounded-xl bg-white/90 text-sm font-medium"
                                        style={{ color: "#FF3B30" }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label
                                className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 hover:bg-gray-50"
                                style={{ borderColor: "#E5E5EA" }}
                            >
                                <div
                                    className="w-11 h-11 rounded-full flex items-center justify-center"
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
                                            strokeWidth={1.5}
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                                        />
                                    </svg>
                                </div>
                                <span className="text-sm" style={{ color: "#6E6E73" }}>
                                    Upload receipt (max 2MB)
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleReceiptUpload}
                                />
                            </label>
                        )}
                    </div>

                    {/* Link */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                            Link{" "}
                            <span style={{ color: "#6E6E73", fontWeight: 400 }}>(optional)</span>
                        </label>
                        <input
                            type="url"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="https://example.com"
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
                                    amount: parseFloat(amount),
                                    date,
                                    receipt,
                                    link: link || null,
                                })
                            }
                            disabled={!isFormValid}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{
                                backgroundColor: isFormValid ? "#34C759" : "#E5E5EA",
                                color: isFormValid ? "white" : "#6E6E73",
                                cursor: isFormValid ? "pointer" : "not-allowed",
                                boxShadow: isFormValid ? "0 4px 12px rgba(52, 199, 89, 0.3)" : "none",
                            }}
                        >
                            {isCreate ? "Add Entry" : "Save Changes"}
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
                                    Delete Entry
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
                                        Are you sure? This cannot be undone.
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