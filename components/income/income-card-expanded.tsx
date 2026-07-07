import { IncomeSource } from "@/lib/types";
import { iconMap } from "@/lib/icon-map";
import { useSettings } from "@/lib/settings-context";
import { DonutChart } from "../ui/donut-chart";

interface IncomeCardExpandedProps {
    incomes: IncomeSource[];
    totalIncome: number;
    activeTotal: number;
    passiveTotal: number;
    activePercentage: number;
    passivePercentage: number;
    onAdd: () => void;
    onSelect: (id: string) => void;
    hoveredType: 'active' | 'passive' | null;
    setHoveredType: (type: 'active' | 'passive' | null) => void;
    selectedType: 'active' | 'passive' | null;
    onSelectType: (type: 'active' | 'passive') => void;
    hoveredItemId: string | null;
    setHoveredItemId: (id: string | null) => void;
}

/**
 * Expanded Income card: small donut + focused figures, then the source list.
 * Hovering a legend chip or a source row previews that type (the headline
 * shows just its total, the rest dims); clicking/tapping a chip pins the type,
 * clicking it again unpins back to the total. Hover wins while pointing.
 */
export function IncomeCardExpanded({
    incomes,
    totalIncome,
    activeTotal,
    passiveTotal,
    activePercentage,
    passivePercentage,
    onAdd,
    onSelect,
    hoveredType,
    setHoveredType,
    selectedType,
    onSelectType,
    hoveredItemId,
    setHoveredItemId
}: IncomeCardExpandedProps) {
    const isEmpty = incomes.length === 0;
    const { formatAmount } = useSettings();

    // What the figures focus on: the hovered type while pointing, else the
    // pinned type, else nothing (grand total).
    const focusedType = hoveredType ?? selectedType;
    const headlineAmount = focusedType === 'active' ? activeTotal : focusedType === 'passive' ? passiveTotal : totalIncome;
    const headlineLabel = focusedType === 'active' ? 'Active Income' : focusedType === 'passive' ? 'Passive Income' : 'Total Monthly';

    const segments = [
        {
            value: activePercentage,
            color: '#007AFF',
            style: {
                transition: 'opacity 0.2s ease-out',
                opacity: focusedType === 'passive' ? 0.4 : 1,
            },
        },
        {
            value: passivePercentage,
            color: '#FF9500',
            style: {
                transition: 'opacity 0.2s ease-out',
                opacity: focusedType === 'active' ? 0.4 : 1,
            },
        },
    ];

    const renderIcon = (iconId: string) => {
        if (iconId.startsWith("data:")) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={iconId} alt="Custom icon" className="w-5 h-5 object-contain" />;
        }
        return iconMap[iconId] || iconMap["piggy-bank"];
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Header row: small donut + focused figures */}
            <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                    <DonutChart
                        segments={segments}
                        size={80}
                        strokeWidth={8}
                        radius={30}
                        emptyContent={
                            <circle
                                cx="40"
                                cy="40"
                                r="30"
                                fill="none"
                                className="stroke-border"
                                strokeWidth="8"
                                strokeDasharray="6 3"
                            />
                        }
                    />
                </div>
                <div className="min-w-0">
                    <p className="text-2xl font-bold">{formatAmount(headlineAmount)}</p>
                    <p className="text-sm text-muted-foreground">{headlineLabel}</p>
                    {!isEmpty && (
                        <div className="flex gap-3 mt-1">
                            <div
                                className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-200"
                                style={{ opacity: focusedType === 'passive' ? 0.3 : 1 }}
                                onClick={() => onSelectType('active')}
                                onMouseEnter={() => setHoveredType('active')}
                                onMouseLeave={() => { if (hoveredItemId === null) setHoveredType(null); }}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#007AFF' }} />
                                <span className="text-xs text-muted-foreground">{Math.round(activePercentage)}% Active</span>
                            </div>
                            <div
                                className="flex items-center gap-1.5 cursor-pointer transition-opacity duration-200"
                                style={{ opacity: focusedType === 'active' ? 0.3 : 1 }}
                                onClick={() => onSelectType('passive')}
                                onMouseEnter={() => setHoveredType('passive')}
                                onMouseLeave={() => { if (hoveredItemId === null) setHoveredType(null); }}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF9500' }} />
                                <span className="text-xs text-muted-foreground">{Math.round(passivePercentage)}% Passive</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

            {/* Income list or empty state */}
            {isEmpty ? (
                <div className="py-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-muted">
                        <svg className="w-8 h-8 text-muted-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No income sources yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                        Start tracking your income by adding your first source.
                    </p>
                    <button
                        onClick={onAdd}
                        className="w-full py-4 px-6 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#007AFF', boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)' }}
                    >
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span>Add your first income</span>
                    </button>
                </div>
            ) : (
                <>
                    {/* Income list */}
                    <div className="space-y-2">
                        {incomes.map((income) => {
                            const isHovered = hoveredItemId === income.id;
                            const otherTypeFocused = focusedType !== null && focusedType !== income.type;

                            return (
                                <div
                                    key={income.id}
                                    onClick={() => onSelect(income.id)}
                                    className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all duration-200"
                                    style={{
                                        backgroundColor: isHovered ? 'var(--muted)' : 'transparent',
                                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                        opacity: otherTypeFocused ? 0.4 : 1
                                    }}
                                    onMouseEnter={() => {
                                        setHoveredItemId(income.id);
                                        setHoveredType(income.type);
                                    }}
                                    onMouseLeave={() => {
                                        setHoveredItemId(null);
                                        setHoveredType(null);
                                    }}
                                >
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted text-muted-foreground flex-shrink-0">
                                        {renderIcon(income.icon)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{income.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            <div
                                                className="w-2 h-2 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: income.type === 'active' ? '#007AFF' : '#FF9500' }}
                                            />
                                            <span className="text-xs text-muted-foreground capitalize">{income.type}</span>
                                        </div>
                                    </div>
                                    <p className="font-semibold flex-shrink-0 whitespace-nowrap">{formatAmount(income.amount)}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add button */}
                    <button
                        onClick={onAdd}
                        className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-border flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-500/20">
                            <svg className="w-5 h-5" style={{ color: '#007AFF' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <span className="font-medium text-muted-foreground">Add income source</span>
                    </button>
                </>
            )}
        </div>
    );
}
