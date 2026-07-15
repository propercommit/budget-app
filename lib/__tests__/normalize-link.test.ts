import { describe, it, expect } from "vitest";
import { normalizeLink } from "@/lib/normalize-link";

describe("normalizeLink", () => {
    it("prepends https:// to a bare domain", () => {
        expect(normalizeLink("migros.ch")).toBe("https://migros.ch");
    });

    it("prepends https:// to a www address with a path", () => {
        expect(normalizeLink("www.migros.ch/receipts/42")).toBe("https://www.migros.ch/receipts/42");
    });

    it("passes an https link through unchanged", () => {
        expect(normalizeLink("https://example.com/x")).toBe("https://example.com/x");
    });

    it("passes an http link through unchanged", () => {
        expect(normalizeLink("http://example.com")).toBe("http://example.com");
    });

    it("matches the scheme case-insensitively", () => {
        expect(normalizeLink("HTTPS://EXAMPLE.COM")).toBe("HTTPS://EXAMPLE.COM");
    });

    it("returns null for an empty value", () => {
        expect(normalizeLink("")).toBeNull();
    });

    it("returns null for whitespace only", () => {
        expect(normalizeLink("   ")).toBeNull();
    });

    it("trims surrounding whitespace before normalizing", () => {
        expect(normalizeLink("  migros.ch  ")).toBe("https://migros.ch");
    });
});
