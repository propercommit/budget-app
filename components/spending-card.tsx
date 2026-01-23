import { Card, CardContent, CardHeader } from "./ui/card";
import { InputSlider } from "./input-slider";
import { hexToLightColor } from "@/lib/color-utils";
import { iconMap } from "@/lib/icon-map";
import { Chip } from "./Chip";

interface SpendingCardProps {
    name: string;
    icon: string;
    budgeted: number;
    spent: number;
    category: string;
    categoryColor: string;
    categoryIcon?: string;
    totalIncome: number;
    onBudgetedChange: (value: number) => void;
    onSpentChange: (value: number) => void;
    onBudgetedCommit: (value: number) => void;
    onSpentCommit: (value: number) => void;
    onEdit: () => void;
    onEditCategory?: () => void;
}

export function SpendingCard({
    name,
    icon,
    budgeted,
    spent,
    category,
    categoryColor,
    categoryIcon,
    totalIncome,
    onBudgetedChange,
    onSpentChange,
    onBudgetedCommit,
    onSpentCommit,
    onEdit,
    onEditCategory,
}: SpendingCardProps) {
    const handleCategoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEditCategory) {
            onEditCategory();
        }
    };

    return (
        <Card>
            <CardHeader
                className="relative border-b-2 py-6"
                style={{
                    backgroundColor: `${categoryColor}15`,
                    borderBottomColor: `${categoryColor}40`,
                    borderTopColor: `${categoryColor}40`
                }}
            >
                <div className="flex justify-between items-center">
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-2 cursor-pointer transition-all duration-200 hover:scale-105 origin-left"
                    >
                        <div 
                            className="p-2 rounded-lg transition-all duration-200 hover:rotate-6 hover:scale-110"
                            style={{ backgroundColor: `${categoryColor}30` }}
                        >
                            {icon.startsWith("data:") ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={icon} alt="" className="w-5 h-5 object-contain" />
                            ) : (
                                iconMap[icon] || iconMap["shopping-cart"]
                            )}
                        </div>
                        <p className="font-medium">{name}</p>
                    </button>
                    <button
                        onClick={handleCategoryClick}
                        className="absolute top-0 right-0 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 flex items-center gap-1.5"
                        style={{ 
                            backgroundColor: categoryColor,
                            clipPath: "polygon(0 0, 100% 0, 100% 100%, 15% 100%)",
                            borderBottomLeftRadius: "0.5rem",
                        }}
                    >
                        {categoryIcon && (
                            <span className="transition-transform duration-200 hover:rotate-6 hover:scale-110">
                                {categoryIcon.startsWith("data:") ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={categoryIcon} alt="" className="w-4 h-4 object-contain" />
                                ) : (
                                    iconMap[categoryIcon]
                                )}
                            </span>
                        )}
                        {category}
                    </button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <InputSlider
                        label="Budgeted"
                        value={budgeted}
                        onChange={onBudgetedChange}
                        onCommit={onBudgetedCommit}
                        color={categoryColor}
                        colorLight={hexToLightColor(categoryColor)}
                        showAmount={true}
                        showLegend={false}
                    />
                    <InputSlider
                        label="Spent"
                        value={spent}
                        onChange={onSpentChange}
                        onCommit={onSpentCommit}
                        color={categoryColor}
                        colorLight={hexToLightColor(categoryColor)}
                        showAmount={true}
                        showLegend={false}
                    />
                    <div className="flex pt-2 justify-between">
                        {spent > budgeted ? (
                            <Chip textSize="sm" backgroundColor="#fee2e2" textColor="#b91c1c" label={`$${spent - budgeted} over`} />
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