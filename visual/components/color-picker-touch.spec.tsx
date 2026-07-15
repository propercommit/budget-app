import type { CDPSession } from "@playwright/test";
import { test, expect } from "../test";
import { ColorPicker } from "@/components/color-picker";
import { noop } from "../fixtures";

test.use({ hasTouch: true });

/**
 * Functional (non-screenshot) spec reproducing the mobile bug report: dragging
 * on the colour picker inside a scrollable sheet scrolled the sheet instead of
 * picking. Touch input is driven through CDP (`Input.dispatchTouchEvent`) —
 * unlike `dispatchEvent`, these are TRUSTED events, so an unhandled gesture
 * really scrolls the container, which is exactly what the control phase
 * asserts at the end.
 */
async function touchDrag(
  cdp: CDPSession,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {

  const steps = 8;

  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });

  for (let i = 1; i <= steps; i++) {

    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;

    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
  }

  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test.describe("ColorPicker touch drag", () => {
  test("drag picks colour without scrolling; scrolling works again after release", async ({ mount, page }) => {

    const sheet = await mount(
      <div style={{ height: 300, overflowY: "auto" }}>
        <div style={{ height: 60 }}>neutral scroll area</div>
        <ColorPicker value="#34C759" onChange={noop} />
        <div style={{ height: 900 }} />
      </div>,
    );

    const cdp = await page.context().newCDPSession(page);
    const gradient = page.getByRole("slider", { name: "Saturation and lightness" });
    const valueTextBefore = await gradient.getAttribute("aria-valuetext");
    const gradientBox = await gradient.boundingBox();

    if (gradientBox === null) throw new Error("gradient surface not visible");

    // Phase 1 — drag on the gradient: the view must not move, the colour must
    // follow the finger. The drag has a strong vertical component, which is
    // what triggered the sheet scroll in the bug report.
    await touchDrag(
      cdp,
      { x: gradientBox.x + gradientBox.width / 2, y: gradientBox.y + 20 },
      { x: gradientBox.x + gradientBox.width / 2 + 30, y: gradientBox.y + 110 },
    );

    await expect.poll(() => gradient.getAttribute("aria-valuetext")).not.toBe(valueTextBefore);

    expect(await sheet.evaluate((el) => el.scrollTop)).toBe(0);

    // Phase 2 (control) — the same gesture on the neutral area above the
    // picker must scroll the sheet: proves the lock released on touchend AND
    // that these CDP gestures do scroll when unhandled (so phase 1's
    // scrollTop === 0 is meaningful, not a harness artifact).
    const sheetBox = await sheet.boundingBox();

    if (sheetBox === null) throw new Error("sheet not visible");

    await touchDrag(
      cdp,
      { x: sheetBox.x + sheetBox.width / 2, y: sheetBox.y + 30 },
      { x: sheetBox.x + sheetBox.width / 2, y: sheetBox.y + 30 - 120 },
    );

    await expect.poll(() => sheet.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });
});
