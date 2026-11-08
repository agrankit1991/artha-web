/** Tests for fitting one thing's height so the element holding it comes to a target. */

import { act, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFittedHeight } from "./useFittedHeight";

/** Every observer made, so a test can say the element was resized. */
let observers: { fit: () => void; watched: Element[]; disconnect: () => void }[] = [];

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      readonly watched: Element[] = [];
      readonly disconnect = vi.fn();
      constructor(readonly fit: () => void) {
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

/** What else the element holds beside the thing fitted: its toolbars, say. */
const BESIDE = 200;

function Fitted({
  target,
  initial = 360,
  least = 120,
}: {
  target: number | null;
  initial?: number;
  least?: number;
}): React.JSX.Element {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const height = useFittedHeight(element, target, initial, least);
  return (
    <div ref={setElement} data-testid="cell" data-height={height}>
      {height}
    </div>
  );
}

/** Lay the element out as tall as what it holds: its company and the height. */
function layOut(): void {
  const cell = screen.getByTestId("cell");
  Object.defineProperty(cell, "offsetHeight", {
    get: () => BESIDE + Number(cell.dataset.height),
    configurable: true,
  });
}

/** Say the element was resized. */
function resized(): void {
  act(() => {
    for (const observer of observers) {
      observer.fit();
    }
  });
}

describe("useFittedHeight", () => {
  it("takes what the target leaves after everything else, and holds there", () => {
    const { rerender } = render(<Fitted target={null} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("360");
    layOut();

    rerender(<Fitted target={800} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("600");
    // At the target, fitting again changes nothing.
    resized();
    expect(screen.getByTestId("cell")).toHaveTextContent("600");
    expect(observers.at(-1)?.watched).toEqual([screen.getByTestId("cell")]);

    rerender(<Fitted target={1000} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("800");
  });

  it("fits again when what the element holds changes", () => {
    const { rerender } = render(<Fitted target={null} />);
    layOut();
    rerender(<Fitted target={800} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("600");

    // A toolbar wrapping onto another line takes fifty pixels more.
    const cell = screen.getByTestId("cell");
    Object.defineProperty(cell, "offsetHeight", {
      get: () => BESIDE + 50 + Number(cell.dataset.height),
      configurable: true,
    });
    resized();
    expect(cell).toHaveTextContent("550");
  });

  it("never goes under its least, however small the target", () => {
    const { rerender } = render(<Fitted target={null} least={150} />);
    layOut();
    rerender(<Fitted target={300} least={150} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("150");
  });

  it("starts again from a new initial height, and when the target goes", () => {
    const { rerender } = render(<Fitted target={null} />);
    layOut();
    rerender(<Fitted target={800} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("600");

    rerender(<Fitted target={null} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("360");
    rerender(<Fitted target={null} initial={240} />);
    expect(screen.getByTestId("cell")).toHaveTextContent("240");
  });

  it("stops watching once it is gone", () => {
    const { unmount } = render(<Fitted target={800} />);
    unmount();
    expect(observers.at(-1)?.disconnect).toHaveBeenCalled();
  });

  it("keeps its initial height until the element is drawn", () => {
    function Unplaced(): React.JSX.Element {
      return <p>{useFittedHeight(null, 800, 280, 100)}</p>;
    }
    render(<Unplaced />);
    expect(screen.getByText("280")).toBeInTheDocument();
    expect(observers).toEqual([]);
  });
});
