"use client";

import { useState } from "react";
import { SpendingEntry } from "../spending-card-expanded";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { iconMap } from "@/lib/icon-map";
import toast from "react-hot-toast";
import { compressImage } from "@/lib/compress-image";
import { parseAmountToCents, centsToAmount } from "@/lib/money";

interface EntryEditPopinProps {
    isOpen: boolean;
    onClose: () => void;
    // `direction` is always sent explicitly (both modes); the API's default-to-debit is backward compat only.
    onSave: (data: { name: string; amount: number; direction: "debit" | "credit"; date: string; receipt: string | null; link: string | null }) => void;
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
    const [amount, setAmount] = useState(entry?.amount === undefined ? "" : centsToAmount(entry.amount).toString());
    const [direction, setDirection] = useState<"debit" | "credit">(entry?.direction ?? "debit");
    const [date, setDate] = useState(entry?.date || new Date().toISOString().split("T")[0]);
    const [receipt, setReceipt] = useState<string | null>(entry?.receipt || null);
    const [link, setLink] = useState(entry?.link || "");
    const { settings } = useSettings();

    const isCreate = mode === "create";
    const parsedAmount = parseAmountToCents(amount);
    const isFormValid = name.trim() !== "" && parsedAmount !== null && date !== "";

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) setAmount(val);
    };

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const compressed = await compressImage(file);
                const reader = new FileReader();
                reader.onload = (event) => setReceipt(event.target?.result as string);
                reader.readAsDataURL(compressed);
            } catch {
                toast.error("Failed to process image, please try again");
            }
        }
    };

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={isCreate ? "Add Entry" : "Edit Entry"}
            subtitle={isCreate ? "Add a new spending entry" : "Update entry details"}
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
                            onClick={() => {
                                if (parsedAmount === null) return;

                                onSave({
                                    name,
                                    amount: parsedAmount,
                                    direction,
                                    date,
                                    receipt,
                                    link: link || null,
                                });
                            }}
                            disabled={!isFormValid}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{
                                backgroundColor: isFormValid ? "#34C759" : "#E5E5EA",
                                color: isFormValid ? "white" : "#8E8E93",
                                cursor: isFormValid ? "pointer" : "not-allowed",
                                boxShadow: isFormValid ? "0 4px 12px rgba(52, 199, 89, 0.3)" : "none",
                            }}
                        >
                            {isCreate ? "Add Entry" : "Save Changes"}
                        </button>
                    </div>
                    {!isCreate && onDelete && (
                        <DeleteConfirmSection
                            label="Delete Entry"
                            confirmMessage="Are you sure? This cannot be undone."
                            onDelete={onDelete}
                        />
                    )}
                </div>
            }
        >
            <div className="space-y-5">
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
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Amount
                    </label>
                    <div className="relative">
                        <span
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold"
                            style={{ color: direction === "debit" ? "#FF3B30" : "#34C759" }}
                        >
                            {direction === "debit" ? "−" : "+"}
                            {CURRENCY_SYMBOLS[settings.currency]}
                        </span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                            className="w-full pl-9 pr-4 py-3.5 rounded-xl text-lg font-semibold outline-none transition-all duration-200"
                            style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Type
                    </label>
                    <SegmentedToggle
                        options={[
                            { value: "debit", label: "Debit", dotColor: "#FF3B30" },
                            { value: "credit", label: "Credit", dotColor: "#34C759" },
                        ]}
                        value={direction}
                        onChange={setDirection}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F", WebkitAppearance: "none" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Receipt <span style={{ color: "#6E6E73", fontWeight: 400 }}>(optional)</span>
                    </label>
                    {receipt ? (
                        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: "#F5F5F7" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={receipt} alt="Receipt preview" className="w-full h-40 object-cover" />
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
                            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "#F5F5F7" }}>
                                <svg className="w-5 h-5" style={{ color: "#6E6E73" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <span className="text-sm" style={{ color: "#6E6E73" }}>Upload receipt (max 2MB)</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                        </label>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Link <span style={{ color: "#6E6E73", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>
            </div>
        </PopinWrapper>
    );
}