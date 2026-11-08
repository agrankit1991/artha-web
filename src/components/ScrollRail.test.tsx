/** Tests for the scrollbar kept in view beside a long list. */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ScrollRail } from "./ScrollRail";

function Box(): React.JSX.Element {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  return (
    <div>
      <div ref={setBox} data-testid="box" />
      <ScrollRail target={box} items={10} />
    </div>
  );
}

/**
 * Lay the box out: how tall its content is, how tall it is, where it is
 * scrolled to; then say it scrolled, so the rail measures it again.
 */
function layOut(
  content: number,
  shown: number,
  scrolled: number,
): { scrolledTo: () => number; scrollBy: ReturnType<typeof vi.fn> } {
  const box = screen.getByTestId("box");
  let top = scrolled;
  const scrollBy = vi.fn();
  Object.defineProperty(box, "scrollHeight", { value: content, configurable: true });
  Object.defineProperty(box, "clientHeight", { value: shown, configurable: true });
  Object.defineProperty(box, "scrollTop", {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
    configurable: true,
  });
  Object.assign(box, { scrollBy });
  fireEvent.scroll(box);
  return { scrolledTo: () => top, scrollBy };
}

/** A pointer event at a height on the screen. */
function pointer(type: string, y: number): MouseEvent {
  return new MouseEvent(type, { bubbles: true, cancelable: true, clientY: y });
}

describe("ScrollRail", () => {
  it("draws nothing while everything is in view", () => {
    render(<Box />);
    layOut(250, 250, 0);
    expect(screen.queryByTestId("scroll-rail")).toBeNull();
  });

  it("draws a thumb as long as the share in view, where the box is scrolled to", () => {
    render(<Box />);
    // A quarter in view, scrolled half way through the rest.
    layOut(1000, 250, 375);
    expect(screen.getByTestId("scroll-thumb")).toHaveStyle({ height: "25%", top: "37.5%" });
    expect(screen.getByTestId("scroll-rail")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps a thumb long enough to take hold of on a very long list", () => {
    render(<Box />);
    layOut(10_000, 250, 0);
    expect(screen.getByTestId("scroll-thumb")).toHaveStyle({ height: "8%", top: "0%" });
  });

  it("scrolls the box as the thumb is dragged, and stops when it is let go", () => {
    render(<Box />);
    const box = layOut(1000, 250, 375);
    Object.defineProperty(screen.getByTestId("scroll-rail"), "clientHeight", {
      value: 200,
      configurable: true,
    });

    fireEvent(screen.getByTestId("scroll-thumb"), pointer("pointerdown", 100));
    act(() => {
      window.dispatchEvent(pointer("pointermove", 150));
    });
    // Fifty pixels of a two-hundred-pixel rail: a quarter of a thousand.
    expect(box.scrolledTo()).toBe(625);

    act(() => {
      window.dispatchEvent(pointer("pointerup", 150));
    });
    act(() => {
      window.dispatchEvent(pointer("pointermove", 190));
    });
    expect(box.scrolledTo()).toBe(625);
  });

  it("moves the box a height towards a press on the rail beside the thumb", () => {
    render(<Box />);
    const box = layOut(1000, 250, 375);
    const rail = screen.getByTestId("scroll-rail");
    rail.getBoundingClientRect = () => ({ top: 0, height: 100 }) as DOMRect;

    fireEvent(rail, pointer("pointerdown", 10));
    expect(box.scrollBy).toHaveBeenLastCalledWith({ top: -250 });
    fireEvent(rail, pointer("pointerdown", 90));
    expect(box.scrollBy).toHaveBeenLastCalledWith({ top: 250 });
  });
});
