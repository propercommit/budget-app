import { useState } from "react";
import { IncomeSource } from "@/lib/types";
import { IconPicker } from "@/components/icon-picker";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { DeleteConfirmSection } from "@/components/ui/delete-confirm-section";
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
    const { settings } = useSettings();

    const isEdit = mode === 'edit';
    const parsedAmount = parseAmountToCents(amount);
    const isFormValid = name.trim() !== '' && parsedAmount !== null && startDate !== '';

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
            setAmount(val);
        }
    };

    const handleSave = () => {
        if (!isFormValid || parsedAmount === null) return;

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
                            style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isFormValid}
                            className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                            style={isFormValid
                                ? { backgroundColor: "#007AFF", color: "white", boxShadow: "0 4px 12px rgba(0, 122, 255, 0.3)" }
                                : { backgroundColor: "#E5E5EA", color: "#8E8E93", cursor: "not-allowed" }
                            }
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
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Monthly Salary"
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Amount <span className="font-normal text-xs" style={{ color: "#6E6E73" }}>/month</span>
                    </label>
                    <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold pointer-events-none" style={{ color: "#8E8E93" }}>
                            {CURRENCY_SYMBOLS[settings.currency]}
                        </div>
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

                <IconPicker value={selectedIcon} onChange={setSelectedIcon} />

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>Type</label>
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
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>Date Range</label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="w-full sm:flex-1 min-w-0">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F", WebkitAppearance: 'none', minWidth: 0 }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                            <p className="text-xs mt-1 ml-1" style={{ color: "#6E6E73" }}>Start date</p>
                        </div>
                        <svg className="hidden sm:block w-5 h-5 flex-shrink-0" style={{ color: "#C7C7CC" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <div className="w-full sm:flex-1 min-w-0">
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200"
                                style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F", WebkitAppearance: 'none', minWidth: 0 }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                                onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                            />
                            <p className="text-xs mt-1 ml-1" style={{ color: "#6E6E73" }}>End date <span style={{ color: "#8E8E93" }}>(optional)</span></p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                        Note <span className="font-normal" style={{ color: "#6E6E73" }}>(optional)</span>
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any additional details..."
                        rows={3}
                        className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all duration-200 resize-none"
                        style={{ backgroundColor: "#F5F5F7", border: "1px solid #E5E5EA", color: "#1D1D1F" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#007AFF"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 122, 255, 0.1)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E5EA"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                </div>
            </div>
        </PopinWrapper>
    );
}