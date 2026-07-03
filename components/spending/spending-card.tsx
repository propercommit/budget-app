"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { applyEntry } from "@/lib/spending/math";
import { SpendingCardCollapsed } from "./spending-card-collapsed";
import { SpendingCardExpanded, SpendingEntry } from "./spending-card-expanded";
import { SpendingItemDetailPopin } from "./popins/spending-item-detail-popin";
import { SpendingItemEditPopin } from "./popins/spending-item-edit-popin";
import { EntryDetailPopin } from "./popins/spending-entry-detail-popin";
import { EntryEditPopin, EntrySavePayload } from "./popins/spending-entry-edit-popin";
import { CategoryPopin } from "../category/popins/category-popin";

interface Category {
    name: string;
    icon: string;
    color: string;
}

interface SpendingCardProps {
    spendingName: string;
    spendingItemIcon: string;
    categoryName: string;
    spendingCategoryColor: string;
    budgetNumber: number;
    startDate: string;
    endDate?: string;
    note?: string;
    entries: SpendingEntry[];
    categories: Category[];
    onItemUpdate: (data: {
        name: string;
        icon: string;
        category: string;
        categoryColor: string;
        budget: number;
        startDate: string;
        endDate: string;
        note: string;
    }) => void;
    onItemDelete: () => void;
    onEntryCreate: (data: EntrySavePayload) => void;
    onEntryUpdate: (entryId: string, data: EntrySavePayload) => void;
    onEntryDelete: (entryId: string) => void;
    onCreateCategory: (data: { name: string; icon: string; color: string }) => void;
    isExpanded: boolean;
    onToggleExpand: ()=> void;
}

export function SpendingCard({
    spendingName,
    spendingItemIcon,
    categoryName,
    spendingCategoryColor,
    budgetNumber,
    startDate,
    endDate,
    note,
    entries,
    categories,
    isExpanded,
    onItemUpdate,
    onItemDelete,
    onEntryCreate,
    onEntryUpdate,
    onEntryDelete,
    onCreateCategory,
    onToggleExpand,
}: SpendingCardProps) {

    // Popin visibility
    const [showItemDetail, setShowItemDetail] = useState(false);
    const [showItemEdit, setShowItemEdit] = useState(false);
    const [showEntryDetail, setShowEntryDetail] = useState(false);
    const [showEntryEdit, setShowEntryEdit] = useState(false);
    const [showCategoryPopin, setShowCategoryPopin] = useState(false);

    // Entry state
    const [selectedEntry, setSelectedEntry] = useState<SpendingEntry | null>(null);
    const [entryMode, setEntryMode] = useState<"create" | "edit">("create");

    // Snapshot of the list as displayed when the detail popin opened — the
    // popin pages through these siblings (swipe / arrow keys).
    const [detailNavEntries, setDetailNavEntries] = useState<SpendingEntry[]>([]);

    // Calculations
    const totalSpent = entries.reduce((sum, entry) => applyEntry(sum, entry), 0);
    const spendingEntries = entries.length;

    const [categoryPopinKey, setCategoryPopinKey] = useState(0);

    // === Handlers ===

    const handleItemDetailClick = () => {
        setShowItemDetail(true);
    };

    const handleItemDetailToEdit = () => {
        setShowItemDetail(false);
        setShowItemEdit(true);
    };

    const handleItemSave = (data: Parameters<typeof onItemUpdate>[0]) => {
        onItemUpdate(data);
        setShowItemEdit(false);
    };

    const handleItemDelete = () => {
        onItemDelete();
        setShowItemEdit(false);
    };

    const handleEntryClick = (entry: SpendingEntry, visibleEntries: SpendingEntry[]) => {
        setSelectedEntry(entry);
        setDetailNavEntries(visibleEntries);
        setShowEntryDetail(true);
    };

    const handleEntryDetailToEdit = () => {
        setShowEntryDetail(false);
        setEntryMode("edit");
        setShowEntryEdit(true);
    };

    const handleAddEntry = () => {
        setSelectedEntry(null);
        setEntryMode("create");
        setShowEntryEdit(true);
    };

    const handleEntrySave = (data: EntrySavePayload) => {
        if (entryMode === "create") {
            onEntryCreate(data);
        } else if (selectedEntry) {
            onEntryUpdate(selectedEntry.id, data);
        }
        setShowEntryEdit(false);
        setSelectedEntry(null);
    };

    const handleEntryDelete = () => {
        if (selectedEntry) {
            onEntryDelete(selectedEntry.id);
        }
        setShowEntryEdit(false);
        setSelectedEntry(null);
    };

    const handleCreateCategory = (data: { name: string; icon: string; color: string }) => {
        onCreateCategory(data);
        setShowCategoryPopin(false);
    };

    // === Shared props ===

    const sharedCardProps = {
        spendingName,
        categoryName,
        budgetNumber,
        totalSpent,
        spendingEntries,
        spendingItemIcon,
        spendingCategoryColor,
    };

    // Check if any popin is open
    const hasOpenPopin = showItemDetail || showItemEdit || showEntryDetail || showEntryEdit || showCategoryPopin;

    return (
        <>
            {/* Card */}
            {isExpanded ? (
                <SpendingCardExpanded
                    {...sharedCardProps}
                    entries={entries}
                    onCollapse={onToggleExpand}
                    onEntryClick={handleEntryClick}
                    onAddEntry={handleAddEntry}
                    onItemDetailClick={handleItemDetailClick}
                />
            ) : (
                <SpendingCardCollapsed
                    {...sharedCardProps}
                    onExpand={onToggleExpand}
                />
            )}

            {/* Popins — portaled to body to escape overflow containers */}
            {hasOpenPopin && typeof window !== "undefined" && createPortal(
                <>
                    <SpendingItemDetailPopin
                        isOpen={showItemDetail}
                        onClose={() => setShowItemDetail(false)}
                        onEdit={handleItemDetailToEdit}
                        spendingName={spendingName}
                        spendingItemIcon={spendingItemIcon}
                        categoryName={categoryName}
                        spendingCategoryColor={spendingCategoryColor}
                        budgetNumber={budgetNumber}
                        totalSpent={totalSpent}
                        entriesCount={spendingEntries}
                        startDate={startDate}
                        endDate={endDate}
                        note={note}
                    />

                    <SpendingItemEditPopin
                        isOpen={showItemEdit}
                        onClose={() => setShowItemEdit(false)}
                        onSave={handleItemSave}
                        onDelete={handleItemDelete}
                        onCreateCategory={() => {
                            setCategoryPopinKey(prev => prev + 1);
                            setShowCategoryPopin(true);
                            }}
                        mode="edit"
                        categories={categories}
                        initialName={spendingName}
                        initialIcon={spendingItemIcon}
                        initialCategory={categoryName}
                        initialBudget={budgetNumber}
                        initialStartDate={startDate}
                        initialEndDate={endDate}
                        initialNote={note}
                    />

                    <EntryDetailPopin
                        isOpen={showEntryDetail}
                        onClose={() => { setShowEntryDetail(false); setSelectedEntry(null); }}
                        onEdit={handleEntryDetailToEdit}
                        entry={selectedEntry}
                        entries={detailNavEntries}
                        onNavigate={setSelectedEntry}
                        spendingName={spendingName}
                        spendingItemIcon={spendingItemIcon}
                        spendingCategoryColor={spendingCategoryColor}
                    />

                    <EntryEditPopin
                        key={selectedEntry?.id ?? "create"}
                        isOpen={showEntryEdit}
                        onClose={() => { setShowEntryEdit(false); setSelectedEntry(null); }}
                        onSave={handleEntrySave}
                        onDelete={entryMode === "edit" ? handleEntryDelete : undefined}
                        mode={entryMode}
                        entry={selectedEntry}
                        spendingName={spendingName}
                        spendingItemIcon={spendingItemIcon}
                        spendingCategoryName={categoryName}
                        spendingCategoryColor={spendingCategoryColor}
                    />

                    <CategoryPopin
                        key={categoryPopinKey}
                        isOpen={showCategoryPopin}
                        onClose={() => setShowCategoryPopin(false)}
                        onSave={handleCreateCategory}
                        mode="create"
                    />
                </>,
                document.body
            )}
        </>
    );
}