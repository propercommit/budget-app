import { IncomeSource } from "@/lib/types";
import { useState } from "react";
import { IncomeCardCollapsed } from "./income-card-collapsed";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { IncomeCardExpanded } from "./income-card-expanded";

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
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Income</CardTitle>
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <svg 
                        className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
}