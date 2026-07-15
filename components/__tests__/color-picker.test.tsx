// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ColorPicker } from "@/components/color-picker";

/**
 * jsdom implements neither PointerEvent nor layout, so drags are simulated
 * with MouseEvent-built "pointer*" events (React dispatches on the event type
 * alone) against stubbed getBoundingClientRect geometry.
 */
function pointer(type: string, coords: { clientX?: number; clientY?: number } = {}) {
  return new MouseEvent(type, { bubbles: true, cancelable: true, ...coords });
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

  render(<ColorPicker value="#ff0000" onChange={onChange} />);

  const gradient = screen.getByRole("slider", { name: "Saturation and lightness" });
  const hueBar = screen.getByRole("slider", { name: "Hue" });
  const opacityBar = screen.getByRole("slider", { name: "Opacity" });

  for (const el of [gradient, hueBar, opacityBar]) el.getBoundingClientRect = () => RECT;

  return { onChange, gradient, hueBar, opacityBar };
}

describe("ColorPicker — pointer drag (mouse and touch)", () => {
  it("picks a hue on pointerdown and keeps updating while dragging across the document", () => {

    const { onChange, hueBar } = renderPicker();

    fireEvent(hueBar, pointer("pointerdown", { clientX: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("#00ffff");

    fireEvent(document, pointer("pointermove", { clientX: 25 }));

    expect(onChange).toHaveBeenLastCalledWith("#80ff00");

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("picks saturation/lightness on the gradient square and clamps drags past the edges", () => {

    const { onChange, gradient } = renderPicker();

    fireEvent(gradient, pointer("pointerdown", { clientX: 50, clientY: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("#bf4040");

    fireEvent(document, pointer("pointermove", { clientX: 400, clientY: -60 }));

    expect(onChange).toHaveBeenLastCalledWith("#ffffff");
  });

  it("emits rgba when dragging opacity below 100%", () => {

    const { onChange, opacityBar } = renderPicker();

    fireEvent(opacityBar, pointer("pointerdown", { clientX: 50 }));

    expect(onChange).toHaveBeenLastCalledWith("rgba(255, 0, 0, 0.5)");
  });

  it("stops updating after pointerup", () => {

    const { onChange, hueBar } = renderPicker();

    fireEvent(hueBar, pointer("pointerdown", { clientX: 50 }));
    fireEvent(document, pointer("pointerup"));

    onChange.mockClear();
    fireEvent(document, pointer("pointermove", { clientX: 10 }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("stops updating after pointercancel (interrupted touch drag)", () => {

    const { onChange, gradient } = renderPicker();

    fireEvent(gradient, pointer("pointerdown", { clientX: 10, clientY: 10 }));
    fireEvent(document, pointer("pointercancel"));

    onChange.mockClear();
    fireEvent(document, pointer("pointermove", { clientX: 90, clientY: 90 }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
