import { IncomeSource } from "@/lib/types";
import { useState } from "react";
import { IncomeCardCollapsed } from "./income-card-collapsed";
import { IncomeCardExpanded } from "./income-card-expanded";
import { SectionCard } from "../section-card";

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
            <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>Income</p>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <svg 
                        className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

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
                    onAdd={onAdd}
                    hoveredType={hoveredType}
                    setHoveredType={setHoveredType}
                />
            )}
        </SectionCard>
    );
}