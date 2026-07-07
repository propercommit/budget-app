"use client";

import { useRef, useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { FieldMessage, amountFieldMessage, fieldAriaProps, fieldInputStyle, fieldValidationProps, useSubmitReveal } from "@/components/ui/field-message";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { parseAmountToCents, centsToAmount } from "@/lib/money";
import { monthLabel } from "@/lib/spending/month";
import type { BudgetSeriesSummary } from "@/lib/types";
import type { CreateSpendingConflict } from "@/components/hooks/use-spending";

interface Category {
    name: string;
    icon: string;
    color: string;
}

export interface SpendingItemSavePayload {
    name: string;
    icon: string;
    category: string;
    categoryColor: string;
    budget: number;
    note: string;
    recurring: boolean;
    /** Present when the user picked a dormant series from the typeahead — submit resumes it. */
    seriesId?: string;
}

interface SpendingItemEditPopinProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Create mode may answer with a series conflict (the server-side safety
     * net behind the typeahead) — the popin then stays open, shows the
     * conflict inline and refocuses the name field instead of closing.
     */
    onSave: (data: SpendingItemSavePayload) => void | CreateSpendingConflict | null | Promise<void | CreateSpendingConflict | null>;
    onDelete?: () => void;
    onCreateCategory?: () => void;
    mode: "create" | "edit";
    categories: Category[];
    /** Typeahead rows (create mode only): the user's full series list. */
    seriesOptions?: BudgetSeriesSummary[];
    /** Series already incarnated in the open month — shown disabled. */
    activeSeriesIds?: string[];
    /** The month the popin creates into; drives the "Already in {Month}" copy. */
    selectedMonth?: string;
    initialName?: string;
    initialIcon?: string;
    initialCategory?: string;
    initialBudget?: number;
    initialNote?: string;
    autoSelectCategory?: string | null;
}

/** "Jan – May 2025" (same year), "Nov 2024 – Feb 2025", or a single month. */
function activeRangeLabel(first: string, last: string): string {

    const format = (month: string, options: Intl.DateTimeFormatOptions) =>
        new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", options);

    if (first === last) return format(first, { month: "short", year: "numeric" });

    if (first.slice(0, 4) === last.slice(0, 4)) return `${format(first, { month: "short" })} – ${format(last, { month: "short", year: "numeric" })}`;

    return `${format(first, { month: "short", year: "numeric" })} – ${format(last, { month: "short", year: "numeric" })}`;
}

/** The typed query highlighted inside a matching series name. */
function highlightMatch(name: string, query: string): React.ReactNode {

    const index = name.toLowerCase().indexOf(query.trim().toLowerCase());

    if (index === -1 || query.trim() === "") return name;

    return (
        <>
            {name.slice(0, index)}
            <span style={{ backgroundColor: "rgba(0, 122, 255, 0.15)", borderRadius: "2px" }}>
                {name.slice(index, index + query.trim().length)}
            </span>
            {name.slice(index + query.trim().length)}
        </>
    );
}

export function SpendingItemEditPopin({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onCreateCategory,
    mode,
    categories,
    seriesOptions = [],
    activeSeriesIds = [],
    selectedMonth = "",
    initialName = "",
    initialIcon = "shopping-cart",
    initialCategory = "",
    initialBudget,
    initialNote = "",
    autoSelectCategory = null,
}: SpendingItemEditPopinProps) {
    const [name, setName] = useState(initialName);
    const [selectedIcon, setSelectedIcon] = useState(initialIcon);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [budget, setBudget] = useState(initialBudget === undefined ? "" : centsToAmount(initialBudget).toString());
    const [note, setNote] = useState(initialNote);
    const [recurring, setRecurring] = useState(true);
    const [selectedSeries, setSelectedSeries] = useState<BudgetSeriesSummary | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [conflict, setConflict] = useState<CreateSpendingConflict | null>(null);
    const [lastAutoSelected, setLastAutoSelected] = useState<string | null>(null);
    const { submitted, reveal } = useSubmitReveal();
    const nameInputRef = useRef<HTMLInputElement>(null);
    const categoryGroupRef = useRef<HTMLDivElement>(null);
    const budgetRef = useRef<HTMLInputElement>(null);
    const { settings } = useSettings();

    if (autoSelectCategory && autoSelectCategory !== lastAutoSelected) {
        setSelectedCategory(autoSelectCategory);
        setLastAutoSelected(autoSelectCategory);
    }

    const isCreate = mode === "create";
    const isResume = selectedSeries !== null;
    const parsedBudget = parseAmountToCents(budget);

    // Validate on submit, clear on input: errors surface only after a failed
    // save and are derived from live values, so fixing a field clears its
    // message immediately.
    const nameInvalid = name.trim() === "";
    const categoryInvalid = selectedCategory === "";
    const budgetInvalid = parsedBudget === null;

    const nameError = submitted && nameInvalid;
    const categoryError = submitted && categoryInvalid;
    const budgetError = submitted && budgetInvalid;

    const selectedCategoryColor =
        categories.find((c) => c.name === selectedCategory)?.color ?? "#007AFF";

    const query = name.trim();
    const matches = query === ""
        ? []
        : seriesOptions.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    // An exact name match means create-as-new is never offered (D24): the row
    // is either resumable or already in this month.
    const hasExactMatch = seriesOptions.some((s) => s.name.toLowerCase() === query.toLowerCase());
    const showDropdown = isCreate && isDropdownOpen && query !== "" && (matches.length > 0 || hasExactMatch === false);

    const handleNameChange = (value: string) => {
        setName(value);
        setSelectedSeries(null);
        setConflict(null);
        setIsDropdownOpen(value.trim() !== "");
    };

    /** Resume prefill: series values flow into the form; submit becomes Resume. */
    const handleSelectSeries = (series: BudgetSeriesSummary) => {
        setSelectedSeries(series);
        setName(series.name);
        setSelectedIcon(series.icon);
        setSelectedCategory(series.categoryLabel);
        setRecurring(series.recurring);
        setConflict(null);
        setIsDropdownOpen(false);

        if (series.lastBudgeted !== null) setBudget(centsToAmount(series.lastBudgeted).toString());
    };

    const handleSubmit = async () => {

        const invalid = reveal([
            { error: nameInvalid, ref: nameInputRef },
            { error: categoryInvalid, ref: categoryGroupRef },
            { error: budgetInvalid, ref: budgetRef },
        ]);

        if (invalid || parsedBudget === null) return;

        const result = await onSave({
            name,
            icon: selectedIcon,
            category: selectedCategory,
            categoryColor: selectedCategoryColor,
            budget: parsedBudget,
            note,
            recurring,
            ...(selectedSeries !== null && { seriesId: selectedSeries.id }),
        });

        // The server-side safety net fired: back to the form, name focused,
        // dropdown reopened so the resumable row is visible.
        if (result === "series_dormant" || result === "series_active_this_month") {
            setConflict(result);
            setSelectedSeries(null);
            setIsDropdownOpen(true);
            nameInputRef.current?.focus();
        }
    };

    const currencySymbol = CURRENCY_SYMBOLS[settings.currency];

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
                            style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{ backgroundColor: "#007AFF", color: "white", boxShadow: "0 4px 12px rgba(0, 122, 255, 0.3)" }}
                        >
                            {isCreate ? (isResume ? "Resume" : "Create") : "Save Changes"}
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
                    <label htmlFor="spending-name" className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Name
                    </label>
                    <div className="relative">
                        {isCreate && (
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px]" style={{ color: "var(--muted-foreground)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.3-4.3" />
                            </svg>
                        )}
                        <input
                            ref={nameInputRef}
                            id="spending-name"
                            type="text"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g., Fuel, Netflix, Groceries"
                            aria-required="true"
                            role={isCreate ? "combobox" : undefined}
                            aria-expanded={isCreate ? showDropdown : undefined}
                            aria-controls={isCreate ? "series-typeahead" : undefined}
                            className={`w-full ${isCreate ? "pl-11" : "px-4"} pr-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200`}
                            style={fieldInputStyle(nameError || conflict !== null)}
                            {...fieldValidationProps(nameError || conflict !== null, "spending-name-error")}
                        />
                    </div>

                    {conflict !== null && (
                        <div role="alert">
                            <FieldMessage id="spending-name-error">
                                {conflict === "series_dormant"
                                    ? "You already have an item with this name — pick it in the list below to resume it."
                                    : `"${name.trim()}" is already in ${selectedMonth !== "" ? monthLabel(selectedMonth) : "this month"}.`}
                            </FieldMessage>
                        </div>
                    )}
                    {conflict === null && nameError && <FieldMessage id="spending-name-error">Enter a name</FieldMessage>}

                    {showDropdown && (
                        <div
                            id="series-typeahead"
                            role="listbox"
                            className="rounded-2xl overflow-hidden"
                            style={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)" }}
                        >
                            {matches.map((series, index) => {
                                const isActiveThisMonth = activeSeriesIds.includes(series.id);

                                const iconTile = (
                                    <div
                                        className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]"
                                        style={{ backgroundColor: `${series.categoryColor}29`, color: series.categoryColor }}
                                        aria-hidden="true"
                                    >
                                        {iconMap[series.icon] || series.icon}
                                    </div>
                                );

                                const divider = index > 0 ? <div className="h-px mx-3.5" style={{ backgroundColor: "var(--muted)" }} /> : null;

                                if (isActiveThisMonth) {
                                    return (
                                        <div key={series.id}>
                                            {divider}
                                            <div role="option" aria-disabled="true" aria-selected="false" className="flex items-center gap-3 px-3.5 py-3 opacity-55">
                                                {iconTile}
                                                <div className="flex-1 min-w-0 text-left">
                                                    <p className="text-[15px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{highlightMatch(series.name, query)}</p>
                                                    <p className="text-xs mt-px truncate" style={{ color: "var(--muted-foreground)" }}>
                                                        Already in {selectedMonth !== "" ? monthLabel(selectedMonth) : "this month"} · {series.categoryLabel}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={series.id}>
                                        {divider}
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={selectedSeries?.id === series.id}
                                            onClick={() => handleSelectSeries(series)}
                                            className="w-full flex items-center gap-3 px-3.5 py-3 transition-colors duration-150 hover:bg-black/[0.03] active:bg-black/[0.05]"
                                        >
                                            {iconTile}
                                            <div className="flex-1 min-w-0 text-left">
                                                <p className="text-[15px] font-semibold truncate" style={{ color: "var(--foreground)" }}>{highlightMatch(series.name, query)}</p>
                                                <p className="text-xs mt-px truncate" style={{ color: "var(--muted-foreground)" }}>
                                                    {series.lastActiveMonth !== null && series.firstActiveMonth !== null
                                                        ? `Paused · ${activeRangeLabel(series.firstActiveMonth, series.lastActiveMonth)}${series.lastBudgeted !== null ? ` · Budget: ${currencySymbol} ${centsToAmount(series.lastBudgeted).toFixed(2)}` : ""}`
                                                        : "Paused · never used this year"}
                                                </p>
                                            </div>
                                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0" style={{ backgroundColor: "rgba(0, 122, 255, 0.1)", color: "#007AFF" }}>
                                                Resume
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}

                            {hasExactMatch === false && (
                                <div>
                                    {matches.length > 0 && <div className="h-px mx-3.5" style={{ backgroundColor: "var(--muted)" }} />}
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected="false"
                                        onClick={() => setIsDropdownOpen(false)}
                                        className="w-full flex items-center gap-3 px-3.5 py-3 transition-colors duration-150 hover:bg-black/[0.03] active:bg-black/[0.05]"
                                    >
                                        <div className="w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(0, 122, 255, 0.1)", color: "#007AFF" }} aria-hidden="true">
                                            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 4v16m8-8H4" />
                                            </svg>
                                        </div>
                                        <p className="text-[15px] font-semibold text-left" style={{ color: "#007AFF" }}>Create &ldquo;{query}&rdquo; as a new item</p>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                <fieldset className="space-y-2 min-w-0">
                    <legend className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Category
                    </legend>
                    <div
                        ref={categoryGroupRef}
                        tabIndex={-1}
                        className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 outline-none"
                        role="radiogroup"
                        aria-label="Select a category"
                        {...fieldAriaProps(categoryError, "spending-category-error")}
                    >
                        {categories.map((cat) => (
                            <button
                                key={cat.name}
                                onClick={() => setSelectedCategory(cat.name)}
                                role="radio"
                                aria-checked={selectedCategory === cat.name}
                                className="flex flex-shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95"
                                style={{
                                    backgroundColor: selectedCategory === cat.name ? cat.color : "var(--muted)",
                                    color: selectedCategory === cat.name ? "white" : "var(--muted-foreground)",
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
                            className="flex flex-shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 border-2 border-dashed"
                            style={{ borderColor: "#007AFF", backgroundColor: "rgba(0, 122, 255, 0.05)", color: "#007AFF" }}
                            aria-label="Create new category"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New Category</span>
                        </button>
                    </div>
                    {categoryError && <FieldMessage id="spending-category-error">Choose a category</FieldMessage>}
                </fieldset>

                <div className="space-y-2">
                    <label htmlFor="spending-budget" className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Monthly Budget
                    </label>
                    {/* The prefix sits in flow (not absolutely positioned) so
                        the gap to the amount holds for any symbol width ($ vs
                        CHF); the focus ring moves to the wrapper accordingly.
                        The errored inline style wins over the focus-within
                        utilities, keeping the red border while focused. */}
                    <div
                        className="flex items-center gap-2 px-4 rounded-xl bg-muted border border-border transition-all duration-200 focus-within:border-[#007AFF] focus-within:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]"
                        style={budgetError ? fieldInputStyle(true) : undefined}
                    >
                        <span className="flex-shrink-0 text-lg font-semibold" style={{ color: "var(--muted-foreground)" }} aria-hidden="true">
                            {currencySymbol}
                        </span>
                        <input
                            ref={budgetRef}
                            id="spending-budget"
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(e.target.value)}
                            placeholder="0"
                            aria-required="true"
                            aria-label="Monthly budget amount"
                            className="flex-1 min-w-0 py-3.5 bg-transparent text-lg font-semibold outline-none"
                            style={{ color: "var(--foreground)" }}
                            {...fieldAriaProps(budgetError, "spending-budget-error")}
                        />
                    </div>
                    {budgetError
                        ? <FieldMessage id="spending-budget-error">{amountFieldMessage(budget)}</FieldMessage>
                        : <p className="text-xs truncate max-w-[160px]" style={{ color: "var(--muted-foreground)" }}>Set how much you want to spend per month</p>}
                </div>

                <div className="space-y-2">
                    <label htmlFor="spending-note" className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Note <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>(optional)</span>
                    </label>
                    <textarea
                        id="spending-note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any details..."
                        rows={3}
                        aria-label="Additional notes (optional)"
                        className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all duration-200 resize-none"
                        style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>

                {isCreate && (
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl" style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Recurring</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                                {recurring ? "Carry this item into future months" : "Keep this item in this month only"}
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={recurring}
                            aria-label="Recurring"
                            onClick={() => setRecurring((prev) => !prev)}
                            className="relative flex-shrink-0 rounded-full transition-colors duration-200"
                            style={{ width: "51px", height: "31px", backgroundColor: recurring ? "#34C759" : "#E9E9EA" }}
                        >
                            <span
                                className="absolute top-[2px] rounded-full bg-white transition-all duration-200"
                                style={{ width: "27px", height: "27px", left: recurring ? "22px" : "2px", boxShadow: "0 3px 8px rgba(0, 0, 0, 0.15)" }}
                            />
                        </button>
                    </div>
                )}
            </div>
        </PopinWrapper>
    );
}
