/** Tests for the handle that drags a panel's width. */

import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WidthHandle } from "./WidthHandle";
import { renderPage } from "@/test/support";

type Resize = (width: number, done: boolean) => void;

function handle(width = 300): {
  onResize: ReturnType<typeof vi.fn<Resize>>;
  separator: HTMLElement;
} {
  const onResize = vi.fn<Resize>();
  renderPage(
    <WidthHandle
      label="Width of the list"
      width={width}
      least={224}
      most={640}
      onResize={onResize}
    />,
  );
  return { onResize, separator: screen.getByRole("separator", { name: "Width of the list" }) };
}

/** A pointer event at a place across the screen. */
function pointer(type: string, x: number): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x });
}

describe("WidthHandle", () => {
  it("says the width it holds", () => {
    const { separator } = handle();
    expect(separator).toHaveAttribute("aria-valuenow", "300");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
  });

  it("widens dragged left and narrows dragged right, kept when let go", () => {
    const { onResize, separator } = handle();

    fireEvent(separator, pointer("pointerdown", 1000));
    act(() => {
      window.dispatchEvent(pointer("pointermove", 900));
    });
    expect(onResize).toHaveBeenLastCalledWith(400, false);
    act(() => {
      window.dispatchEvent(pointer("pointermove", 1050));
    });
    expect(onResize).toHaveBeenLastCalledWith(250, false);
    act(() => {
      window.dispatchEvent(pointer("pointerup", 1040));
    });
    expect(onResize).toHaveBeenLastCalledWith(260, true);

    // Let go, the pointer moving no longer resizes.
    onResize.mockClear();
    act(() => {
      window.dispatchEvent(pointer("pointermove", 500));
    });
    expect(onResize).not.toHaveBeenCalled();
  });

  it("holds the width between its least and its most", () => {
    const { onResize, separator } = handle();

    fireEvent(separator, pointer("pointerdown", 1000));
    act(() => {
      window.dispatchEvent(pointer("pointermove", 0));
    });
    expect(onResize).toHaveBeenLastCalledWith(640, false);
    act(() => {
      window.dispatchEvent(pointer("pointerup", 2000));
    });
    expect(onResize).toHaveBeenLastCalledWith(224, true);
  });

  it("steps from the keyboard, Left wider and Right narrower, and ignores other keys", () => {
    const { onResize, separator } = handle();

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(onResize).toHaveBeenLastCalledWith(316, true);
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(onResize).toHaveBeenLastCalledWith(284, true);
    onResize.mockClear();
    fireEvent.keyDown(separator, { key: "ArrowUp" });
    expect(onResize).not.toHaveBeenCalled();
  });
});
