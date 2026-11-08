/** Tests for following a media query. */

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery";

afterEach(() => {
  vi.restoreAllMocks();
});

function Matching(): React.JSX.Element {
  return <p>{useMediaQuery("(min-width: 1280px)") ? "wide" : "narrow"}</p>;
}

describe("useMediaQuery", () => {
  it("says whether the query matches, and follows it as the window changes", () => {
    let matches = false;
    const listeners = new Set<() => void>();
    const removed = vi.fn();
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query) =>
        ({
          get matches() {
            return matches;
          },
          media: query,
          addEventListener: (_: string, listener: () => void) => {
            listeners.add(listener);
          },
          removeEventListener: removed,
        }) as unknown as MediaQueryList,
    );

    const { unmount } = render(<Matching />);
    expect(screen.getByText("narrow")).toBeInTheDocument();

    matches = true;
    act(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    expect(screen.getByText("wide")).toBeInTheDocument();

    unmount();
    expect(removed).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
