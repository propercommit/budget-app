// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ColorPicker } from "@/components/color-picker";

function mouse(type: string, coords: { clientX?: number; clientY?: number } = {}) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...coords });
}

/**
 * jsdom implements no TouchEvent — a plain cancelable Event carrying a
 * `touches` array is all the picker's native touch handlers read. Returned
 * (not just dispatched) so tests can assert `defaultPrevented`, which is how
 * the view lock is observed.
 */
function touch(type: string, coords?: { clientX: number; clientY: number }) {
  return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    touches: coords === undefined ? [] : [coords],
  });
}

const RECT = {
  left: 0,
  top: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

function renderPicker() {

  const onChange = vi.fn();

  const { unmount } = render(<ColorPicker value="#ff0000" onChange={onChange} />);

  const gradient = screen.getByRole("slider", { name: "Saturation and lightness" });
  const hueBar = screen.getByRole("slider", { name: "Hue" });
  const opacityBar = screen.getByRole("slider", { name: "Opacity" });

  for (const el of [gradient, hueBar, opacityBar]) el.getBoundingClientRect = () => RECT;

  return { onChange, gradient, hueBar, opacityBar, unmount };
}

describe("ColorPicker — mouse drag (desktop)", () => {
  it("picks a hue on mousedown and keeps updating while dragging across the document", () => {

    const { onChange, hueBar } = renderPicker();

    fireEvent(hueBar, mouse("mousedown", { clientX: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("#00ffff");

    fireEvent(document, mouse("mousemove", { clientX: 25 }));

    expect(onChange).toHaveBeenLastCalledWith("#80ff00");

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("picks saturation/lightness on the gradient square and clamps drags past the edges", () => {

    const { onChange, gradient } = renderPicker();

    fireEvent(gradient, mouse("mousedown", { clientX: 50, clientY: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("#bf4040");

    fireEvent(document, mouse("mousemove", { clientX: 400, clientY: -60 }));

    expect(onChange).toHaveBeenLastCalledWith("#ffffff");
  });

  it("emits rgba when dragging opacity below 100%", () => {

    const { onChange, opacityBar } = renderPicker();

    fireEvent(opacityBar, mouse("mousedown", { clientX: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("rgba(255, 0, 0, 0.5)");
  });

  it("stops updating after mouseup", () => {

    const { onChange, hueBar } = renderPicker();

    fireEvent(hueBar, mouse("mousedown", { clientX: 50 }));
    fireEvent(document, mouse("mouseup"));

    onChange.mockClear();
    fireEvent(document, mouse("mousemove", { clientX: 10 }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("ColorPicker — touch drag (mobile: lock view, drag, unlock)", () => {
  it("locks the view and picks on touchstart, follows the finger on touchmove", () => {

    const { onChange, hueBar } = renderPicker();

    const start = touch("touchstart", { clientX: 50, clientY: 5 });

    fireEvent(hueBar, start);

    expect(start.defaultPrevented).toBe(true);

    expect(onChange).toHaveBeenLastCalledWith("#00ffff");

    const move = touch("touchmove", { clientX: 25, clientY: 5 });

    fireEvent(hueBar, move);

    expect(move.defaultPrevented).toBe(true);

    expect(onChange).toHaveBeenLastCalledWith("#80ff00");
  });

  it("clamps touch drags past the gradient edges", () => {

    const { onChange, gradient } = renderPicker();

    fireEvent(gradient, touch("touchstart", { clientX: 50, clientY: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("#bf4040");

    fireEvent(gradient, touch("touchmove", { clientX: 400, clientY: -60 }));

    expect(onChange).toHaveBeenLastCalledWith("#ffffff");
  });

  it("emits rgba when touch-dragging opacity below 100%", () => {

    const { onChange, opacityBar } = renderPicker();

    fireEvent(opacityBar, touch("touchstart", { clientX: 50, clientY: 5 }));

    expect(onChange).toHaveBeenLastCalledWith("rgba(255, 0, 0, 0.5)");
  });

  it("unlocks the view on touchend — later moves are neither picked nor blocked", () => {

    const { onChange, hueBar } = renderPicker();

    fireEvent(hueBar, touch("touchstart", { clientX: 50, clientY: 5 }));
    fireEvent(hueBar, touch("touchend"));

    onChange.mockClear();

    const move = touch("touchmove", { clientX: 10, clientY: 5 });

    fireEvent(hueBar, move);

    expect(move.defaultPrevented).toBe(false);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("unlocks the view on touchcancel (interrupted gesture)", () => {

    const { onChange, gradient } = renderPicker();

    fireEvent(gradient, touch("touchstart", { clientX: 10, clientY: 10 }));
    fireEvent(gradient, touch("touchcancel"));

    onChange.mockClear();

    const move = touch("touchmove", { clientX: 90, clientY: 90 });

    fireEvent(gradient, move);

    expect(move.defaultPrevented).toBe(false);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes the native listeners on unmount", () => {

    const { onChange, hueBar, unmount } = renderPicker();

    fireEvent(hueBar, touch("touchstart", { clientX: 50, clientY: 5 }));

    unmount();
    onChange.mockClear();

    const start = touch("touchstart", { clientX: 25, clientY: 5 });

    hueBar.dispatchEvent(start);

    expect(start.defaultPrevented).toBe(false);

    expect(onChange).not.toHaveBeenCalled();
  });
});
