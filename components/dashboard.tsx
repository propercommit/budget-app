"use client";

import { BudgetSeriesSummary, Category, IncomeSource, SpendingItem } from "@/lib/types";
import { getSeries } from "@/lib/api";
import { useCategories } from "./hooks/use-categories";
import { useEffect, useRef, useState } from "react";
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
import { DeleteCategoryDialog } from "./category/popins/delete-category-dialog";
import { countCategoryEntries } from "@/lib/category-entry-counts";
import { IncomePopin } from "./income/popins/income-edit-popin";
import { IncomeDetailPopin } from "./income/popins/income-detail-popin";
import { StickyBudgetBar } from "./sticky-budget-bar";
import { WelcomeBanner } from "./welcome-banner";
import { hasAccountData } from "@/lib/first-run";
import { Plus, Settings2 } from "lucide-react";

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
    const { spendingData, isLoading: spendingLoading, createSpending, updateSpending, deleteSpending, materializeMonth, createEntry, updateEntry, deleteEntry, removeItemsByCategory, updateCategoryOnItems } = useSpending(initialSpendingData);
    const { incomeSources, allIncomeSources, isLoading: incomeLoading, createIncome, updateIncome, deleteIncome, loadMonth } = useIncome(selectedMonth, initialIncomeSources, initialAllIncomeSources);

    const isLoading = categoriesLoading || spendingLoading || incomeLoading;

    const [isSpendingPopinOpen, setIsSpendingPopinOpen] = useState(false);
    const [editingSpendingItem, setEditingSpendingItem] = useState<SpendingItem | null>(null);
    const [spendingPopinKey, setSpendingPopinKey] = useState(0);
    const [seriesOptions, setSeriesOptions] = useState<BudgetSeriesSummary[]>([]);
    const carouselRef = useRef<SpendingCarouselRef>(null);

    const [isCategoryPopinOpen, setIsCategoryPopinOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryPopinKey, setCategoryPopinKey] = useState(0);
    const [isManageCategoriesPopinOpen, setIsManageCategoriesPopinOpen] = useState(false);
    const [manageCategoriesPopinKey, setManageCategoriesPopinKey] = useState(0);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

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

    // First-run = no data anywhere in the loaded window. Drives the welcome
    // banner now and the trends/budget-overview empty states with it.
    const isFirstRun = hasAccountData(spendingData, incomeSources, allIncomeSources) === false;

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

    const handleSaveCategory = async (data: { name: string; icon: string; color: string }) => {

        const currentEditing = editingCategory;
        setIsCategoryPopinOpen(false);
        setEditingCategory(null);

        if (currentEditing !== null) {
            const success = await updateCategory(currentEditing.id, data.name, data.icon, data.color);

            if (success) {
                // Items embed a category snapshot — refresh it so the cards,
                // label filter and trends don't render stale.
                updateCategoryOnItems({ id: currentEditing.id, label: data.name, icon: data.icon, color: data.color });

                // The filter holds the label string — remap it on rename so
                // the selection doesn't strand.
                if (selectedCategory === currentEditing.label) setSelectedCategory(data.name);
            }
        } else {
            const created = await addCategory(data.name, data.icon, data.color);

            if (created !== null) setLastCreatedCategoryName(data.name);
        }
    };

    const handleDeleteCategory = async (category: Category) => {

        const success = await deleteCategory(category.id);

        if (!success) return;

        // Mirror the DB cascade client-side: the category's items (and their
        // entries) are gone across all months, so trends/overview/carousel
        // must not keep rendering them.
        removeItemsByCategory(category.id);

        if (selectedCategory === category.label) setSelectedCategory("all");
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

    // Every month open materializes: recurring series missing an incarnation
    // get one server-side (idempotent), so even a partially populated month
    // receives the rest of the template.
    const handleMonthChange = async (newMonth: string) => {
        setSelectedMonth(newMonth);

        await materializeMonth(newMonth);

        await loadMonth(newMonth);
    };

    // The ISR page render doesn't materialize, so a series toggled recurring
    // after the last revalidation would be missing from the initial month
    // until a navigation — this mount pass closes that gap.
    useEffect(() => {
        void materializeMonth(initialMonth);
    }, [materializeMonth, initialMonth]);

    // Remount via key on every open so the popin's search state starts fresh.
    const handleOpenManageCategories = () => {
        setManageCategoriesPopinKey(prev => prev + 1);
        setIsManageCategoriesPopinOpen(true);
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

        // One fetch per open feeds the typeahead (never per keystroke). A
        // failure just means no suggestion rows — creating still works, with
        // the structured 409s as the server-side safety net.
        getSeries()
            .then((series: BudgetSeriesSummary[]) => setSeriesOptions(series))
            .catch((error) => console.error("Failed to load series list:", error));
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

        {isFirstRun && <WelcomeBanner />}

        <IncomeCard
            incomes={incomeSources}
            onAdd={handleOpenAddIncome}
            onSelect={handleSelectIncome}
        />

        <SectionCard className="mt-6">
            <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm font-semibold text-foreground">Spending</p>
            {/* Mobile: both actions are 44px HIG touch targets with a wider
                gap so adjacent taps don't land on the wrong button. */}
            <div className="flex items-center gap-3 sm:gap-2">
                <p className="text-xs tabular-nums text-muted-foreground">
                {filteredSpendingItems.length} item{filteredSpendingItems.length !== 1 ? "s" : ""}
                </p>
                <button
                onClick={handleOpenManageCategories}
                aria-label="Manage categories"
                className="sm:hidden w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 bg-muted text-foreground"
                >
                <Settings2 className="w-5 h-5" strokeWidth={1.9} />
                </button>
                <button
                onClick={handleOpenCreateSpending}
                aria-label="New spending item"
                className="w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-2.5 rounded-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary-hover active:bg-primary-active shadow-[var(--shadow-btn-icon)] transition-all duration-200 active:scale-95"
                >
                <Plus className="w-5 h-5 sm:w-4 sm:h-4" strokeWidth={2.5} />
                <span className="hidden sm:inline">Spending</span>
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
                    recurring={item.recurring}
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
                        recurring: data.recurring,
                        budgeted: data.budget,
                        note: data.note || null,
                    }, {
                        ...item,
                        name: data.name,
                        icon: data.icon,
                        categoryId: cat.id,
                        category: cat,
                        recurring: data.recurring,
                        budgeted: data.budget,
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

                if (currentEditing) {
                    setIsSpendingPopinOpen(false);
                    setEditingSpendingItem(null);

                    await updateSpending(selectedMonth, currentEditing.id, {
                        name: data.name,
                        icon: data.icon,
                        categoryId: category.id,
                        recurring: data.recurring,
                        budgeted: data.budget,
                        note: data.note || null,
                    }, {
                        ...currentEditing,
                        name: data.name,
                        icon: data.icon,
                        categoryId: category.id,
                        category,
                        recurring: data.recurring,
                        budgeted: data.budget,
                        note: data.note || null,
                    });
                    return;
                }

                // Create/resume: the popin stays open until we know the server
                // didn't answer with a series conflict — on conflict it shows
                // the inline state and refocuses the name field itself.
                const real = await createSpending(selectedMonth, {
                    seriesId: data.seriesId,
                    name: data.name,
                    icon: data.icon,
                    categoryId: category.id,
                    recurring: data.recurring,
                    month: selectedMonth,
                    budgeted: data.budget,
                    note: data.note || null,
                }, category);

                if (real === "series_dormant" || real === "series_not_in_month" || real === "series_active_this_month") return real;

                setIsSpendingPopinOpen(false);
                setEditingSpendingItem(null);
                setLastCreatedCategoryName(null);

                if (real) {
                    const items = spendingData[selectedMonth] || [];
                    setTimeout(() => carouselRef.current?.scrollToIndex(items.length - 1), 100);
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
            seriesOptions={seriesOptions}
            activeSeriesIds={currentSpendingItems.map(item => item.seriesId)}
            selectedMonth={selectedMonth}
            initialName={editingSpendingItem?.name ?? ""}
            initialIcon={editingSpendingItem?.icon ?? ""}
            initialCategory={editingSpendingItem?.category?.label ?? ""}
            initialBudget={editingSpendingItem?.budgeted ?? 0}
            initialRecurring={editingSpendingItem?.recurring ?? true}
            initialNote={editingSpendingItem?.note ?? ""}
        />

        <ManageCategoriesPopin
            key={`manage-categories-${manageCategoriesPopinKey}`}
            isOpen={isManageCategoriesPopinOpen}
            onClose={() => setIsManageCategoriesPopinOpen(false)}
            categories={categories}
            entryCounts={categoryEntryCounts}
            onEditCategory={(category) => {
            setEditingCategory(category);
            setIsCategoryPopinOpen(true);
            }}
            onDeleteCategory={setDeletingCategory}
            onCreateCategory={handleOpenCreateCategory}
        />

        <CategoryPopin
            key={editingCategory?.id ?? `create-category-${categoryPopinKey}`}
            zIndex={60}
            isOpen={isCategoryPopinOpen}
            onClose={() => {
            setIsCategoryPopinOpen(false);
            setEditingCategory(null);
            }}

            onSave={handleSaveCategory}

            onDelete={editingCategory ? async () => {
                const deleting = editingCategory;
                setIsCategoryPopinOpen(false);
                setEditingCategory(null);
                await handleDeleteCategory(deleting);
            } : undefined}

            mode={editingCategory ? "edit" : "create"}
            initialName={editingCategory?.label ?? ""}
            initialIcon={editingCategory?.icon ?? "shopping-cart"}
            initialColor={editingCategory?.color ?? "#007AFF"}
        />

        {deletingCategory !== null && (
            <DeleteCategoryDialog
                category={deletingCategory}
                onCancel={() => setDeletingCategory(null)}
                onConfirm={async () => {
                    await handleDeleteCategory(deletingCategory);
                    setDeletingCategory(null);
                }}
            />
        )}

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