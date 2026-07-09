import { IncomeSource } from "@/lib/types";
import { useState } from "react";
import { IncomeCardCollapsed } from "./income-card-collapsed";
import { IncomeCardExpanded } from "./income-card-expanded";
import { INCOME_TYPES, INCOME_TYPE_META, IncomeType, IncomeTypeFigures } from "./income-type-meta";
import { SectionCard } from "../section-card";
import { CardHeader } from "../ui/card-header";

interface IncomeCardProps {
    incomes: IncomeSource[];
    onAdd: () => void;
    onSelect: (id: string) => void;
};

export function IncomeCard({ incomes, onAdd, onSelect }: IncomeCardProps) {

    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredType, setHoveredType] = useState<IncomeType | null>(null);
    const [selectedType, setSelectedType] = useState<IncomeType | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    const totalIncome: number = incomes.reduce((sum, income) => sum + income.amount, 0);

    const incomeTypes: IncomeTypeFigures[] = INCOME_TYPES.map(type => {
        const total = incomes.filter(income => income.type === type).reduce((sum, income) => sum + income.amount, 0);

        return { type, ...INCOME_TYPE_META[type], total, percentage: totalIncome > 0 ? (total / totalIncome) * 100 : 0 };
    });

    // What the views focus their figures on: the hovered type while pointing,
    // else the pinned type, else nothing (grand total).
    const focusedType = hoveredType ?? selectedType;

    /** Click/tap pins a type's figures; clicking the pinned type again unpins back to the total. */
    const toggleSelectedType = (type: IncomeType) => setSelectedType(selectedType === type ? null : type);

    return (
        <SectionCard className="mt-6">
            <CardHeader
                isExpanded={isExpanded}
                onToggle={() => {
                    setIsExpanded(!isExpanded);

                    // Hover/selection don't carry across the view switch — mouseleave
                    // never fires on unmount, so a stale hover would stick otherwise.
                    setHoveredType(null);
                    setSelectedType(null);
                    setHoveredItemId(null);
                }}
                title="Income"
            />

            {isExpanded ? (
                <IncomeCardExpanded
                    incomes={incomes}
                    totalIncome={totalIncome}
                    incomeTypes={incomeTypes}
                    onAdd={onAdd}
                    onSelect={onSelect}
                    focusedType={focusedType}
                    setHoveredType={setHoveredType}
                    onSelectType={toggleSelectedType}
                    hoveredItemId={hoveredItemId}
                    setHoveredItemId={setHoveredItemId}
                />
            ) : (
                <IncomeCardCollapsed
                    totalIncome={totalIncome}
                    incomeTypes={incomeTypes}
                    onAdd={onAdd}
                    focusedType={focusedType}
                    setHoveredType={setHoveredType}
                    onSelectType={toggleSelectedType}
                />
            )}
        </SectionCard>
    );
}
