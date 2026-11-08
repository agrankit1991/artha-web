/** Tests for measuring the room from an element's top to the window's bottom. */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHeightToViewportBottom } from "./useHeightToViewportBottom";

/** Every observer made, so a test can say the page was resized. */
let observers: { measure: () => void; watched: Element[]; disconnect: () => void }[] = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      readonly watched: Element[] = [];
      readonly disconnect = vi.fn();
      constructor(readonly measure: () => void) {
        observers.push(this);
      }
      observe(element: Element): void {
        this.watched.push(element);
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Measured({ margin = 16 }: { margin?: number }): React.JSX.Element {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const room = useHeightToViewportBottom(element, margin);
  return (
    <div ref={setElement} data-testid="view">
      {room}
    </div>
  );
}

/**
 * Lay the page out: the window's height, how far it is scrolled, and where
 * the element's top is in the window.
 */
function layOut({
  window: tall,
  scrolled,
  top,
}: {
  window: number;
  scrolled: number;
  top: number;
}): void {
  vi.stubGlobal("innerHeight", tall);
  vi.stubGlobal("scrollY", scrolled);
  screen.getByTestId("view").getBoundingClientRect = () => ({ top }) as DOMRect;
}

describe("useHeightToViewportBottom", () => {
  it("measures from the element's top to the window's bottom, less the margin", () => {
    render(<Measured />);
    layOut({ window: 1000, scrolled: 0, top: 200 });
    fireEvent(window, new Event("resize"));
    expect(screen.getByTestId("view")).toHaveTextContent("784");
  });

  it("measures from where the element starts on the page, however far it is scrolled", () => {
    render(<Measured />);
    layOut({ window: 1000, scrolled: 300, top: -100 });
    fireEvent(window, new Event("resize"));
    expect(screen.getByTestId("view")).toHaveTextContent("784");
  });

  it("measures again when the page changes size, and never under nought", () => {
    render(<Measured margin={0} />);
    expect(observers.flatMap((one) => one.watched)).toEqual([document.body]);

    layOut({ window: 100, scrolled: 0, top: 400 });
    act(() => {
      for (const observer of observers) {
        observer.measure();
      }
    });
    expect(screen.getByTestId("view")).toHaveTextContent("0");
  });

  it("stops listening once it is gone", () => {
    const removed = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Measured />);
    unmount();
    expect(removed).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(observers.at(-1)?.disconnect).toHaveBeenCalled();
  });

  it("is nought until there is an element to measure", () => {
    function Unplaced(): React.JSX.Element {
      return <p>{useHeightToViewportBottom(null, 16)}</p>;
    }
    render(<Unplaced />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(observers).toEqual([]);
  });
});
