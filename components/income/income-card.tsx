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
    const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

    const totalIncome: number = incomes.reduce((sum, income) => sum + income.amount, 0);
    const activeTotal = incomes.filter(income => income.type === 'active').reduce((sum, income) => sum + income.amount, 0);
    const passiveTotal = incomes.filter(income => income.type === 'passive').reduce((sum, income) => sum + income.amount, 0);
    const activePercentage = totalIncome > 0 ? (activeTotal / totalIncome) * 100 : 0;
    const passivePercentage = totalIncome > 0 ? (passiveTotal / totalIncome) * 100 : 0;

    return (
        <SectionCard className="mt-6">
            <CardHeader 
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
                title="Income"
            />

            {isExpanded ? (
                <IncomeCardExpanded 
                    incomes={incomes}
                    totalIncome={totalIncome}
                    activePercentage={activePercentage}
                    passivePercentage={passivePercentage}
                    onAdd={onAdd}
                    onSelect={onSelect}
                    hoveredType={hoveredType}
                    setHoveredType={setHoveredType}
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
                />
            )}
        </SectionCard>
    );
}