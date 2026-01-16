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

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "API request failed");
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
  const url = month ? `/api/spending?month=${month}` : "/api/spending";
  return fetchAPI(url);
}

export async function createSpending(data: {
  name: string;
  icon: string;
  categoryId: string;
  budgeted?: number;
  spent?: number;
  month: string;
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

export async function getIncome(month?: string) {
  const url = month ? `/api/income?month=${month}` : "/api/income";
  return fetchAPI(url);
}

export async function saveIncome(data: {
  month: string;
  active?: number;
  passive?: number;
}) {
  return fetchAPI("/api/income", {
    method: "POST",
    body: JSON.stringify(data),
  });
}