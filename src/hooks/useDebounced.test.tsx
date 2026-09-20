/** Tests for letting a value settle. */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebounced } from "./useDebounced";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebounced", () => {
  it("holds the first value until anything changes", () => {
    const { result } = renderHook(() => useDebounced("rel"));

    expect(result.current).toBe("rel");
  });

  it("waits for typing to stop before following", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), {
      initialProps: { value: "r" },
    });

    rerender({ value: "re" });
    rerender({ value: "rel" });
    expect(result.current).toBe("r");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("rel");
  });

  it("never settles on a value that was typed through", () => {
    // The reason this exists: a request per keystroke races its own
    // answers, and "rel" can come back after "relian".
    const { result, rerender } = renderHook(({ value }) => useDebounced(value, 300), {
      initialProps: { value: "r" },
    });

    rerender({ value: "re" });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender({ value: "rel" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("r");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("rel");
  });
});
