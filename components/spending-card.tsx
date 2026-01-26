import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { InputSlider } from "./input-slider";
import { hexToLightColor } from "@/lib/color-utils";
import { iconMap } from "@/lib/icon-map";
import { Chip } from "./Chip";
import { SpendingEntry } from "@/lib/types";
import { Plus, ChevronDown, ChevronUp, List, Pencil, Trash2 } from "lucide-react";

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
    isAdvancedMode?: boolean;
    entries?: SpendingEntry[];
    onAddEntry?: (entry: { name: string; amount: number; receiptUrl?: string; link?: string }) => void;
    onUpdateEntry?: (entryId: string, data: { name?: string; amount?: number; receiptUrl?: string; link?: string }) => void;
    onDeleteEntry?: (entryId: string) => void;
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
    isAdvancedMode = false,
    entries = [],
    onAddEntry,
    onUpdateEntry,
    onDeleteEntry,
}: SpendingCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAllEntries, setShowAllEntries] = useState(false);

    const handleCategoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEditCategory) {
            onEditCategory();
        }
    };

    const displayedEntries = showAllEntries ? entries : entries.slice(0, 4);

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
                {isAdvancedMode ? (
                    /* Advanced Mode View */
                    <div className="space-y-4 pt-4">
                        {/* Budgeted and Spent chips */}
                        <div className="flex gap-3">
                            <div className="flex-1 px-4 py-3 rounded-xl bg-green-50 border border-green-200">
                                <div className="text-xs text-green-600 font-medium mb-1">Budgeted</div>
                                <div className="text-xl font-bold text-green-800">
                                    ${budgeted.toLocaleString()}
                                </div>
                            </div>
                            <div className={`flex-1 px-4 py-3 rounded-xl ${
                                spent > budgeted 
                                    ? "bg-red-50 border border-red-200" 
                                    : "bg-cyan-50 border border-cyan-200"
                            }`}>
                                <div className={`text-xs font-medium mb-1 ${
                                    spent > budgeted ? "text-red-600" : "text-cyan-600"
                                }`}>Spent</div>
                                <div className={`text-xl font-bold ${
                                    spent > budgeted ? "text-red-800" : "text-cyan-800"
                                }`}>
                                    ${spent.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Remaining/Over budget chip + expand button */}
                        <div className="flex items-center justify-between">
                            {spent > budgeted ? (
                                <span className="px-4 py-2 rounded-xl text-sm font-bold bg-red-100 text-red-800 border border-red-200">
                                    ${(spent - budgeted).toFixed(0)} over budget
                                </span>
                            ) : (
                                <span className="px-4 py-2 rounded-xl text-sm font-bold bg-green-100 text-green-800 border border-green-200">
                                    ${(budgeted - spent).toFixed(0)} remaining
                                </span>
                            )}
                            
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <List className="w-4 h-4" />
                                {entries.length > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full bg-green-500 text-white">
                                        {entries.length}
                                    </span>
                                )}
                                {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Expanded entries list */}
                        {isExpanded && (
                            <div className="space-y-2 pt-2 border-t">
                                {displayedEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 group"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{entry.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">${entry.amount.toFixed(2)}</span>
                                            <div className="hidden group-hover:flex items-center gap-1">
                                                <button
                                                    onClick={() => onUpdateEntry?.(entry.id, { name: entry.name, amount: entry.amount })}
                                                    className="p-1 rounded hover:bg-gray-200"
                                                >
                                                    <Pencil className="w-4 h-4 text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => onDeleteEntry?.(entry.id)}
                                                    className="p-1 rounded hover:bg-red-100"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {entries.length > 4 && (
                                    <button
                                        onClick={() => setShowAllEntries(!showAllEntries)}
                                        className="w-full py-2 text-sm font-medium text-green-600 hover:text-green-700"
                                    >
                                        {showAllEntries ? "Show less" : `Display all (${entries.length} entries)`}
                                    </button>
                                )}

                                {/* Add entry button */}
                                <button
                                    onClick={() => onAddEntry?.({ name: "New entry", amount: 0 })}
                                    className="w-full p-4 rounded-xl bg-green-50 border-2 border-dashed border-green-300 hover:border-green-400 hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Add Entry</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Simple Mode View (Original) */
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
                )}
            </CardContent>
        </Card>
    );
}