"use client";

import { useState } from "react";
import { SpendingCardCollapsed } from "./spending-card-collapsed";
import { SpendingCardExpanded, SpendingEntry } from "./spending-card-expanded";
import { SpendingItemDetailPopin } from "./popins/spending-item-detail-popin";
import { SpendingItemEditPopin } from "./popins/spending-item-edit-popin";
import { EntryDetailPopin } from "./popins/spending-entry-detail-popin";
import { EntryEditPopin } from "./popins/spending-entry-edit-popin";
import { CategoryPopin } from "./popins/spending-category-popin";

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
    onEntryCreate: (data: { name: string; amount: number; date: string; receipt: string | null; link: string | null }) => void;
    onEntryUpdate: (entryId: string, data: { name: string; amount: number; date: string; receipt: string | null; link: string | null }) => void;
    onEntryDelete: (entryId: string) => void;
    onCreateCategory: (data: { name: string; icon: string; color: string }) => void;
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
    onItemUpdate,
    onItemDelete,
    onEntryCreate,
    onEntryUpdate,
    onEntryDelete,
    onCreateCategory,
}: SpendingCardProps) {
    // Card state
    const [isExpanded, setIsExpanded] = useState(false);

    // Popin visibility
    const [showItemDetail, setShowItemDetail] = useState(false);
    const [showItemEdit, setShowItemEdit] = useState(false);
    const [showEntryDetail, setShowEntryDetail] = useState(false);
    const [showEntryEdit, setShowEntryEdit] = useState(false);
    const [showCategoryPopin, setShowCategoryPopin] = useState(false);

    // Entry state
    const [selectedEntry, setSelectedEntry] = useState<SpendingEntry | null>(null);
    const [entryMode, setEntryMode] = useState<"create" | "edit">("create");

    // Calculations
    const totalSpent = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const spendingEntries = entries.length;

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

    const handleEntryClick = (entry: SpendingEntry) => {
        setSelectedEntry(entry);
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

    const handleEntrySave = (data: { name: string; amount: number; date: string; receipt: string | null; link: string | null }) => {
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

    return (
        <>
            {/* Card */}
            {isExpanded ? (
                <SpendingCardExpanded
                    {...sharedCardProps}
                    entries={entries}
                    onCollapse={() => setIsExpanded(false)}
                    onEntryClick={handleEntryClick}
                    onAddEntry={handleAddEntry}
                    onItemDetailClick={handleItemDetailClick}
                />
            ) : (
                <SpendingCardCollapsed
                    {...sharedCardProps}
                    onExpand={() => setIsExpanded(true)}
                />
            )}

            {/* Spending Item Detail Popin */}
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

            {/* Spending Item Edit Popin */}
            <SpendingItemEditPopin
                isOpen={showItemEdit}
                onClose={() => setShowItemEdit(false)}
                onSave={handleItemSave}
                onDelete={handleItemDelete}
                onCreateCategory={() => setShowCategoryPopin(true)}
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

            {/* Entry Detail Popin */}
            <EntryDetailPopin
                isOpen={showEntryDetail}
                onClose={() => { setShowEntryDetail(false); setSelectedEntry(null); }}
                onEdit={handleEntryDetailToEdit}
                entry={selectedEntry}
                spendingName={spendingName}
                spendingItemIcon={spendingItemIcon}
                spendingCategoryColor={spendingCategoryColor}
            />

            {/* Entry Edit Popin */}
            <EntryEditPopin
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

            {/* Category Create Popin */}
            <CategoryPopin
                isOpen={showCategoryPopin}
                onClose={() => setShowCategoryPopin(false)}
                onSave={handleCreateCategory}
                mode="create"
            />
        </>
    );
}