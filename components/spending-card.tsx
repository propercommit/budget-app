import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { InputSlider } from "./input-slider";
import { Chip } from "./Chip";
import { hexToLightColor } from "@/lib/color-utils";

interface SpendingCardProps {
    name: string;
    icon: LucideIcon;
    budgeted: number;
    spent: number;
    category: string;
    categoryColor: string;
    totalIncome: number;
    onBudgetedChange: (value: number) => void;
    onSpentChange: (value: number) => void;
};

export function SpendingCard({name, icon: Icon, budgeted, spent, category, categoryColor, totalIncome, onBudgetedChange, onSpentChange}: SpendingCardProps) {
    return (
        <Card>
            <CardHeader
                className="relative rounded-t-lg border-b-2 border-t-2 py-6"
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
                    <span className="absolute top-0 right-0 px-4 py-2 text-sm font-medium text-white" 
                        style={{ 
                            backgroundColor: categoryColor,
                            clipPath: "polygon(0 0, 100% 0, 100% 100%, 15% 100%)",
                            borderBottomLeftRadius: "0.5rem",
                        }}>
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
                        color={categoryColor}
                        colorLight={hexToLightColor(categoryColor)}
                        showAmount={true}
                        showLegend={false}
                    />
                    <InputSlider
                        label="Spent"
                        value={spent}
                        onChange={onSpentChange}
                        color={categoryColor}
                        colorLight={hexToLightColor(categoryColor)}
                        showAmount={true}
                        showLegend={false}
                    />
                    <div className="flex pt-2 justify-between">
                        {spent > budgeted ? (
                            <Chip textSize="sm" backgroundColor="#fee2e2" textColor="#b91c1c"label={`$${spent - budgeted} over`} />
                        ) : (
                            <Chip textSize="sm" backgroundColor="#dcfce7" textColor="#15803d" label={`$${budgeted - spent} left`} />
                        )}
                        <Chip 
                            textSize="sm" 
                            backgroundColor="#dbeafe" 
                            textColor="#1d4ed8" 
                            label={`${totalIncome > 0 ? ((budgeted / totalIncome) * 100).toFixed(1) : 0}% of total income`} 
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}