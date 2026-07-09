import { useSettings } from "@/lib/settings-context";
import { IncomeType, IncomeTypeFigures } from "./income-type-meta";
import { DonutChart, DonutSegment } from "../ui/donut-chart";
import { IncomeEmptyState } from "./income-empty-state";

interface IncomeCardCollapsedProps {
    totalIncome: number;
    incomeTypes: IncomeTypeFigures[];
    /** Opens the IncomePopin in add mode — the empty state's CTA. */
    onAdd: () => void;
    focusedType: IncomeType | null;
    setHoveredType: (type: IncomeType | null) => void;
    onSelectType: (type: IncomeType) => void;
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
 * The headline figure follows `focusedType` (hover previews, click/tap pins —
 * the only way in on touch, where hover doesn't exist): it shows the focused
 * type's total, or the grand total when nothing is focused, and the other
 * type dims. The mobile donut deliberately gets no hover handlers — a tap
 * emulates mouseenter without a matching mouseleave, so hover would stick.
 */
export function IncomeCardCollapsed({
    totalIncome,
    incomeTypes,
    onAdd,
    focusedType,
    setHoveredType,
    onSelectType,
}: IncomeCardCollapsedProps) {

    const isEmpty = totalIncome === 0;
    const { formatAmount } = useSettings();

    const focused = incomeTypes.find(t => t.type === focusedType);
    const focusLabel = focused === undefined ? null : `${focused.label} Income`;
    const headlineAmount = focused === undefined ? totalIncome : focused.total;

    const isDimmed = (type: IncomeType) => focusedType !== null && focusedType !== type;

    const segmentFor = (t: IncomeTypeFigures): DonutSegment => ({
        value: t.percentage,
        color: t.color,
        style: {
            transition: 'opacity 0.2s ease-out',
            opacity: isDimmed(t.type) ? 0.4 : 1,
            cursor: 'pointer',
        },
        onClick: () => onSelectType(t.type),
    });

    const segments = incomeTypes.map(segmentFor);

    // Step 1 of the guided first-run flow — a single centered layout reads
    // the same on both viewports.
    if (isEmpty) return <IncomeEmptyState onAdd={onAdd} />;

    // Desktop adds hover previews on top of the shared click wiring.
    const hoverSegments = incomeTypes.map(t => ({
        ...segmentFor(t),
        onMouseEnter: () => setHoveredType(t.type),
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
                    <p className="mt-1 text-sm text-muted-foreground">{focusLabel ?? 'Total Monthly Income'}</p>

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
                            <span className="text-xs text-muted-foreground">{focusLabel ?? 'Total Income'}</span>
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
