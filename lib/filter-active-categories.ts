import { Category, SpendingItem } from "./types";


interface FilterActiveCategoriesParams {
    categories: Category[],
    spendingItems: SpendingItem[],
    selectedMonth: string
};
export function filterActiveCategories({ categories, spendingItems, selectedMonth }: FilterActiveCategoriesParams): Category[] {
    
    const activeCategories: Category[] = categories.filter((category) => {
    return spendingItems.some((spendingItem) => {
        return (
            spendingItem.categoryId === category.id &&
            spendingItem.startDate.slice(0, 7) <= selectedMonth &&
            (spendingItem.endDate == null || spendingItem.endDate.slice(0, 7) >= selectedMonth)
        );
    });
});

return activeCategories;
}