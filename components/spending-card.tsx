import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { InputSlider } from "./input-slider";

interface SpendingCardProps {
    name: string;
    icon: LucideIcon;
    budgeted: number;
    spent: number;
    category: string;
    categoryColor: string;
    onBudgetedChange: (value: number) => void;
    onSpentChange: (value: number) => void;
};

export function SpendingCard({name, icon: Icon, budgeted, spent, category, categoryColor, onBudgetedChange, onSpentChange}: SpendingCardProps) {
    return (
        <Card>
            <CardHeader
                className="border-b-2 border-t-2 py-6"
                style={{
                    backgroundColor: `${categoryColor}15`,
                    borderBottomColor: `${categoryColor}40 `,
                    borderTopColor: `${categoryColor}40 `
                }}
            >
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <p className="font-medium">{name}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-white text-sm" style={{ backgroundColor: categoryColor}}>
                        {category}
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <InputSlider
                        label="Budgeted"
                        value={budgeted}
                        onChange={onBudgetedChange}
                        color="blue"
                    />
                    <InputSlider
                        label="Spent"
                        value={spent}
                        onChange={onSpentChange}
                        color="blue"
                    />
                    <div className="pt-2">
                        {spent > budgeted ? (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                                ${spent - budgeted} over
                            </span>
                        ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                ${budgeted - spent} left
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}