"use client";

import { Category, IncomeSource, SpendingItem } from "@/lib/types";
import { useCategories } from "./hooks/use-categories";
import { useRef, useState } from "react";
import { useIncome } from "./hooks/use-income";
import { useSpending } from "./hooks/use-spending";
import { SpendingCarousel, SpendingCarouselRef } from "./spending/spending-carousel";
import { LoadingSpinner } from "./loading-spinner";
import { Header } from "./header";
import { MonthPicker } from "./month-picker";
import { IncomeCard } from "./income/income-card";
import { SectionCard } from "./section-card";
import { CategoryRibbon } from "./category/category-ribbon";
import { filterActiveCategories } from "@/lib/filter-active-categories";
import { SpendingCard } from "./spending/spending-card";
import { TrendsCard } from "./trends/trends-card";
import { BudgetOverviewCard } from "./budget-overview/budget-overview";
import { SpendingItemEditPopin } from "./spending/popins/spending-item-edit-popin";
import { CategoryPopin } from "./category/popins/category-popin";
import { ManageCategoriesPopin } from "./category/popins/manage-categories-popin";
import { countCategoryEntries } from "@/lib/category-entry-counts";
import { IncomePopin } from "./income/popins/income-edit-popin";
import { IncomeDetailPopin } from "./income/popins/income-detail-popin";
import { StickyBudgetBar } from "./sticky-budget-bar";
import { Settings2 } from "lucide-react";

interface DashboardProps {
    initialIncomeSources: IncomeSource[],
    initialAllIncomeSources: IncomeSource[],
    initialCategories: Category[],
    initialSpendingData: Record<string, SpendingItem[]>,
    initialMonth: string,
    /** Entry totals per category id for months older than the loaded window (see lib/category-entry-counts). */
    preWindowEntryCounts?: Record<string, number>
}

export function Dashboard({initialIncomeSources, initialAllIncomeSources, initialCategories, initialSpendingData, initialMonth, preWindowEntryCounts = {}}: DashboardProps) {

    const [isSpendingExpanded, setIsSpendingExpanded] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const { categories, isLoading: categoriesLoading, addCategory, updateCategory, deleteCategory } = useCategories(initialCategories);
    const { spendingData, isLoading: spendingLoading, createSpending, updateSpending, deleteSpending, copySpendingToMonth, createEntry, updateEntry, deleteEntry } = useSpending(initialSpendingData);
    const { incomeSources, allIncomeSources, isLoading: incomeLoading, createIncome, updateIncome, deleteIncome, loadMonth } = useIncome(selectedMonth, initialIncomeSources, initialAllIncomeSources);

    const isLoading = categoriesLoading || spendingLoading || incomeLoading;

    const [isSpendingPopinOpen, setIsSpendingPopinOpen] = useState(false);
    const [editingSpendingItem, setEditingSpendingItem] = useState<SpendingItem | null>(null);
    const [spendingPopinKey, setSpendingPopinKey] = useState(0);
    const carouselRef = useRef<SpendingCarouselRef>(null);

    const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryPopinKey, setCategoryPopinKey] = useState(0);
    const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
    const [manageCategoriesKey, setManageCategoriesKey] = useState(0);

    const [isIncomePopinOpen, setIsIncomePopinOpen] = useState(false);
    const [editingIncomeSource, setEditingIncomeSource] = useState<IncomeSource | null>(null);
    const [isIncomeDetailOpen, setIsIncomeDetailOpen] = useState(false);
    const [viewingIncomeSource, setViewingIncomeSource] = useState<IncomeSource | null>(null);

    const [lastCreatedCategoryName, setLastCreatedCategoryName] = useState<string | null>(null);

    const categoryEntryCounts = countCategoryEntries(spendingData, preWindowEntryCounts);

    const currentSpendingItems = spendingData[selectedMonth] || [];
    const filteredSpendingItems = selectedCategory === "all"
        ? currentSpendingItems
        : currentSpendingItems.filter(item => item.category?.label === selectedCategory);
    const totalIncome = incomeSources.reduce((sum, i) => sum + i.amount, 0);
    const [incomePopinKey, setIncomePopinKey] = useState(0);

    const historicalData = Object.entries(spendingData)
        .filter(([month]) => month <= selectedMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, spending]) => ({ month, spending }));

    const incomeByMonth = historicalData.map(monthData => {
        const monthIncome = allIncomeSources
        .filter(source => source.month === monthData.month)
        .reduce((sum, source) => sum + source.amount, 0);

        const date = new Date(monthData.month + "-01");
        return {
        label: date.toLocaleDateString("en-US", { month: "short" }),
        value: monthIncome,
        };
    });

    const handleDeleteCategory = async (id: string) => {
        const deleted = categories.find(c => c.id === id);
        const success = await deleteCategory(id);
        if (success && deleted && selectedCategory === deleted.label) {
        setSelectedCategory("all");
        }
    };

    const handleOpenAddIncome = () => {
        setEditingIncomeSource(null);
        setIncomePopinKey(prev => prev + 1)
        setIsIncomePopinOpen(true);
    };

    const handleSelectIncome = (id: string) => {
        const income = incomeSources.find(i => i.id === id);
        if (income) {
        setViewingIncomeSource(income);
        setIsIncomeDetailOpen(true);
        }
    };

    const handleEditFromDetail = () => {
        setIsIncomeDetailOpen(false);
        if (viewingIncomeSource) {
        setEditingIncomeSource(viewingIncomeSource);
        setTimeout(() => setIsIncomePopinOpen(true), 0);
        }
    };

    const handleSaveIncome = async (data: Omit<IncomeSource, 'id' | 'month'>) => {
        setIsIncomePopinOpen(false);
        setEditingIncomeSource(null);

        if (editingIncomeSource) {
            await updateIncome(editingIncomeSource.id, data);
        } else {
            await createIncome(selectedMonth, data);
        }
        
    };

    const handleDeleteIncome = async () => {
        if (!editingIncomeSource) return;

        setIsIncomePopinOpen(false);
        setEditingIncomeSource(null);
        await deleteIncome(editingIncomeSource.id);
    };

    const handleMonthChange = async (newMonth: string) => {
        setSelectedMonth(newMonth);

        if (!spendingData[newMonth]) {
        const sortedMonths = Object.keys(spendingData).sort();
        const previousMonths = sortedMonths.filter(m => m < newMonth);
        if (previousMonths.length > 0) {
            await copySpendingToMonth(previousMonths[previousMonths.length - 1], newMonth);
        }
        }

        await loadMonth(newMonth);
    };

    // Remount via key on every open so the popin's search state starts fresh.
    const handleOpenManageCategories = () => {
        setManageCategoriesKey(prev => prev + 1);
        setIsManageCategoriesOpen(true);
    };

    const handleOpenCreateCategory = () => {
        setEditingCategory(null);
        setCategoryPopinKey(prev => prev + 1);
        setIsCategoryPopinOpen(true);
    };

    const handleOpenCreateSpending = () => {
        setEditingSpendingItem(null);
        setSpendingPopinKey(prev => prev + 1);
        setIsSpendingPopinOpen(true);
    };

    const handleDeleteSpending = async (id: string) => {
        await deleteSpending(selectedMonth, id);
    };

    if (isLoading) {
        return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto flex items-center justify-center min-h-screen">
            <LoadingSpinner />
        </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-28 sm:pb-24">
        <Header
            title="Budget Planner"
            legendLabel=""
        />

        <div className="mb-4">
            <MonthPicker
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            />
        </div>

        <IncomeCard
            incomes={incomeSources}
            onAdd={handleOpenAddIncome}
            onSelect={handleSelectIncome}
        />

        <SectionCard className="mt-6">
            <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-semibold" style={{ color: "#1D1D1F" }}>Spending</p>
            <div className="flex items-center gap-2">
                <p className="text-xs tabular-nums" style={{ color: "#6E6E73" }}>
                {filteredSpendingItems.length} item{filteredSpendingItems.length !== 1 ? "s" : ""}
                </p>
                <button
                onClick={handleOpenManageCategories}
                aria-label="Manage categories"
                className="sm:hidden w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                style={{ backgroundColor: "#F5F5F7", color: "#1D1D1F" }}
                >
                <Settings2 className="w-4 h-4" strokeWidth={1.9} />
                </button>
                <button
                onClick={handleOpenCreateSpending}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
                style={{ backgroundColor: "#34C759" }}
                >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                </button>
            </div>
            </div>

            <div className="mb-4">
            <CategoryRibbon
                categories={categories.map(c => ({ name: c.label, icon: c.icon, color: c.color }))}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
                onAddCategory={handleOpenCreateCategory}
                onManage={handleOpenManageCategories}
            />
            </div>

            <SpendingCarousel ref={carouselRef} key={selectedCategory} itemCount={filteredSpendingItems.length} onAdd={handleOpenCreateSpending}>
            {filteredSpendingItems.map((item) => (
                <div key={item.id} className="w-full flex-shrink-0 snap-center snap-always overflow-hidden px-2">
                <SpendingCard
                    isExpanded={isSpendingExpanded}
                    onToggleExpand={() => setIsSpendingExpanded(prev => !prev)}
                    spendingName={item.name}
                    spendingItemIcon={item.icon}
                    categoryName={item.category?.label ?? "Uncategorized"}
                    spendingCategoryColor={item.category?.color ?? "#6E6E73"}
                    budgetNumber={item.budgeted}
                    startDate={item.startDate ? new Date(item.startDate).toISOString().split("T")[0] : ""}
                    endDate={item.endDate ? new Date(item.endDate).toISOString().split("T")[0] : undefined}
                    note={item.note ?? undefined}
                    entries={(item.entries || []).map((e) => ({
                    id: e.id,
                    name: e.name,
                    date: new Date(e.date).toISOString().split("T")[0],
                    amount: e.amount,
                    direction: e.direction,
                    receipt: e.receiptUrl ?? null,
                    link: e.link ?? null,
                    }))}
                    categories={categories.map((c) => ({
                    name: c.label,
                    icon: c.icon,
                    color: c.color,
                    }))}
                    onItemUpdate={async (data) => {
                    const cat = categories.find((c) => c.label === data.category);
                    if (!cat) return;
                    await updateSpending(selectedMonth, item.id, {
                        name: data.name,
                        icon: data.icon,
                        categoryId: cat.id,
                        budgeted: data.budget,
                        startDate: data.startDate,
                        endDate: data.endDate || null,
                        note: data.note || null,
                    }, {
                        ...item,
                        name: data.name,
                        icon: data.icon,
                        categoryId: cat.id,
                        category: cat,
                        budgeted: data.budget,
                        startDate: data.startDate,
                        endDate: data.endDate || null,
                        note: data.note || null,
                    });
                    }}
                    onItemDelete={() => handleDeleteSpending(item.id)}
                    onEntryCreate={async (data) => {
                    await createEntry(selectedMonth, item.id, {
                        name: data.name,
                        amount: data.amount,
                        direction: data.direction,
                        date: data.date,
                        receiptUrl: data.receipt ?? undefined,
                        link: data.link ?? undefined,
                    });
                    }}
                    onEntryUpdate={async (entryId, data) => {
                    await updateEntry(selectedMonth, item.id, entryId, {
                        name: data.name,
                        amount: data.amount,
                        direction: data.direction,
                        date: data.date,
                        receiptUrl: data.receipt ?? undefined,
                        link: data.link ?? undefined,
                    });
                    }}
                    onEntryDelete={async (entryId) => {
                    await deleteEntry(selectedMonth, item.id, entryId);
                    }}
                    onCreateCategory={async (data) => {
                    await addCategory(data.name, data.icon, data.color);
                    }}
                />
                </div>
            ))}
            </SpendingCarousel>
        </SectionCard>

        <div className="mt-6 space-y-4">
            <TrendsCard
            spendingData={historicalData.map(monthData => {
                const date = new Date(monthData.month + "-01");
                return {
                label: date.toLocaleDateString("en-US", { month: "short" }),
                value: monthData.spending.reduce((sum, item) => sum + item.spent, 0),
                };
            })}
            incomeData={incomeByMonth}
            categoryData={Object.fromEntries(
                categories
                .map(cat => [
                    cat.label,
                    historicalData.map(monthData => {
                    const date = new Date(monthData.month + "-01");
                    return {
                        label: date.toLocaleDateString("en-US", { month: "short" }),
                        value: monthData.spending
                        .filter(item => item.category?.label === cat.label)
                        .reduce((sum, item) => sum + item.spent, 0),
                    };
                    }),
                ])
                .filter(([, data]) => (data as { label: string; value: number }[]).some(d => d.value > 0))
            )}
            categories={categories.map(c => ({ name: c.label, icon: c.icon, color: c.color }))}
            />

            <BudgetOverviewCard
            totalIncome={totalIncome}
            categories={filterActiveCategories({
                categories,
                spendingItems: currentSpendingItems,
                selectedMonth
            })}
            spendingItems={currentSpendingItems}
            />
        </div>

        <SpendingItemEditPopin
            autoSelectCategory={lastCreatedCategoryName}
            key={editingSpendingItem?.id ?? `create-spending-${spendingPopinKey}`}
            isOpen={isSpendingPopinOpen}
            onClose={() => {
            setIsSpendingPopinOpen(false);
            setEditingSpendingItem(null);
            setLastCreatedCategoryName(null);
            }}

            onSave={async (data) => {
                const category = categories.find(c => c.label === data.category);
                if (!category) return;

                const currentEditing = editingSpendingItem;
                setIsSpendingPopinOpen(false);
                setEditingSpendingItem(null);

                if (currentEditing) {
                    await updateSpending(selectedMonth, currentEditing.id, {
                        name: data.name,
                        icon: data.icon,
                        categoryId: category.id,
                        budgeted: data.budget,
                        startDate: data.startDate,
                        endDate: data.endDate || null,
                        note: data.note || null,
                    }, {
                        ...currentEditing,
                        name: data.name,
                        icon: data.icon,
                        categoryId: category.id,
                        category,
                        budgeted: data.budget,
                        startDate: data.startDate,
                        endDate: data.endDate || null,
                        note: data.note || null,
                    });
                } else {
                    const real = await createSpending(selectedMonth, {
                        name: data.name,
                        icon: data.icon,
                        categoryId: category.id,
                        month: selectedMonth,
                        budgeted: data.budget,
                        startDate: data.startDate,
                        endDate: data.endDate || null,
                        note: data.note || null,
                    }, category);
                    if (real) {
                        const items = spendingData[selectedMonth] || [];
                        setTimeout(() => carouselRef.current?.scrollToIndex(items.length - 1), 100);
                    }
                }
            }}

            onDelete={editingSpendingItem ? async () => {
                const id = editingSpendingItem.id;
                setIsSpendingPopinOpen(false);
                setEditingSpendingItem(null);
                await handleDeleteSpending(id);
            } : undefined}

            onCreateCategory={handleOpenCreateCategory}

            mode={editingSpendingItem ? "edit" : "create"}
            categories={categories.map(c => ({ name: c.label, icon: c.icon, color: c.color }))}
            initialName={editingSpendingItem?.name ?? ""}
            initialIcon={editingSpendingItem?.icon ?? ""}
            initialCategory={editingSpendingItem?.category?.label ?? ""}
            initialBudget={editingSpendingItem?.budgeted ?? 0}
            initialStartDate={editingSpendingItem?.startDate ? new Date(editingSpendingItem.startDate).toISOString().split("T")[0] : ""}
            initialEndDate={editingSpendingItem?.endDate ? new Date(editingSpendingItem.endDate).toISOString().split("T")[0] : undefined}
            initialNote={editingSpendingItem?.note ?? ""}
        />

        <ManageCategoriesPopin
            key={`manage-categories-${manageCategoriesKey}`}
            isOpen={isManageCategoriesOpen}
            onClose={() => setIsManageCategoriesOpen(false)}
            categories={categories}
            entryCounts={categoryEntryCounts}
            onEditCategory={() => {}}
            onDeleteCategory={() => {}}
            onNewCategory={handleOpenCreateCategory}
        />

        <CategoryPopin
            key={editingCategory?.id ?? `create-category-${categoryPopinKey}`}
            zIndex={60}
            isOpen={isCategoryPopinOpen}
            onClose={() => {
            setIsCategoryPopinOpen(false);
            setEditingCategory(null);
            }}

            onSave={async (data) => {
                const currentEditing = editingCategory;
                setIsCategoryPopinOpen(false);
                setEditingCategory(null);
                if (currentEditing) {
                    await updateCategory(currentEditing.id, data.name, data.icon, data.color);
                } else {
                    const created = await addCategory(data.name, data.icon, data.color);
                    if (created) setLastCreatedCategoryName(data.name);
                }
            }}

            onDelete={editingCategory ? async () => {
                const id = editingCategory.id;
                setIsCategoryPopinOpen(false);
                setEditingCategory(null);
                await handleDeleteCategory(id);
            } : undefined}

            mode={editingCategory ? "edit" : "create"}
            initialName={editingCategory?.label ?? ""}
            initialIcon={editingCategory?.icon ?? "shopping-cart"}
            initialColor={editingCategory?.color ?? "#007AFF"}
        />

        <IncomePopin
            key={editingIncomeSource?.id ?? `add-${incomePopinKey}`}
            isOpen={isIncomePopinOpen}
            onClose={() => {
            setIsIncomePopinOpen(false);
            setEditingIncomeSource(null);
            }}
            onSave={handleSaveIncome}
            onDelete={handleDeleteIncome}
            mode={editingIncomeSource ? 'edit' : 'add'}
            initialData={editingIncomeSource}
        />

        <IncomeDetailPopin
            isOpen={isIncomeDetailOpen}
            onClose={() => {
            setIsIncomeDetailOpen(false);
            setViewingIncomeSource(null);
            }}
            onEdit={handleEditFromDetail}
            income={viewingIncomeSource}
        />

        <StickyBudgetBar
            totalIncome={totalIncome}
            totalBudgeted={currentSpendingItems.reduce((sum, item) => sum + item.budgeted, 0)}
            totalSpent={currentSpendingItems.reduce((sum, item) => sum + item.spent, 0)}
        />
        </div>
    );
}