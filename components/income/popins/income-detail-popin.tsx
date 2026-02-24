import { IncomeSource } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";
import { useLockScroll } from "@/components/hooks/use-lock-scroll";
import { useSettings } from "@/lib/settings-context";

interface IncomeDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    income: IncomeSource | null;
}

export function IncomeDetailPopin({ isOpen, onClose, onEdit, income }: IncomeDetailPopinProps) {
    
    useLockScroll(isOpen);
    const { formatAmount } = useSettings();
    
    if (!isOpen || !income) return null;

    const typeColor = income.type === 'active' ? '#007AFF' : '#FF9500';

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const renderIcon = (iconId: string) => {
        if (iconId.startsWith("data:")) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={iconId} alt="Custom icon" className="w-8 h-8 object-contain" />;
        }
        return iconMap[iconId] || iconMap["piggy-bank"];
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
                            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                        >
                            {renderIcon(income.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold text-gray-900 truncate">{income.name}</h3>
                            <p className="text-2xl font-bold" style={{ color: typeColor }}>
                                {formatAmount(income.amount)}
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
                        
                        {/* Duration */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">Duration</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-900">
                                    {formatDate(income.startDate)}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span className={`text-sm font-semibold ${income.endDate ? 'text-gray-900' : 'text-green-500'}`}>
                                    {income.endDate ? formatDate(income.endDate) : 'Present'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Note (if exists) */}
                        {income.note && (
                            <div className="space-y-2">
                                <span className="text-sm font-medium text-gray-500">Note</span>
                                <p className="text-sm leading-relaxed p-4 rounded-xl bg-gray-100 text-gray-900">
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