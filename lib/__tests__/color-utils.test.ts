import { describe, it, expect } from "vitest";
import { hexToLightColor } from "@/lib/color-utils";

describe("hexToLightColor", () => {
  it("always pins lightness at 95% so the result is a light tint", () => {
    // The function's whole purpose: produce a light background tint of any hue.
    expect(hexToLightColor("#007AFF")).toMatch(/95%\)$/);
    expect(hexToLightColor("#000000")).toMatch(/95%\)$/);
  });

  describe("Apple HIG palette used across the app", () => {
    it("converts the blue (#007AFF)", () => {
      expect(hexToLightColor("#007AFF")).toBe("hsl(211, 100%, 95%)");
    });

    it("converts the green (#34C759)", () => {
      expect(hexToLightColor("#34C759")).toBe("hsl(135, 59%, 95%)");
    });

    it("converts the red (#FF3B30)", () => {
      expect(hexToLightColor("#FF3B30")).toBe("hsl(3, 100%, 95%)");
    });
  });

  describe("primary channels map to the expected hue", () => {
    it("pure red -> hue 0", () => {
      expect(hexToLightColor("#FF0000")).toBe("hsl(0, 100%, 95%)");
    });

    it("pure green -> hue 120", () => {
      expect(hexToLightColor("#00FF00")).toBe("hsl(120, 100%, 95%)");
    });

    it("pure blue -> hue 240", () => {
      expect(hexToLightColor("#0000FF")).toBe("hsl(240, 100%, 95%)");
    });
  });

  describe("achromatic inputs produce zero saturation and zero hue", () => {
    it("white", () => {
      expect(hexToLightColor("#FFFFFF")).toBe("hsl(0, 0%, 95%)");
    });

    it("black", () => {
      expect(hexToLightColor("#000000")).toBe("hsl(0, 0%, 95%)");
    });

    it("mid grey", () => {
      expect(hexToLightColor("#808080")).toBe("hsl(0, 0%, 95%)");
    });
  });

  describe("input tolerance", () => {
    it("accepts hex without a leading #", () => {
      expect(hexToLightColor("007AFF")).toBe("hsl(211, 100%, 95%)");
    });

    it("is case-insensitive on hex digits", () => {
      expect(hexToLightColor("#00ff00")).toBe(hexToLightColor("#00FF00"));
    });
  });
});
