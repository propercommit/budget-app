// components/income/income-detail-popin.tsx
import { IncomeSource } from "@/lib/types";

interface IncomeDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    income: IncomeSource | null;
}

const presetIcons: Record<string, string> = {
    'briefcase': 'M20 7h-4V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 4h4v3h-4V4z',
    'laptop': 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    'chart': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    'gift': 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
    'currency': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    'savings': 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    'star': 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
};

export function IncomeDetailPopin({ isOpen, onClose, onEdit, income }: IncomeDetailPopinProps) {
    if (!isOpen || !income) return null;

    const typeColor = income.type === 'active' ? '#007AFF' : '#FF9500';

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const renderIcon = (iconId: string) => {
        const path = presetIcons[iconId];
        if (!path) return <span className="text-2xl">{iconId}</span>;
        return (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={path} />
            </svg>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Popin */}
            <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Income Details</h2>
                    <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                            onClick={onEdit}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                            title="Edit income"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </button>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Hero: Icon + Name + Amount */}
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                        >
                            {renderIcon(income.icon)}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-semibold text-gray-900">{income.name}</h3>
                            <p className="text-2xl font-bold" style={{ color: typeColor }}>
                                ${income.amount.toLocaleString()}
                            </p>
                        </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    
                    {/* Details Grid */}
                    <div className="space-y-4">
                        {/* Type */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Type</span>
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: typeColor }}
                                />
                                <span className="text-sm font-semibold text-gray-900 capitalize">
                                    {income.type}
                                </span>
                            </div>
                        </div>
                        
                        {/* Date Range */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Duration</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                    {formatDate(income.startDate)}
                                </span>
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                <span className={`text-sm font-semibold ${income.endDate ? 'text-gray-900' : 'text-green-500'}`}>
                                    {income.endDate ? formatDate(income.endDate) : 'Present'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Note (if exists) */}
                        {income.note && (
                            <div className="pt-2">
                                <span className="text-sm font-medium text-gray-500">Note</span>
                                <p className="mt-2 text-sm leading-relaxed p-4 rounded-xl bg-gray-100 text-gray-900">
                                    {income.note}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-6 pt-2">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 px-4 rounded-xl font-semibold bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}