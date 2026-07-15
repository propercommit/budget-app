"use client";

import { useEffect, useRef, useState } from "react";
import { SpendingEntry } from "../spending-card-expanded";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { Button } from "@/components/ui/button";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { FieldMessage, amountFieldMessage, fieldAriaProps, fieldInputStyle, fieldValidationProps, useSubmitReveal } from "@/components/ui/field-message";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { iconMap } from "@/lib/icon-map";
import { prepareReceiptFile, type ReceiptAction } from "@/lib/receipt-file";
import { normalizeLink } from "@/lib/normalize-link";
import { parseAmountToCents, centsToAmount } from "@/lib/money";

/**
 * What the entry form emits on save, in both create and edit mode — the single
 * payload type shared by the whole save chain (popin → SpendingCard → Dashboard).
 * `amount` is integer cents; `direction` is always sent explicitly — the API's
 * default-to-debit is backward compat only, not a second definition of this
 * form's intent. `receipt` is an action, not a value: the file itself never
 * rides the entry payload (the upload chain needs the entry id first).
 */
export interface EntrySavePayload {
    name: string;
    amount: number;
    direction: "debit" | "credit";
    date: string;
    receipt: ReceiptAction;
    link: string | null;
}

/**
 * The receipt field's whole lifecycle in one discriminated state:
 * `existing` (edit mode, stored receipt untouched — a static placeholder, no
 * network read), `removed` (stored receipt marked for removal on save),
 * `selected` (a new file staged, previewed via an object URL), `processing`
 * (compression in flight — Save is guarded), `failed` (rejected file), and
 * `empty`.
 */
type ReceiptFieldState =
    | { status: "empty" }
    | { status: "existing" }
    | { status: "processing" }
    | { status: "selected"; file: File; previewUrl: string }
    | { status: "removed" }
    | { status: "failed"; message: string };

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
    const [receiptState, setReceiptState] = useState<ReceiptFieldState>(
        entry?.receiptPath !== null && entry?.receiptPath !== undefined ? { status: "existing" } : { status: "empty" }
    );
    const [saveBlockedByProcessing, setSaveBlockedByProcessing] = useState(false);
    const [link, setLink] = useState(entry?.link || "");
    const { submitted, reveal } = useSubmitReveal();
    const { settings } = useSettings();

    // Revoke a staged preview's object URL when it is replaced or on unmount.
    const previewUrl = receiptState.status === "selected" ? receiptState.previewUrl : null;

    useEffect(() => {
        if (previewUrl === null) return;

        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    // Liveness guard for the async select handler: closing the popin during
    // compression unmounts it, and an object URL created after that would
    // never reach state — revoke it immediately instead of leaking it.
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;

        return () => { isMountedRef.current = false; };
    }, []);

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

    const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        // Reset the input so re-selecting the SAME file re-fires onChange —
        // without this, a failed attempt is a dead end for that file.
        e.target.value = "";

        if (file === undefined) return;

        setReceiptState({ status: "processing" });

        const prepared = await prepareReceiptFile(file);

        if (prepared.kind === "unsupported-type") {
            setReceiptState({ status: "failed", message: "Use a JPEG, PNG or WebP image" });
            return;
        }

        if (prepared.kind === "too-large") {
            setReceiptState({ status: "failed", message: "Receipts can be at most 10 MB" });
            return;
        }

        const stagedPreviewUrl = URL.createObjectURL(prepared.file);

        if (isMountedRef.current === false) {
            URL.revokeObjectURL(stagedPreviewUrl);
            return;
        }

        setReceiptState({ status: "selected", file: prepared.file, previewUrl: stagedPreviewUrl });
    };

    // Discards a staged file back to the base state; marks a stored receipt
    // for removal. (Removing a staged replacement first returns to `existing`;
    // a second Remove then marks the stored one.)
    const handleReceiptRemove = () => {
        const hasStored = entry?.receiptPath !== null && entry?.receiptPath !== undefined;

        if (receiptState.status === "selected") setReceiptState(hasStored ? { status: "existing" } : { status: "empty" });
        else if (receiptState.status === "existing") setReceiptState({ status: "removed" });
    };

    const receiptAction: ReceiptAction =
        receiptState.status === "selected" ? { action: "attach", file: receiptState.file }
        : receiptState.status === "removed" ? { action: "remove" }
        : { action: "keep" };

    const handleSave = () => {

        // A save mid-compression would silently drop the receipt — block it
        // and say why instead.
        if (receiptState.status === "processing") {
            setSaveBlockedByProcessing(true);
            return;
        }

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
            receipt: receiptAction,
            link: normalizeLink(link),
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
                        <Button variant="secondary" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button className="flex-1" onClick={handleSave}>
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
                        className="flex items-center gap-2 px-4 rounded-xl bg-muted border border-border transition-all duration-200 focus-within:border-primary focus-within:shadow-[var(--shadow-focus-ring)]"
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
                    {receiptState.status === "selected" ? (
                        <div className="relative rounded-xl overflow-hidden" style={{ backgroundColor: "var(--muted)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={receiptState.previewUrl} alt="Receipt preview" className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                <button
                                    onClick={handleReceiptRemove}
                                    className="px-4 py-2 rounded-xl bg-white/90 text-sm font-semibold text-destructive"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ) : receiptState.status === "existing" ? (
                        <div className="flex items-center justify-between px-4 py-3.5 rounded-xl" style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--background)" }}>
                                    <svg className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Receipt attached</span>
                            </div>
                            <button
                                onClick={handleReceiptRemove}
                                className="text-sm font-semibold text-destructive transition-opacity active:opacity-70"
                            >
                                Remove
                            </button>
                        </div>
                    ) : receiptState.status === "processing" ? (
                        <div
                            className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed"
                            style={{ borderColor: "var(--border)" }}
                        >
                            <div className="w-11 h-11 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: "var(--muted)" }}>
                                <svg className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Processing image…</span>
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
                            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>Upload receipt (max 10 MB)</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleReceiptSelect} />
                        </label>
                    )}
                    {receiptState.status === "failed" && <FieldMessage id="entry-receipt-error">{receiptState.message}</FieldMessage>}
                    {saveBlockedByProcessing && receiptState.status === "processing" && <FieldMessage id="entry-receipt-processing">Still processing the image — one moment</FieldMessage>}
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
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "var(--shadow-focus-ring)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>
            </div>
        </PopinWrapper>
    );
}