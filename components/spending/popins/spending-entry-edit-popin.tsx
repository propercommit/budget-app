"use client";

import { useRef, useState } from "react";
import { SpendingEntry } from "../spending-card-expanded";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { FieldMessage, amountFieldMessage, fieldAriaProps, fieldInputStyle, fieldValidationProps, useSubmitReveal } from "@/components/ui/field-message";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { iconMap } from "@/lib/icon-map";
import { compressImage } from "@/lib/compress-image";
import { parseAmountToCents, centsToAmount } from "@/lib/money";

/**
 * What the entry form emits on save, in both create and edit mode — the single
 * payload type shared by the whole save chain (popin → SpendingCard → Dashboard).
 * `amount` is integer cents; `direction` is always sent explicitly — the API's
 * default-to-debit is backward compat only, not a second definition of this
 * form's intent.
 */
export interface EntrySavePayload {
    name: string;
    amount: number;
    direction: "debit" | "credit";
    date: string;
    receipt: string | null;
    link: string | null;
}

interface EntryEditPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: EntrySavePayload) => void;
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
    const { submitted, reveal } = useSubmitReveal();
    const [receiptFailed, setReceiptFailed] = useState(false);
    const { settings } = useSettings();

    const nameRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const dateRef = useRef<HTMLInputElement>(null);

    const isCreate = mode === "create";
    const parsedAmount = parseAmountToCents(amount);

    // Validate on submit, clear on input: errors surface only after a failed
    // save and are derived from live values, so fixing a field clears its
    // message immediately.
    const nameInvalid = name.trim() === "";
    const amountInvalid = parsedAmount === null;
    const dateInvalid = date === "";

    const nameError = submitted && nameInvalid;
    const amountError = submitted && amountInvalid;
    const dateError = submitted && dateInvalid;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) setAmount(val);
    };

    const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReceiptFailed(false);
            try {
                const compressed = await compressImage(file);
                const reader = new FileReader();
                reader.onload = (event) => setReceipt(event.target?.result as string);
                reader.readAsDataURL(compressed);
            } catch {
                setReceiptFailed(true);
            }
        }
    };

    const handleSave = () => {

        const invalid = reveal([
            { error: nameInvalid, ref: nameRef },
            { error: amountInvalid, ref: amountRef },
            { error: dateInvalid, ref: dateRef },
        ]);

        if (invalid || parsedAmount === null) return;

        onSave({
            name,
            amount: parsedAmount,
            direction,
            date,
            receipt,
            link: link || null,
        });
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
                        <Button variant="secondary" className="flex-1 h-12" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button className="flex-1 h-12" onClick={handleSave}>
                            {isCreate ? "Add Entry" : "Save Changes"}
                        </Button>
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
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
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
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Name
                    </label>
                    <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Shell Station, Grocery run"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={fieldInputStyle(nameError)}
                        {...fieldValidationProps(nameError, "entry-name-error")}
                    />
                    {nameError && <FieldMessage id="entry-name-error">Enter a name</FieldMessage>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Amount
                    </label>
                    {/* The prefix sits in flow (not absolutely positioned) so
                        the gap to the amount holds for any symbol width ($ vs
                        CHF); the focus ring moves to the wrapper accordingly. */}
                    {/* The border lives on the wrapper (focus-within), so the
                        errored treatment is applied there; inline style wins
                        over the focus-within utilities, keeping the red border
                        while focused, per the validation spec. */}
                    <div
                        className="flex items-center gap-2 px-4 rounded-xl bg-muted border border-border transition-all duration-200 focus-within:border-primary focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_10%,transparent)]"
                        style={amountError ? fieldInputStyle(true) : undefined}
                    >
                        <span
                            className="flex-shrink-0 text-lg font-semibold"
                            style={{ color: direction === "debit" ? "#FF3B30" : "#34C759" }}
                        >
                            {direction === "debit" ? "−" : "+"}
                            {CURRENCY_SYMBOLS[settings.currency]}
                        </span>
                        <input
                            ref={amountRef}
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={handleAmountChange}
                            placeholder="0.00"
                            className="flex-1 min-w-0 py-3.5 bg-transparent text-lg font-semibold outline-none"
                            style={{ color: "var(--foreground)" }}
                            {...fieldAriaProps(amountError, "entry-amount-error")}
                        />
                    </div>
                    {amountError && <FieldMessage id="entry-amount-error">{amountFieldMessage(amount)}</FieldMessage>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Type
                    </label>
                    <SegmentedToggle
                        options={[
                            { value: "debit", label: "Debit", dotColor: "var(--destructive)" },
                            { value: "credit", label: "Credit", dotColor: "var(--positive)" },
                        ]}
                        value={direction}
                        onChange={setDirection}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Date
                    </label>
                    <input
                        ref={dateRef}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={{ ...fieldInputStyle(dateError), WebkitAppearance: "none" }}
                        {...fieldValidationProps(dateError, "entry-date-error")}
                    />
                    {dateError && <FieldMessage id="entry-date-error">Choose a date</FieldMessage>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Receipt <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span>
                    </label>
                    {receipt ? (
                        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={receipt} alt="Receipt preview" className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                <button
                                    onClick={() => setReceipt(null)}
                                    className="px-4 py-2 rounded-xl bg-white/90 text-sm font-semibold text-destructive"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 hover:bg-muted"
                            style={{ borderColor: "var(--border)" }}
                        >
                            <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--muted)" }}>
                                <svg className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Upload receipt (max 2MB)</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleReceiptUpload} />
                        </label>
                    )}
                    {receiptFailed && <FieldMessage id="entry-receipt-error">Couldn&apos;t process that image — try a different one</FieldMessage>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Link <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                        type="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>
            </div>
        </PopinWrapper>
    );
}