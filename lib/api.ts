const USER_ID = "temp-user";

/**
 * Shared transport + error surfacing for every API call — the single place
 * where a failed request becomes a user-facing Error. Returns the ok
 * `Response`; callers own the success-body parsing (JSON via `fetchAPI`,
 * binary via `exportAccountData`).
 */
async function requestAPI(url: string, options?: RequestInit): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "x-user-id": USER_ID,
        ...options?.headers,
      },
    });
  } catch (error) {
    // fetch() rejects with a transport-level TypeError ("Failed to fetch");
    // normalize it so callers can surface error messages to users verbatim.
    console.error("Network error calling", url, error);
    throw new Error("Network error. Please try again.");
  }

  if (response.ok === false) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || "API request failed");
  }

  return response;
}

// Helper to make JSON API requests
async function fetchAPI(url: string, options?: RequestInit) {
  const response = await requestAPI(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

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

/** Creates a new series and its first monthly incarnation in one call. */
export type CreateSeriesPayload = {
  name: string;
  icon: string;
  categoryId: string;
  recurring?: boolean;
  budgeted?: number;
  month: string;
  note?: string | null;
  /** Ignored by the server since the series refactor; sent by pre-series forms. */
  startDate?: string;
  endDate?: string | null;
};

/** Resumes/attaches an existing series: creates its incarnation for `month`. */
export type AttachSeriesPayload = {
  seriesId: string;
  month: string;
  recurring?: boolean;
  budgeted?: number;
  note?: string | null;
};

export async function createSpending(data: CreateSeriesPayload | AttachSeriesPayload) {
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
    note?: string | null;
    /** Ignored by the server since the series refactor; sent by pre-series forms. */
    startDate?: string;
    endDate?: string | null;
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

/**
 * Ensures every active recurring series has an incarnation in `month` and
 * returns the month's full flattened item list. Idempotent server-side —
 * safe to call on every month open.
 */
export async function materializeMonth(month: string) {
  return fetchAPI("/api/spending/materialize", {
    method: "POST",
    body: JSON.stringify({ month }),
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
  direction?: "debit" | "credit"; // server defaults absent to "debit"
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
    direction?: "debit" | "credit"; // absent keeps the stored direction
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

// ============ ACCOUNT ============

/**
 * Download the full account data export. Returns the CSV as a Blob plus the
 * server-chosen filename (from `Content-Disposition` — the one source of
 * truth for it); the caller turns them into a file download.
 */
export async function exportAccountData(): Promise<{ blob: Blob; filename: string }> {
  const response = await requestAPI("/api/account/export");

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const filename = match !== null ? match[1] : "budget-export.csv";

  return { blob: await response.blob(), filename };
}