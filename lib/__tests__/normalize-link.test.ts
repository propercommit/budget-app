import { describe, it, expect } from "vitest";
import { normalizeLink } from "@/lib/normalize-link";

describe("normalizeLink", () => {
    it.each([
        ["bare domain (trimmed)", "  migros.ch  ", "https://migros.ch"],
        ["www address with a path", "www.migros.ch/receipts/42", "https://www.migros.ch/receipts/42"],
        ["https link unchanged", "https://example.com/x", "https://example.com/x"],
        ["http link unchanged", "http://example.com", "http://example.com"],
        ["scheme matched case-insensitively", "HTTPS://EXAMPLE.COM", "HTTPS://EXAMPLE.COM"],
    ])("%s", (_label, input, expected) => {
        expect(normalizeLink(input)).toBe(expected);
    });

    it("returns null for empty or whitespace-only input", () => {
        expect(normalizeLink("")).toBeNull();

        expect(normalizeLink("   ")).toBeNull();
    });
});
