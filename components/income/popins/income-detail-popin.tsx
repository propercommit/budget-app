import { IncomeSource } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";
import { PopinWrapper } from "@/components/ui/popin-wrapper";
import { useSettings } from "@/lib/settings-context";

interface IncomeDetailPopinProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    income: IncomeSource | null;
}

export function IncomeDetailPopin({ isOpen, onClose, onEdit, income }: IncomeDetailPopinProps) {
    const { formatAmount } = useSettings();

    if (!income) return null;

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
        <PopinWrapper
            isOpen={isOpen}
            onClose={onClose}
            title="Income Details"
            headerActions={
                <button
                    onClick={onEdit}
                    className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                    style={{ backgroundColor: "#F5F5F7" }}
                    title="Edit income"
                >
                    <svg className="w-5 h-5" style={{ color: "#6E6E73" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            }
            footer={
                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-[0.98]"
                    style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                >
                    Close
                </button>
            }
        >
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
                    >
                        {renderIcon(income.icon)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold truncate" style={{ color: "#1D1D1F" }}>{income.name}</h3>
                        <p className="text-2xl font-bold" style={{ color: typeColor }}>
                            {formatAmount(income.amount)}
                        </p>
                    </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Type</span>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: typeColor }}
                            />
                            <span className="text-sm font-semibold capitalize" style={{ color: "#1D1D1F" }}>
                                {income.type}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Duration</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>
                                {formatDate(income.startDate)}
                            </span>
                            <span style={{ color: "#C7C7CC" }}>→</span>
                            <span className="text-sm font-semibold" style={{ color: income.endDate ? "#1D1D1F" : "#34C759" }}>
                                {income.endDate ? formatDate(income.endDate) : 'Present'}
                            </span>
                        </div>
                    </div>

                    {income.note && (
                        <div className="space-y-2">
                            <span className="text-sm font-medium" style={{ color: "#6E6E73" }}>Note</span>
                            <p className="text-sm leading-relaxed p-4 rounded-xl" style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}>
                                {income.note}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </PopinWrapper>
    );
}