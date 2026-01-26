import { useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import { InputSlider } from "./input-slider";
import { hexToLightColor } from "@/lib/color-utils";
import { iconMap } from "@/lib/icon-map";
import { Chip } from "./Chip";
import { SpendingEntry } from "@/lib/types";
import { ChevronDown, ChevronUp, Eye, List, Plus, Search } from "lucide-react";
import { EntryPopin } from "./entry-popin";
import { Input } from "./ui/input";
import { EntryViewPopin } from "./entry-view-popin";

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

type SortOption = "newest" | "oldest" | "highest" | "lowest";

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
    const [isEntryPopinOpen, setIsEntryEditPopinOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<SpendingEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [isViewPopinOpen, setIsViewPopinOpen] = useState(false);
    const [viewingEntry, setViewingEntry] = useState<SpendingEntry | null>(null);

    const handleCategoryClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onEditCategory) {
            onEditCategory();
        }
    };

    const handleOpenCreateEntry = () => {
        setEditingEntry(null);
        setIsEntryEditPopinOpen(true);
    };

    const handleOpenEditEntry = (entry: SpendingEntry) => {
        setEditingEntry(entry);
        setIsEntryEditPopinOpen(true);
    };

    const handleOpenViewEntry = (entry: SpendingEntry) => {
        setIsViewPopinOpen(true);
        setViewingEntry(entry);
    };

    const handleEditFromView = () => {
        setIsViewPopinOpen(false);
        setEditingEntry(viewingEntry);
        setIsEntryEditPopinOpen(true);
    };

    const handleDeleteFromView = () => {
        if (viewingEntry !== null) {
            onDeleteEntry?.(viewingEntry.id);
        }
    };
    // Filter entries by search query
    const filteredEntries = entries.filter(entry =>
        entry.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort entries
    const sortedEntries = [...filteredEntries].sort((a, b) => {
        switch (sortBy) {
            case "newest":
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            case "oldest":
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            case "highest":
                return b.amount - a.amount;
            case "lowest":
                return a.amount - b.amount;
            default:
                return 0;
        }
    });

    const displayedEntries = showAllEntries ? sortedEntries : sortedEntries.slice(0, 4);

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
                                {/* Search and Sort */}
                                <div className="flex gap-2 pb-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Search entries..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                                        className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                                    >
                                        <option value="newest">Newest first</option>
                                        <option value="oldest">Oldest first</option>
                                        <option value="highest">Highest amount</option>
                                        <option value="lowest">Lowest amount</option>
                                    </select>
                                </div>

                                {displayedEntries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 group cursor-pointer hover:bg-gray-100"
                                        onClick={() => handleOpenViewEntry(entry)}
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{entry.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">${entry.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))}

                                {sortedEntries.length === 0 && searchQuery !== "" && (
                                    <div className="text-center py-4 text-gray-500 text-sm">
                                        No entries match &quot;{searchQuery}&quot;
                                    </div>
                                )}

                                {sortedEntries.length > 4 && (
                                    <button
                                        onClick={() => setShowAllEntries(!showAllEntries)}
                                        className="w-full py-2 text-sm font-medium text-green-600 hover:text-green-700"
                                    >
                                        {showAllEntries ? "Show less" : `Display all (${sortedEntries.length} entries)`}
                                    </button>
                                )}

                                {/* Add entry button */}
                                <button
                                    onClick={handleOpenCreateEntry}
                                    className="w-full p-4 rounded-xl bg-green-50 border-2 border-dashed border-green-300 hover:border-green-400 hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Add Entry</span>
                                </button>
                            </div>
                        )}

                        {/* Entry Edit Popin */}
                        <EntryPopin
                            key={`edit-${editingEntry?.id ?? "create"}`}
                            isOpen={isEntryPopinOpen}
                            onOpenChange={setIsEntryEditPopinOpen}
                            onAddEntry={onAddEntry ?? (() => {})}
                            onUpdateEntry={onUpdateEntry ?? (() => {})}
                            onDeleteEntry={onDeleteEntry ?? (() => {})}
                            mode={editingEntry !== null ? "edit" : "create"}
                            editingEntry={editingEntry}
                        />

                        {/* Entry View Popin*/}
                        <EntryViewPopin
                            key={`view-${viewingEntry?.id ?? "none"}`}
                            isOpen={isViewPopinOpen}
                            onOpenChange={setIsViewPopinOpen}
                            entry={viewingEntry}
                            onEdit={handleEditFromView}
                            onDelete={handleDeleteFromView}
                        />
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