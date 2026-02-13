import { useState } from "react";
import { IncomeSource } from "@/lib/types";

interface IncomePopinProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<IncomeSource, 'id'>) => void;
    onDelete?: () => void;
    mode: 'add' | 'edit';
    initialData?: IncomeSource | null;
}

const presetIcons = [
    { id: 'briefcase', name: 'Work', path: 'M20 7h-4V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 4h4v3h-4V4z' },
    { id: 'laptop', name: 'Freelance', path: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'chart', name: 'Invest', path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'home', name: 'Rental', path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'gift', name: 'Bonus', path: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
    { id: 'currency', name: 'Dividend', path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'savings', name: 'Savings', path: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'star', name: 'Other', path: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
];

export function IncomePopin({ isOpen, onClose, onSave, onDelete, mode, initialData }: IncomePopinProps) {
    const [name, setName] = useState(initialData?.name || '');
    const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
    const [selectedIcon, setSelectedIcon] = useState(initialData?.icon || 'briefcase');
    const [incomeType, setIncomeType] = useState<'active' | 'passive'>(initialData?.type || 'active');
    const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
    const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
    const [note, setNote] = useState(initialData?.note || '');
    const [iconTab, setIconTab] = useState<'preset' | 'upload'>('preset');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    const renderIcon = (iconId: string, size = 'w-6 h-6') => {
        const icon = presetIcons.find(i => i.id === iconId);
        if (!icon) return null;
        return (
            <svg className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
            </svg>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Popin */}
            <div className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col"
                style={{ maxHeight: '90vh', boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.15)' }}
            >
                {/* Mobile Handle */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                
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
                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">
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
                                $
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
                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-gray-900">Icon</label>
                        
                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setIconTab('preset')}
                                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                    iconTab === 'preset' 
                                        ? 'text-gray-900 border-blue-500' 
                                        : 'text-gray-500 border-transparent'
                                }`}
                            >
                                Choose Icon
                            </button>
                            <button
                                onClick={() => setIconTab('upload')}
                                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                    iconTab === 'upload' 
                                        ? 'text-gray-900 border-blue-500' 
                                        : 'text-gray-500 border-transparent'
                                }`}
                            >
                                Upload Icon
                            </button>
                        </div>
                        
                        {/* Icon Grid */}
                        {iconTab === 'preset' ? (
                            <div className="grid grid-cols-4 gap-2">
                                {presetIcons.map((icon) => {
                                    const isSelected = selectedIcon === icon.id;
                                    return (
                                        <button
                                            key={icon.id}
                                            onClick={() => setSelectedIcon(icon.id)}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                                                isSelected 
                                                    ? 'bg-blue-50 border-2 border-blue-500' 
                                                    : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                                            }`}
                                        >
                                            <div className={isSelected ? 'text-blue-500' : 'text-gray-600'}>
                                                {renderIcon(icon.id)}
                                            </div>
                                            <span className={`text-xs font-medium ${isSelected ? 'text-blue-500' : 'text-gray-500'}`}>
                                                {icon.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-3 py-8 px-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50">
                                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <p className="text-sm text-gray-500">Upload your custom icon</p>
                                <label className="px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
                                    Select File
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => setSelectedIcon(event.target?.result as string);
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                </label>
                            </div>
                        )}
                    </div>
                    
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
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Date Range</label>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-base bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                                <p className="text-xs mt-1 ml-1 text-gray-500">Start date</p>
                            </div>
                            
                            <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-xl text-base bg-gray-100 border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
                    {/* Delete Confirmation */}
                    {showDeleteConfirm && isEdit && (
                        <div className="p-4 rounded-xl bg-red-50 mb-1">
                            <p className="text-sm font-medium text-gray-900 mb-3">
                                Delete this income source? This can't be undone.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { onDelete?.(); onClose(); }}
                                    className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
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
                    
                    {/* Delete Button */}
                    {isEdit && !showDeleteConfirm && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full text-center text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                        >
                            Delete Income Source
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}