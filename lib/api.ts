import { ApiError } from "@/lib/api-error";
import type { CommitPayload, CommitResult, PreviewResponse } from "@/lib/import/review";

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
    throw new ApiError(body.error || body.message || "API request failed", response.status);
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
    recurring?: boolean;
    budgeted?: number;
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

/** The user's series list for the create popin's typeahead. */
export async function getSeries() {
  return fetchAPI("/api/spending/series");
}

/**
 * Ensures every active recurring series has an incarnation in `month` and
 * returns the month's full flattened item list. Only the current UTC month
 * and later materialize (D26) — a past month creates nothing and returns
 * its existing items as-is. Idempotent server-side — safe to call on every
 * month open.
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

export async function createEntry(data: {
  spendingItemId: string;
  name: string;
  amount: number;
  direction?: "debit" | "credit"; // server defaults absent to "debit"
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

// ============ RECEIPTS ============

/**
 * Issues a signed upload token for the entry's fixed receipt path. The size
 * claim only sharpens the server's preliminary quota check — the confirm step
 * re-reads the real size from Storage metadata.
 */
export async function issueReceiptUpload(
  entryId: string,
  data: { sizeBytes: number }
): Promise<{ path: string; token: string }> {
  return fetchAPI(`/api/entries/${entryId}/receipt`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Finalizes an upload — the server's authoritative validation. Sent with
 * `keepalive` so a confirm dispatched right before a refresh/close still
 * reaches the server and writes the DB pointer (empty body, so the keepalive
 * size cap is irrelevant); a confirm that never got dispatched is covered by
 * the resume markers in `lib/receipt-resume.ts`.
 */
export async function confirmReceipt(
  entryId: string
): Promise<{ receiptPath: string; receiptSizeBytes: number }> {
  return fetchAPI(`/api/entries/${entryId}/receipt`, {
    method: "PUT",
    keepalive: true,
  });
}

/** Mints a short-lived signed read URL for the entry's receipt. */
export async function getReceiptUrl(entryId: string): Promise<{ url: string }> {
  return fetchAPI(`/api/entries/${entryId}/receipt`);
}

export async function deleteReceipt(entryId: string): Promise<void> {
  await fetchAPI(`/api/entries/${entryId}/receipt`, {
    method: "DELETE",
  });
}

// ============ IMPORT ============

/**
 * Stages an MT940 file for review: server-side parse + rule matching +
 * reconciliation. Pure read — nothing is written until {@link commitImport}.
 */
export async function previewImport(content: string): Promise<PreviewResponse> {
  return fetchAPI("/api/import/preview", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/**
 * Commits a reviewed import as one atomic batch — every transaction with its
 * fate. A 409 means a rare series-name collision; the transaction rolled
 * back, so retrying the same payload is safe.
 */
export async function commitImport(payload: CommitPayload): Promise<CommitResult> {
  return fetchAPI("/api/import/commit", {
    method: "POST",
    body: JSON.stringify(payload),
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