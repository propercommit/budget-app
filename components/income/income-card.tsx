import { IncomeSource } from "@/lib/types";
import { useState } from "react";
import { IncomeCardCollapsed } from "./income-card-collapsed";
import { IncomeCardExpanded } from "./income-card-expanded";
import { SectionCard } from "../section-card";
import { CardHeader } from "../ui/card-header";

interface IncomeCardProps {
    incomes: IncomeSource[];
    onAdd: () => void;
    onSelect: (id: string) => void;
};

export function IncomeCard({ incomes, onAdd, onSelect }: IncomeCardProps) {

    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredType, setHoveredType] = useState<'active' | 'passive' | null>(null);
    const [selectedType, setSelectedType] = useState<'active' | 'passive' | null>(null);
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    const totalIncome: number = incomes.reduce((sum, income) => sum + income.amount, 0);
    const activeTotal = incomes.filter(income => income.type === 'active').reduce((sum, income) => sum + income.amount, 0);
    const passiveTotal = incomes.filter(income => income.type === 'passive').reduce((sum, income) => sum + income.amount, 0);
    const activePercentage = totalIncome > 0 ? (activeTotal / totalIncome) * 100 : 0;
    const passivePercentage = totalIncome > 0 ? (passiveTotal / totalIncome) * 100 : 0;

    /** Click/tap pins a type's figures; clicking the pinned type again unpins back to the total. */
    const toggleSelectedType = (type: 'active' | 'passive') => setSelectedType(selectedType === type ? null : type);

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
                    activeTotal={activeTotal}
                    passiveTotal={passiveTotal}
                    activePercentage={activePercentage}
                    passivePercentage={passivePercentage}
                    onAdd={onAdd}
                    onSelect={onSelect}
                    hoveredType={hoveredType}
                    setHoveredType={setHoveredType}
                    selectedType={selectedType}
                    onSelectType={toggleSelectedType}
                    hoveredItemId={hoveredItemId}
                    setHoveredItemId={setHoveredItemId}
                />
            ) : (
                <IncomeCardCollapsed
                    totalIncome={totalIncome}
                    activeTotal={activeTotal}
                    passiveTotal={passiveTotal}
                    activePercentage={activePercentage}
                    passivePercentage={passivePercentage}
                    hoveredType={hoveredType}
                    setHoveredType={setHoveredType}
                    selectedType={selectedType}
                    onSelectType={toggleSelectedType}
                />
            )}
        </SectionCard>
    );
}
