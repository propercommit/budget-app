import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  FAKE_USER,
  jsonRequest,
  getRequest,
  routeContext,
  readJson,
} from "../../__tests__/helpers";

const {
  prismaMock,
  getAuthenticatedUser,
  storageFromMock,
  createSignedUrlMock,
  createSignedUploadUrlMock,
  infoMock,
  removeMock,
} = vi.hoisted(() => {
  const createSignedUrlMock = vi.fn();
  const createSignedUploadUrlMock = vi.fn();
  const infoMock = vi.fn();
  const removeMock = vi.fn();

  return {
    prismaMock: {
      spendingEntry: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
        updateMany: vi.fn(),
      },
    },
    getAuthenticatedUser: vi.fn(),
    storageFromMock: vi.fn(() => ({
      createSignedUrl: createSignedUrlMock,
      createSignedUploadUrl: createSignedUploadUrlMock,
      info: infoMock,
      remove: removeMock,
    })),
    createSignedUrlMock,
    createSignedUploadUrlMock,
    infoMock,
    removeMock,
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUser }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: { from: storageFromMock } }),
}));

import { GET, POST, PUT, DELETE } from "@/app/api/entries/[id]/receipt/route";

const ENTRY_ID = "entry-1";

// The fixed object key is always namespaced under the CALLER's uid.
const FIXED_PATH = `${FAKE_USER.id}/${ENTRY_ID}`;

// Pinned literally (not imported) so a silent constant change fails the suite.
const MAX_RECEIPT_BYTES = 10_485_760;
const RECEIPT_QUOTA_BYTES = 52_428_800;
const DEFAULT_SIZE = 4096;

function ownedEntry(
  overrides: { receiptPath?: string | null; receiptSizeBytes?: number | null } = {}
) {

  return {
    id: ENTRY_ID,
    spendingItemId: "s1",
    receiptPath: null as string | null,
    receiptSizeBytes: null as number | null,
    spendingItem: { id: "s1", series: { userId: FAKE_USER.id } },
    ...overrides,
  };
}

/** Pads magic bytes to `length` so the sniff has its full 12-byte window. */
function headBytes(magic: number[], length = 16): Uint8Array<ArrayBuffer> {

  const bytes = new Uint8Array(length);

  bytes.set(magic);

  return bytes;
}

const JPEG_HEAD = headBytes([0xff, 0xd8, 0xff, 0xe0]);
const PNG_HEAD = headBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_HEAD = headBytes([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const PDF_HEAD = headBytes([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

/**
 * Response the sniff fetch resolves to. A Response built from a Uint8Array has
 * a readable body stream; the object's total size travels in `content-range`
 * on a 206 (the usual Range answer) or `content-length` on a full-body 200.
 */
function sniffResponse(
  body: Uint8Array<ArrayBuffer>,
  options: { status?: number; totalBytes?: number } = {}
): Response {

  const status = options.status ?? 206;
  const totalBytes = options.totalBytes ?? DEFAULT_SIZE;
  const headers: Record<string, string> =
    status === 206
      ? { "content-range": `bytes 0-31/${totalBytes}` }
      : { "content-length": String(totalBytes) };

  return new Response(body, { status, headers });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubGlobal("fetch", fetchMock);

  getAuthenticatedUser.mockResolvedValue(FAKE_USER);
  prismaMock.spendingEntry.findUnique.mockResolvedValue(ownedEntry());
  prismaMock.spendingEntry.aggregate.mockResolvedValue({ _sum: { receiptSizeBytes: null } });
  prismaMock.spendingEntry.updateMany.mockResolvedValue({ count: 1 });

  createSignedUrlMock.mockResolvedValue({
    data: { signedUrl: "https://signed.example/receipt" },
    error: null,
  });
  createSignedUploadUrlMock.mockResolvedValue({
    data: { path: FIXED_PATH, token: "upload-token" },
    error: null,
  });
  infoMock.mockResolvedValue({ data: { size: DEFAULT_SIZE }, error: null });
  removeMock.mockResolvedValue({ data: [], error: null });

  // Fresh Response per call — a body stream can only be consumed once.
  fetchMock.mockImplementation(async () => sniffResponse(JPEG_HEAD));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/entries/[id]/receipt", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost"), routeContext(ENTRY_ID))
    );
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it("404 when the entry does not exist", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(null);
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost"), routeContext(ENTRY_ID))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
  });

  it("404 (not 403) when the entry belongs to another user — ownership via series traversal", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      ...ownedEntry({ receiptPath: FIXED_PATH }),
      spendingItem: { id: "s1", series: { userId: "someone-else" } },
    });
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost"), routeContext(ENTRY_ID))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it("404 no_receipt when the entry has no stored receiptPath — never probes the bucket", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(ownedEntry({ receiptPath: null }));
    const { status, body } = await readJson(
      await GET(getRequest("http://localhost"), routeContext(ENTRY_ID))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "no_receipt" });
    expect(createSignedUrlMock).not.toHaveBeenCalled();
  });

  it("200 mints a signed URL from the stored DB path with the 600s TTL", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(
      ownedEntry({ receiptPath: "user-123/stored-db-key", receiptSizeBytes: 2048 })
    );

    const { status, body } = await readJson(
      await GET(getRequest("http://localhost"), routeContext(ENTRY_ID))
    );
    expect(status).toBe(200);
    expect(body).toEqual({ url: "https://signed.example/receipt" });

    // Minted from the DB pointer — not a recomputed path — against "receipts".
    expect(storageFromMock).toHaveBeenCalledWith("receipts");
    expect(createSignedUrlMock).toHaveBeenCalledWith("user-123/stored-db-key", 600);
  });
});

describe("POST /api/entries/[id]/receipt", () => {
  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status, body } = await readJson(
      await POST(jsonRequest({ sizeBytes: 100 }), routeContext(ENTRY_ID))
    );
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", {}],
    ["not a number", { sizeBytes: "100" }],
    ["not an integer", { sizeBytes: 10.5 }],
    ["zero", { sizeBytes: 0 }],
    ["negative", { sizeBytes: -1 }],
  ])("400 when sizeBytes is %s", async (_label, requestBody) => {
    const { status, body } = await readJson(
      await POST(jsonRequest(requestBody), routeContext(ENTRY_ID))
    );
    expect(status).toBe(400);
    expect(body).toEqual({ error: "sizeBytes must be a positive integer" });
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("413 receipt_too_large when the claimed size exceeds the per-object cap", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ sizeBytes: MAX_RECEIPT_BYTES + 1 }), routeContext(ENTRY_ID))
    );
    expect(status).toBe(413);
    expect(body).toEqual({ error: "receipt_too_large", maxBytes: MAX_RECEIPT_BYTES });
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("404 when the entry does not exist", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(null);
    const { status, body } = await readJson(
      await POST(jsonRequest({ sizeBytes: 100 }), routeContext(ENTRY_ID))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("404 when the entry belongs to another user", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      ...ownedEntry(),
      spendingItem: { id: "s1", series: { userId: "someone-else" } },
    });
    const { status, body } = await readJson(
      await POST(jsonRequest({ sizeBytes: 100 }), routeContext(ENTRY_ID))
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("413 quota_exceeded on the preliminary check, excluding this entry's own bytes", async () => {
    prismaMock.spendingEntry.aggregate.mockResolvedValue({
      _sum: { receiptSizeBytes: 51_500_000 },
    });

    const { status, body } = await readJson(
      await POST(jsonRequest({ sizeBytes: 1_000_000 }), routeContext(ENTRY_ID))
    );
    expect(status).toBe(413);
    expect(body).toEqual({
      error: "quota_exceeded",
      quotaBytes: RECEIPT_QUOTA_BYTES,
      usedBytes: 51_500_000,
    });

    // The base excludes THIS entry so replacing a receipt frees the old size.
    expect(prismaMock.spendingEntry.aggregate).toHaveBeenCalledWith({
      _sum: { receiptSizeBytes: true },
      where: { spendingItem: { series: { userId: FAKE_USER.id } }, id: { not: ENTRY_ID } },
    });
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("200 issues a signed upload token at the fixed path with upsert:true", async () => {
    const { status, body } = await readJson(
      await POST(jsonRequest({ sizeBytes: 2048 }), routeContext(ENTRY_ID))
    );
    expect(status).toBe(200);
    expect(body).toEqual({ path: FIXED_PATH, token: "upload-token" });

    // upsert:true is load-bearing: re-uploads must overwrite the fixed key.
    expect(storageFromMock).toHaveBeenCalledWith("receipts");
    expect(createSignedUploadUrlMock).toHaveBeenCalledWith(FIXED_PATH, { upsert: true });
  });
});

describe("PUT /api/entries/[id]/receipt (confirm)", () => {
  const putReceipt = () => PUT(getRequest("http://localhost"), routeContext(ENTRY_ID));

  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("404 when the entry died mid-upload — reaps the caller-namespaced orphan first", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(null);

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });

    // The fixed path is recomputed from the CALLER's uid, so this cleanup can
    // only ever touch the caller's own folder.
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
    expect(infoMock).not.toHaveBeenCalled();
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
  });

  it("404 when the entry belongs to another user — removal still targets the caller's folder", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      ...ownedEntry(),
      spendingItem: { id: "s1", series: { userId: "someone-else" } },
    });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
  });

  it("409 receipt_not_uploaded when nothing is at the fixed path — nothing removed", async () => {
    infoMock.mockResolvedValue({ data: null, error: { message: "Object not found" } });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(409);
    expect(body).toEqual({ error: "receipt_not_uploaded" });
    expect(removeMock).not.toHaveBeenCalled();
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
  });

  it("409 receipt_not_uploaded when info() hangs past the step timeout — nothing removed (the 300s-504 regression)", async () => {
    vi.useFakeTimers();

    try {
      infoMock.mockImplementation(() => new Promise(() => undefined));

      const pending = putReceipt();

      await vi.advanceTimersByTimeAsync(10_000);

      const { status, body } = await readJson(await pending);
      expect(status).toBe(409);
      expect(body).toEqual({ error: "receipt_not_uploaded" });
      expect(removeMock).not.toHaveBeenCalled();
      expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("500 when Storage metadata reports no size — object removed", async () => {
    infoMock.mockResolvedValue({ data: {}, error: null });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to confirm receipt" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
  });

  it("413 receipt_too_large from the Storage-reported size — object removed", async () => {
    infoMock.mockResolvedValue({ data: { size: MAX_RECEIPT_BYTES + 1 }, error: null });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(413);
    expect(body).toEqual({ error: "receipt_too_large", maxBytes: MAX_RECEIPT_BYTES });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
  });

  it("409 receipt_not_uploaded when the sniff fetch answers non-ok (a failed READ is not a bad FILE) — object removed", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 416 }));

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(409);
    expect(body).toEqual({ error: "receipt_not_uploaded" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
  });

  it("409 receipt_not_uploaded when the sniff fetch throws (transient network) — object removed, never a terminal 415", async () => {
    fetchMock.mockImplementation(async () => { throw new TypeError("fetch failed"); });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(409);
    expect(body).toEqual({ error: "receipt_not_uploaded" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ receiptPath: FIXED_PATH }) })
    );
  });

  it("415 unsupported_type when fewer than 12 bytes are readable — object removed", async () => {
    fetchMock.mockImplementation(async () =>
      sniffResponse(headBytes([0xff, 0xd8, 0xff], 8), { totalBytes: 8 })
    );

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(415);
    expect(body).toEqual({ error: "unsupported_type" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
  });

  it("409 receipt_not_uploaded when the sniffed total disagrees with info() — object removed", async () => {
    infoMock.mockResolvedValue({ data: { size: DEFAULT_SIZE }, error: null });
    // Valid JPEG magic so ONLY the size cross-check can be what fails.
    fetchMock.mockImplementation(async () => sniffResponse(JPEG_HEAD, { totalBytes: 999 }));

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(409);
    expect(body).toEqual({ error: "receipt_not_uploaded" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
  });

  it("415 unsupported_type on unrecognized magic bytes — object removed, no dangling clear for a fresh attach", async () => {
    fetchMock.mockImplementation(async () => sniffResponse(PDF_HEAD));

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(415);
    expect(body).toEqual({ error: "unsupported_type" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);

    // receiptPath was null (fresh attach) — nothing to degrade.
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
  });

  it("413 quota_exceeded on the authoritative recheck, excluding the entry's own current receipt — object removed", async () => {
    // The entry already holds a 5 MB receipt; the exclusion means those bytes
    // are NOT part of usedBytes — the aggregate query filters this id out.
    prismaMock.spendingEntry.findUnique.mockResolvedValue(
      ownedEntry({ receiptPath: FIXED_PATH, receiptSizeBytes: 5_000_000 })
    );
    prismaMock.spendingEntry.aggregate.mockResolvedValue({
      _sum: { receiptSizeBytes: 52_428_000 },
    });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(413);
    expect(body).toEqual({
      error: "quota_exceeded",
      quotaBytes: RECEIPT_QUOTA_BYTES,
      usedBytes: 52_428_000,
    });

    expect(prismaMock.spendingEntry.aggregate).toHaveBeenCalledWith({
      _sum: { receiptSizeBytes: true },
      where: { spendingItem: { series: { userId: FAKE_USER.id } }, id: { not: ENTRY_ID } },
    });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
  });

  it("200 confirms a JPEG: records the fixed path and the Storage-reported size", async () => {
    infoMock.mockResolvedValue({ data: { size: 3333 }, error: null });
    fetchMock.mockImplementation(async () => sniffResponse(JPEG_HEAD, { totalBytes: 3333 }));

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(200);
    expect(body).toEqual({ receiptPath: FIXED_PATH, receiptSizeBytes: 3333 });

    // The recorded size is info().size — PUT carries no body, so no client
    // claim can ever reach this write.
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: FIXED_PATH, receiptSizeBytes: 3333 },
    });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("200 confirms a PNG", async () => {
    infoMock.mockResolvedValue({ data: { size: 2222 }, error: null });
    fetchMock.mockImplementation(async () => sniffResponse(PNG_HEAD, { totalBytes: 2222 }));

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(200);
    expect(body).toEqual({ receiptPath: FIXED_PATH, receiptSizeBytes: 2222 });
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: FIXED_PATH, receiptSizeBytes: 2222 },
    });
  });

  it("200 confirms a WebP, taking the total from content-length on a full 200 read", async () => {
    infoMock.mockResolvedValue({ data: { size: 1111 }, error: null });
    fetchMock.mockImplementation(async () =>
      sniffResponse(WEBP_HEAD, { status: 200, totalBytes: 1111 })
    );

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(200);
    expect(body).toEqual({ receiptPath: FIXED_PATH, receiptSizeBytes: 1111 });
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: FIXED_PATH, receiptSizeBytes: 1111 },
    });
  });

  it("sniff fetch targets the object URL with a cache-busting nonce and a Range header", async () => {
    await putReceipt();

    const [input, init] = fetchMock.mock.calls[0];
    const url = String(input);

    expect(url).toMatch(
      /^https:\/\/project\.supabase\.co\/storage\/v1\/object\/receipts\/user-123\/entry-1\?nonce=[0-9a-f-]+$/
    );

    const headers = init?.headers as Record<string, string>;
    expect(headers.Range).toBe("bytes=0-31");
  });

  it("404 when the confirm write hits zero rows (entry deleted concurrently) — object removed", async () => {
    prismaMock.spendingEntry.updateMany.mockResolvedValue({ count: 0 });

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
  });

  it("double-confirm is idempotent: rewrites the same pointer and size", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(
      ownedEntry({ receiptPath: FIXED_PATH, receiptSizeBytes: DEFAULT_SIZE })
    );

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(200);
    expect(body).toEqual({ receiptPath: FIXED_PATH, receiptSizeBytes: DEFAULT_SIZE });
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: FIXED_PATH, receiptSizeBytes: DEFAULT_SIZE },
    });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("degrades a failed replacement to no-receipt: clears the dangling pointer at the fixed path", async () => {
    // The entry's live pointer already references the fixed path; a failed
    // confirm just deleted that object, so the pointer must be cleared too.
    prismaMock.spendingEntry.findUnique.mockResolvedValue(
      ownedEntry({ receiptPath: FIXED_PATH, receiptSizeBytes: 2048 })
    );
    fetchMock.mockImplementation(async () => sniffResponse(PDF_HEAD));

    const { status, body } = await readJson(await putReceipt());
    expect(status).toBe(415);
    expect(body).toEqual({ error: "unsupported_type" });

    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: null, receiptSizeBytes: null },
    });
  });
});

describe("DELETE /api/entries/[id]/receipt", () => {
  const deleteReceipt = () => DELETE(getRequest("http://localhost"), routeContext(ENTRY_ID));

  it("401 when unauthenticated", async () => {
    getAuthenticatedUser.mockResolvedValue(null);
    const { status, body } = await readJson(await deleteReceipt());
    expect(status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("404 when the entry does not exist", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(null);
    const { status, body } = await readJson(await deleteReceipt());
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("404 when the entry belongs to another user — nothing cleared or removed", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue({
      ...ownedEntry({ receiptPath: FIXED_PATH }),
      spendingItem: { id: "s1", series: { userId: "someone-else" } },
    });
    const { status, body } = await readJson(await deleteReceipt());
    expect(status).toBe(404);
    expect(body).toEqual({ error: "Entry not found" });
    expect(prismaMock.spendingEntry.updateMany).not.toHaveBeenCalled();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("204: clears the DB pointer FIRST, then removes the object", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(
      ownedEntry({ receiptPath: FIXED_PATH, receiptSizeBytes: 2048 })
    );

    const { status, body } = await readJson(await deleteReceipt());
    expect(status).toBe(204);
    expect(body).toBeNull();

    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: null, receiptSizeBytes: null },
    });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);

    // DB before storage: a failed storage delete leaves an inert orphan; the
    // reverse order could leave a pointer whose every read 404s.
    const updateOrder = prismaMock.spendingEntry.updateMany.mock.invocationCallOrder[0];
    const removeOrder = removeMock.mock.invocationCallOrder[0];
    expect(updateOrder).toBeLessThan(removeOrder);
  });

  it("204 on an entry with no receipt — idempotent, and still reaps an unconfirmed orphan", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(ownedEntry({ receiptPath: null }));

    const { status, body } = await readJson(await deleteReceipt());
    expect(status).toBe(204);
    expect(body).toBeNull();
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: null, receiptSizeBytes: null },
    });
    expect(removeMock).toHaveBeenCalledWith([FIXED_PATH]);
  });

  it("204 even when the storage removal fails — best-effort cleanup", async () => {
    prismaMock.spendingEntry.findUnique.mockResolvedValue(
      ownedEntry({ receiptPath: FIXED_PATH, receiptSizeBytes: 2048 })
    );
    removeMock.mockResolvedValue({ data: null, error: { message: "storage down" } });

    const { status, body } = await readJson(await deleteReceipt());
    expect(status).toBe(204);
    expect(body).toBeNull();
    expect(prismaMock.spendingEntry.updateMany).toHaveBeenCalledWith({
      where: { id: ENTRY_ID },
      data: { receiptPath: null, receiptSizeBytes: null },
    });
  });
});
