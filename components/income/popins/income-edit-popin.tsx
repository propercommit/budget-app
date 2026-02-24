import { useState } from "react";
import { IncomeSource } from "@/lib/types";
import { IconPicker } from "@/components/icon-picker";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";
import { useSettings } from "@/lib/settings-context";
import { CURRENCY_SYMBOLS } from "@/lib/constants";

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
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'piggy-bank');
    const [incomeType, setIncomeType] = useState<'active' | 'passive'>(initialData?.type || 'active');
    const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
    const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
    const [note, setNote] = useState(initialData?.note || '');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { settings } = useSettings();

    useLockScroll(isOpen);

    const isEdit = mode === 'edit';
    const isFormValid = name.trim() !== '' && amount !== '' && parseFloat(amount) > 0 && startDate !== '';

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
            setAmount(val);
        }
    };

    const handleSave = () => {
        if (!isFormValid) return;
        onSave({
            name,
            amount: parseFloat(amount),
            icon: selectedIcon,
            type: incomeType,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : undefined,
            note: note || undefined,
        });
    };

    const handleDelete = () => {
        setShowDeleteConfirm(false);
        onDelete?.();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Popin */}
            <div 
                className="relative w-full max-w-xl lg:max-w-2xl bg-white rounded-3xl overflow-hidden flex flex-col"
                style={{ maxHeight: '90vh', boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.15)' }}
            >   
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isEdit ? 'Edit Income Source' : 'Add Income Source'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {isEdit ? 'Update this income source' : 'Add a new income source'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6 space-y-5">                    
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Monthly Salary"
                            className="w-full px-4 py-3.5 rounded-xl text-base bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </div>
                    
                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">
                            Amount <span className="font-normal text-xs text-gray-500">/month</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400 pointer-events-none">
                                {CURRENCY_SYMBOLS[settings.currency]}
                            </div>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={handleAmountChange}
                                placeholder="0.00"
                                className="w-full pl-9 pr-4 py-3.5 rounded-xl text-lg font-semibold bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </div>
                    
                    {/* Icon Picker */}
                    <IconPicker value={selectedIcon} onChange={setSelectedIcon} />
                    
                    {/* Type Selector */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Type</label>
                        <div className="relative flex rounded-xl p-1 bg-gray-100">
                            {/* Sliding background */}
                            <div 
                                className="absolute top-1 bottom-1 rounded-lg bg-white shadow-sm transition-transform duration-200 ease-out"
                                style={{ 
                                    width: 'calc(50% - 4px)',
                                    left: '4px',
                                    transform: incomeType === 'passive' ? 'translateX(100%)' : 'translateX(0)'
                                }}
                            />
                            <button
                                onClick={() => setIncomeType('active')}
                                className="relative flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 z-10"
                                style={{ color: incomeType === 'active' ? '#1D1D1F' : '#6E6E73' }}
                            >
                                <div 
                                    className="w-2.5 h-2.5 rounded-full transition-opacity duration-200"
                                    style={{ backgroundColor: '#007AFF', opacity: incomeType === 'active' ? 1 : 0.35 }}
                                />
                                Active
                            </button>
                            <button
                                onClick={() => setIncomeType('passive')}
                                className="relative flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2 z-10"
                                style={{ color: incomeType === 'passive' ? '#1D1D1F' : '#6E6E73' }}
                            >
                                <div 
                                    className="w-2.5 h-2.5 rounded-full transition-opacity duration-200"
                                    style={{ backgroundColor: '#FF9500', opacity: incomeType === 'passive' ? 1 : 0.35 }}
                                />
                                Passive
                            </button>
                        </div>
                    </div>
                    
                    {/* Date Range */}
                    <div className="space-y-2 max-w-full overflow-hidden">
                        <label className="block text-sm font-semibold text-gray-900">Date Range</label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">                            
                            <div className="w-full sm:flex-1 min-w-0">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-base bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    style={{ WebkitAppearance: 'none', minWidth: 0 }}
                                />
                                <p className="text-xs mt-1 ml-1 text-gray-500">Start date</p>
                            </div>
                            
                            <svg className="hidden sm:block w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            
                            <div className="w-full sm:flex-1 min-w-0">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-base bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    style={{ WebkitAppearance: 'none', minWidth: 0 }}
                                />
                                <p className="text-xs mt-1 ml-1 text-gray-500">End date <span className="text-gray-400">(optional)</span></p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Note */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">
                            Note <span className="font-normal text-gray-500">(optional)</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Add any additional details..."
                            rows={3}
                            className="w-full px-4 py-3.5 rounded-xl text-base bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                        />
                    </div>
                </div>
                
                {/* Footer */}
                <div className="px-5 py-4 sm:px-6 space-y-3 border-t border-gray-200 bg-white">
                    {/* Primary Action Buttons */}
                    <div 
                        className={`flex gap-3 transition-opacity duration-200 ${showDeleteConfirm ? 'opacity-40 pointer-events-none' : ''}`}
                    >
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-xl font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isFormValid}
                            className={`flex-1 py-4 rounded-xl font-semibold transition-all ${
                                isFormValid
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                            style={isFormValid ? { boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)' } : {}}
                        >
                            {isEdit ? 'Save Changes' : 'Add Income'}
                        </button>
                    </div>
                    
                    {/* Delete Section - Edit mode only */}
                    {isEdit && (
                        <div className="pt-2">
                            {!showDeleteConfirm ? (
                                /* Delete Button - Ghost style */
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full py-3 rounded-xl font-medium transition-all hover:bg-red-50 flex items-center justify-center gap-2 border border-red-500 text-red-500"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Income
                                </button>
                            ) : (
                                /* Delete Confirmation */
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                    <p className="text-sm font-medium text-center mb-3 text-gray-900">
                                        Are you sure? This cannot be undone.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
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