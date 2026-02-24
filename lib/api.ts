const USER_ID = "temp-user";

// Helper to make API requests
async function fetchAPI(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": USER_ID,
      ...options?.headers,
    },
  });

  if (response.ok === false) {
    const error = await response.json();
    throw new Error(error.message || "API request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============ CATEGORIES ============

export async function getCategories() {
  return fetchAPI("/api/categories");
}

export async function createCategory(data: {
  label: string;
  icon: string;
  color: string;
}) {
  return fetchAPI("/api/categories", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCategory(
  id: string,
  data: { label?: string; icon?: string; color?: string }
) {
  return fetchAPI(`/api/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCategory(id: string) {
  return fetchAPI(`/api/categories/${id}`, {
    method: "DELETE",
  });
}

// ============ SPENDING ============

export async function getSpending(month?: string) {
  const url = month !== undefined && month !== "" 
    ? `/api/spending?month=${month}` 
    : "/api/spending";
  return fetchAPI(url);
}

export async function createSpending(data: {
  name: string;
  icon: string;
  categoryId: string;
  budgeted?: number;
  spent?: number;
  month: string;
  startDate?: string;
  endDate?: string | null;
  note?: string | null;
}) {
  return fetchAPI("/api/spending", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSpending(
  id: string,
  data: {
    name?: string;
    icon?: string;
    categoryId?: string;
    budgeted?: number;
    spent?: number;
    startDate?: string;
    endDate?: string | null;
    note?: string | null;
  }
) {
  return fetchAPI(`/api/spending/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSpending(id: string) {
  return fetchAPI(`/api/spending/${id}`, {
    method: "DELETE",
  });
}

// ============ INCOME ============

export async function getIncomeSources(month: string) {
  return fetchAPI(`/api/income?month=${month}`);
}

export async function getAllIncomeSources() {
  return fetchAPI("/api/income");
}

export async function createIncomeSource(data: {
  name: string;
  amount: number;
  icon: string;
  type: 'active' | 'passive';
  startDate: string;
  endDate?: string;
  note?: string;
  month: string;
}) {
  return fetchAPI("/api/income", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateIncomeSource(
  id: string,
  data: {
    name?: string;
    amount?: number;
    icon?: string;
    type?: 'active' | 'passive';
    startDate?: string;
    endDate?: string;
    note?: string;
  }
) {
  return fetchAPI("/api/income", {
    method: "PUT",
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteIncomeSource(id: string) {
  return fetchAPI("/api/income", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

// ============ ENTRIES ============

export async function getEntries(spendingItemId: string) {
  return fetchAPI(`/api/entries?spendingItemId=${spendingItemId}`);
}

export async function createEntry(data: {
  spendingItemId: string;
  name: string;
  amount: number;
  receiptUrl?: string;
  link?: string;
  date?: string;
}) {
  return fetchAPI("/api/entries", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEntry(
  id: string,
  data: {
    name?: string;
    amount?: number;
    receiptUrl?: string;
    link?: string;
    date?: string;
  }
) {
  return fetchAPI(`/api/entries/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEntry(id: string) {
  return fetchAPI(`/api/entries/${id}`, {
    method: "DELETE",
  });
}

// ============ SETTINGS ============

export async function getSettings() {
  return fetchAPI("/api/settings");
}

export async function updateSettings(data: { currency?: string; dateFormat?: string; darkMode?: boolean }) {
  return fetchAPI("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}