import { useSettings } from "@/lib/settings-context";
import { DonutChart, DonutSegment } from "../ui/donut-chart";

interface IncomeCardCollapsedProps {
    totalIncome: number;
    activeTotal: number;
    passiveTotal: number;
    activePercentage: number;
    passivePercentage: number;
    hoveredType: 'active' | 'passive' | null;
    setHoveredType: (type: 'active' | 'passive' | null) => void;
    selectedType: 'active' | 'passive' | null;
    onSelectType: (type: 'active' | 'passive') => void;
}

interface BreakdownRowProps {
    color: string;
    label: string;
    amount: string;
    percentage: number;
    isDimmed: boolean;
    onClick: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

/** Legend row: color dot, type label, amount and its share of the total. */
function BreakdownRow({ color, label, amount, percentage, isDimmed, onClick, onMouseEnter, onMouseLeave }: BreakdownRowProps) {
    return (
        <div
            className="flex items-center gap-2.5 cursor-pointer transition-opacity duration-200"
            style={{ opacity: isDimmed ? 0.4 : 1 }}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{amount}</span>
            <span className="w-10 text-right text-[13px] tabular-nums text-muted-foreground">{Math.round(percentage)}%</span>
        </div>
    );
}

/**
 * Collapsed Income card: the Active/Passive donut with a figures cluster.
 * Desktop puts the breakdown beside the donut, mobile stacks the donut (figures
 * in its center), a hairline divider and the breakdown rows.
 *
 * Hovering a segment or row previews that type — the headline figure shows just
 * that type's total and the other type dims. Clicking/tapping pins the type
 * (the only way in on touch, where hover doesn't exist); clicking it again
 * unpins back to the total. While hovering, the pointer target wins over the pin.
 */
export function IncomeCardCollapsed({
    totalIncome,
    activeTotal,
    passiveTotal,
    activePercentage,
    passivePercentage,
    hoveredType,
    setHoveredType,
    selectedType,
    onSelectType,
}: IncomeCardCollapsedProps) {

    const isEmpty = totalIncome === 0;
    const { formatAmount } = useSettings();

    // Single source of truth per income type: the donut segments, the hover/click
    // wiring and both breakdown lists all derive from this array.
    const incomeTypes = [
        { type: 'active' as const, color: '#007AFF', label: 'Active', total: activeTotal, percentage: activePercentage },
        { type: 'passive' as const, color: '#FF9500', label: 'Passive', total: passiveTotal, percentage: passivePercentage },
    ];

    // What the figures focus on: the hovered type while pointing, else the pinned
    // type, else nothing (grand total).
    const focusedType = hoveredType ?? selectedType;
    const focused = incomeTypes.find(t => t.type === focusedType);
    const headlineAmount = focused === undefined ? totalIncome : focused.total;
    const headlineLabel = focused === undefined ? 'Total Monthly Income' : `${focused.label} Income`;
    const centerLabel = focused === undefined ? 'Total Income' : `${focused.label} Income`;

    const isDimmed = (type: 'active' | 'passive') => focusedType !== null && focusedType !== type;

    const segments: DonutSegment[] = incomeTypes.map(t => ({
        value: t.percentage,
        color: t.color,
        style: {
            transition: 'opacity 0.2s ease-out',
            opacity: isDimmed(t.type) ? 0.4 : 1,
            cursor: 'pointer',
        },
        onClick: () => onSelectType(t.type),
    }));

    // The empty state has no breakdown to show — a single dashed ring reads
    // the same on both viewports.
    if (isEmpty) return (
        <div className="flex flex-col items-center gap-4">
            <DonutChart
                segments={segments}
                size={160}
                strokeWidth={14}
                radius={65}
                emptyContent={
                    <circle
                        cx="80"
                        cy="80"
                        r="65"
                        fill="none"
                        className="stroke-border"
                        strokeWidth="14"
                        strokeDasharray="8 4"
                    />
                }
                centerContent={
                    <div className="flex flex-col items-center justify-center">
                        <span className="text-xl font-semibold text-foreground">{formatAmount(0)}</span>
                        <span className="text-xs text-muted-foreground">No income yet</span>
                    </div>
                }
            />
        </div>
    );

    // Desktop adds hover previews on top of the shared click wiring.
    const hoverSegments: DonutSegment[] = segments.map((segment, i) => ({
        ...segment,
        onMouseEnter: () => setHoveredType(incomeTypes[i].type),
        onMouseLeave: () => setHoveredType(null),
    }));

    return (
        <>
            {/* Desktop: donut beside the figures cluster, aligned left.
                Sized so the collapsed card stays as flat as its siblings. */}
            <div className="hidden sm:flex items-center justify-start gap-11 py-2">
                <DonutChart segments={hoverSegments} size={160} strokeWidth={14} radius={65} />

                <div className="flex flex-col items-start">
                    <p className="text-[34px] leading-10 font-bold tracking-tight text-foreground">{formatAmount(headlineAmount)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{headlineLabel}</p>

                    <div className="mt-6 flex flex-col gap-3 w-60">
                        {incomeTypes.map(t => (
                            <BreakdownRow
                                key={t.type}
                                color={t.color}
                                label={t.label}
                                amount={formatAmount(t.total)}
                                percentage={t.percentage}
                                isDimmed={isDimmed(t.type)}
                                onClick={() => onSelectType(t.type)}
                                onMouseEnter={() => setHoveredType(t.type)}
                                onMouseLeave={() => setHoveredType(null)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile: donut with the focused figures in its center, then the breakdown. */}
            <div className="sm:hidden flex flex-col items-center gap-5">
                <DonutChart
                    segments={segments}
                    size={150}
                    strokeWidth={13}
                    radius={62}
                    centerContent={
                        <div className="flex flex-col items-center justify-center">
                            <span className="text-xl font-bold tracking-tight text-foreground">{formatAmount(headlineAmount)}</span>
                            <span className="text-xs text-muted-foreground">{centerLabel}</span>
                        </div>
                    }
                />

                <div
                    className="w-full h-px"
                    style={{ background: "linear-gradient(90deg, transparent, var(--border), transparent)" }}
                />

                <div className="flex flex-col gap-3 w-full">
                    {incomeTypes.map(t => (
                        <BreakdownRow
                            key={t.type}
                            color={t.color}
                            label={t.label}
                            amount={formatAmount(t.total)}
                            percentage={t.percentage}
                            isDimmed={isDimmed(t.type)}
                            onClick={() => onSelectType(t.type)}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
