// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import { ReceiptViewer } from "@/components/ui/receipt-viewer";

vi.mock("react-hot-toast", () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const SIGNED_URL = "https://signed.example/storage/receipt";

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

/** A fetch response whose blob() carries the given MIME type (drives the download extension). */
function imageResponse(type: string): Response {
  return new Response(PNG_BYTES, { status: 200, headers: { "content-type": type } });
}

describe("ReceiptViewer download", () => {
  let capturedAnchor: HTMLAnchorElement | null;
  let anchorClick: Mock<() => void>;
  let createObjectURLMock: Mock<(blob: Blob) => string>;
  let revokeObjectURLMock: Mock<(url: string) => void>;

  beforeEach(() => {

    capturedAnchor = null;
    anchorClick = vi.fn<() => void>();

    // The handler builds its anchor via document.createElement and never
    // attaches it to the DOM, so capture it at creation and stub click()
    // (jsdom would otherwise try to navigate the blob: href).
    const realCreateElement = document.createElement.bind(document);

    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: ElementCreationOptions) => {

      const element = realCreateElement(tagName, options);

      if (tagName === "a") {
        capturedAnchor = element as HTMLAnchorElement;
        capturedAnchor.click = anchorClick;
      }

      return element;
    });

    // jsdom does not implement object URLs.
    createObjectURLMock = vi.fn<(blob: Blob) => string>(() => "blob:mock-receipt");
    revokeObjectURLMock = vi.fn<(url: string) => void>();
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();

    vi.unstubAllGlobals();

    vi.mocked(toast.error).mockClear();
  });

  function renderViewer(getFreshUrl?: () => Promise<string | null>) {
    render(<ReceiptViewer isOpen onClose={() => {}} imageUrl={SIGNED_URL} getFreshUrl={getFreshUrl} />);
  }

  function clickDownload() {
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
  }

  it("downloads via a blob: href named from the blob type", async () => {

    const fetchMock = vi.fn(async () => imageResponse("image/png"));

    vi.stubGlobal("fetch", fetchMock);

    renderViewer();

    clickDownload();

    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(SIGNED_URL);

    expect(capturedAnchor?.getAttribute("href")).toBe("blob:mock-receipt");

    expect(capturedAnchor?.download).toBe("receipt.png");

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to a .jpg filename for an unknown blob type", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => imageResponse("application/octet-stream")));

    renderViewer();

    clickDownload();

    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));

    expect(capturedAnchor?.download).toBe("receipt.jpg");
  });

  it("revokes the object URL after clicking the anchor", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => imageResponse("image/png")));

    renderViewer();

    clickDownload();

    await waitFor(() => expect(revokeObjectURLMock).toHaveBeenCalledExactlyOnceWith("blob:mock-receipt"));

    expect(anchorClick.mock.invocationCallOrder[0]).toBeLessThan(revokeObjectURLMock.mock.invocationCallOrder[0]);
  });

  it("toasts an error when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    renderViewer();

    clickDownload();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Couldn't download the receipt"));

    expect(anchorClick).not.toHaveBeenCalled();
  });

  it("fetches the getFreshUrl result instead of the stale imageUrl when provided", async () => {

    const fetchMock = vi.fn(async () => imageResponse("image/png"));

    vi.stubGlobal("fetch", fetchMock);

    const getFreshUrl = vi.fn(async () => "https://fresh.example/storage/receipt");

    renderViewer(getFreshUrl);

    clickDownload();

    await waitFor(() => expect(anchorClick).toHaveBeenCalledTimes(1));

    expect(getFreshUrl).toHaveBeenCalledTimes(1);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://fresh.example/storage/receipt");
  });

  it("toasts and skips the fetch when getFreshUrl resolves null", async () => {

    const fetchMock = vi.fn(async () => imageResponse("image/png"));

    vi.stubGlobal("fetch", fetchMock);

    renderViewer(vi.fn(async () => null));

    clickDownload();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Couldn't download the receipt"));

    expect(fetchMock).not.toHaveBeenCalled();

    expect(anchorClick).not.toHaveBeenCalled();
  });
});
