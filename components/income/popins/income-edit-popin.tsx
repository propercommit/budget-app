import { useRef, useState } from "react";
import { IncomeSource } from "@/lib/types";
import { IconPicker } from "@/components/icon-picker";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
import { FieldMessage, amountFieldMessage, fieldAriaProps, fieldFocusProps, fieldInputStyle, fieldValidationProps, useSubmitReveal } from "@/components/ui/field-message";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";
import { parseAmountToCents, centsToAmount } from "@/lib/money";

interface IncomePopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<IncomeSource, 'id' | 'month'>) => void;
    onDelete?: () => void;
    mode: 'add' | 'edit';
    initialData?: IncomeSource | null;
}

export function IncomePopin({ isOpen, onClose, onSave, onDelete, mode, initialData }: IncomePopinProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount === undefined ? '' : centsToAmount(initialData.amount).toString());
    const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'piggy-bank');
    const [incomeType, setIncomeType] = useState<'active' | 'passive'>(initialData?.type || 'active');
    const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
    const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
    const [note, setNote] = useState(initialData?.note || '');
    const { submitted, reveal } = useSubmitReveal();
    const { settings } = useSettings();

    const nameRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const startDateRef = useRef<HTMLInputElement>(null);

    const isEdit = mode === 'edit';
    const parsedAmount = parseAmountToCents(amount);

    // Validate on submit, clear on input: errors surface only after a failed
    // save and are derived from live values, so fixing a field clears its
    // message immediately.
    const nameInvalid = name.trim() === '';
    const amountInvalid = parsedAmount === null;
    const startDateInvalid = startDate === '';

    const nameError = submitted && nameInvalid;
    const amountError = submitted && amountInvalid;
    const startDateError = submitted && startDateInvalid;

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
            setAmount(val);
        }
    };

    const handleSave = () => {

        const invalid = reveal([
            { error: nameInvalid, ref: nameRef },
            { error: amountInvalid, ref: amountRef },
            { error: startDateInvalid, ref: startDateRef },
        ]);

        if (invalid || parsedAmount === null) return;

        onSave({
            name,
            amount: parsedAmount,
            icon: selectedIcon,
            type: incomeType,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            note: note || undefined,
        });
    };

    return (
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Income Source' : 'Add Income Source'}
            subtitle={isEdit ? 'Update this income source' : 'Add a new income source'}
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
                            onClick={handleSave}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={{ backgroundColor: "#007AFF", color: "white", boxShadow: "0 4px 12px rgba(0, 122, 255, 0.3)" }}
                        >
                            {isEdit ? 'Save Changes' : 'Add Income'}
                        </button>
                    </div>
                    {isEdit && onDelete && (
                        <DeleteConfirmSection
                            label="Delete Income"
                            confirmMessage="Are you sure? This cannot be undone."
                            onDelete={onDelete}
                        />
                    )}
                </div>
            }
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>Name</label>
                    <input
                        ref={nameRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Monthly Salary"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={fieldInputStyle(nameError)}
                        {...fieldValidationProps(nameError, "income-name-error")}
                    />
                    {nameError && <FieldMessage id="income-name-error">Enter a name</FieldMessage>}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Amount <span className="font-normal text-xs" style={{ color: "var(--muted-foreground)" }}>/month</span>
                    </label>
                    {/* The prefix sits in flow (not absolutely positioned) so
                        the gap to the amount holds for any symbol width ($ vs
                        CHF); the focus ring moves to the wrapper accordingly.
                        The errored inline style wins over the focus-within
                        utilities, keeping the red border while focused. */}
                    <div
                        className="flex items-center gap-2 px-4 rounded-xl bg-muted border border-border transition-all duration-200 focus-within:border-[#007AFF] focus-within:shadow-[0_0_0_3px_rgba(0,122,255,0.1)]"
                        style={amountError ? fieldInputStyle(true) : undefined}
                    >
                        <span className="flex-shrink-0 text-lg font-semibold" style={{ color: "var(--muted-foreground)" }} aria-hidden="true">
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
                            {...fieldAriaProps(amountError, "income-amount-error")}
                        />
                    </div>
                    {amountError && <FieldMessage id="income-amount-error">{amountFieldMessage(amount)}</FieldMessage>}
                </div>

                <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>Type</label>
                    <SegmentedToggle
                        options={[
                            { value: 'active', label: 'Active', dotColor: '#007AFF' },
                            { value: 'passive', label: 'Passive', dotColor: '#FF9500' },
                        ]}
                        value={incomeType}
                        onChange={setIncomeType}
                    />
                </div>

                <div className="space-y-2 max-w-full overflow-hidden">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>Date Range</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="w-full sm:flex-1 min-w-0">
                            <input
                                ref={startDateRef}
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={{ ...fieldInputStyle(startDateError), WebkitAppearance: 'none', minWidth: 0 }}
                                {...fieldValidationProps(startDateError, "income-start-date-error")}
                            />
                            {startDateError
                                ? <FieldMessage id="income-start-date-error">Choose a start date</FieldMessage>
                                : <p className="text-xs mt-1 ml-1" style={{ color: "var(--muted-foreground)" }}>Start date</p>}
                        </div>
                        <svg className="hidden sm:block w-5 h-5 flex-shrink-0 text-muted-foreground/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <div className="w-full sm:flex-1 min-w-0">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={{ ...fieldInputStyle(false), WebkitAppearance: 'none', minWidth: 0 }}
                                {...fieldFocusProps(false)}
                            />
                            <p className="text-xs mt-1 ml-1" style={{ color: "var(--muted-foreground)" }}>End date (optional)</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                        Note <span className="font-normal" style={{ color: "var(--muted-foreground)" }}>(optional)</span>
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any additional details..."
                        rows={3}
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200 resize-none"
                        style={fieldInputStyle(false)}
                        {...fieldFocusProps(false)}
                    />
                </div>
            </div>
        </PopinWrapper>
    );
}
