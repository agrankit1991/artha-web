/** Tests for what the reader has chosen once. */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PREFERENCES,
  forgetForTests,
  parse,
  readPreferences,
  resetPreferences,
  usePreferences,
  writePreferences,
} from "./preferences";

beforeEach(() => {
  window.localStorage.clear();
  forgetForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("preferences", () => {
  it("start as the defaults, and a change is kept for the next visit", () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);

    writePreferences({ range: 65, chartStyle: "candles" });
    forgetForTests();

    expect(readPreferences()).toEqual({ ...DEFAULT_PREFERENCES, range: 65, chartStyle: "candles" });
    resetPreferences();
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it("re-render whoever reads them when they change", () => {
    const { result } = renderHook(() => usePreferences());
    expect(result.current.scope.kind).toBe("companies");

    act(() => {
      writePreferences({ scope: { kind: "index", key: "NSE_INDEX|Nifty 50" } });
    });

    expect(result.current.scope).toEqual({ kind: "index", key: "NSE_INDEX|Nifty 50" });
  });

  it("keep only what this version understands", () => {
    expect(parse(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parse("junk")).toEqual(DEFAULT_PREFERENCES);
    expect(
      parse({
        scope: { kind: "galaxy", key: "x" },
        chartStyle: "heikin",
        overlays: ["sma_20", "bogus", 7],
        range: 999,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, overlays: ["sma_20"] });
    expect(parse({ scope: { kind: "sector" } }).scope).toEqual({ kind: "sector", key: null });
    expect(parse({ overlays: "sma_20" }).overlays).toEqual(DEFAULT_PREFERENCES.overlays);
  });

  it("hold for the visit when storage refuses, and read defaults when it is unreadable", () => {
    window.localStorage.setItem("artha.preferences", "{not json");
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    writePreferences({ range: 21 });
    expect(readPreferences().range).toBe(21);
  });

  it("shows the forecast band unless it was turned off", () => {
    expect(parse({}).forecast).toBe(true);
    expect(parse({ forecast: false }).forecast).toBe(false);
    expect(parse({ forecast: "no" }).forecast).toBe(true);
  });

  it("keeps each page's layout, and only layouts that exist", () => {
    const read = parse({ views: { indices: "grouped", movers: "table", watchlists: 3 } });

    expect(read.views).toEqual({ indices: "grouped" });
    expect(parse({ views: "grouped" }).views).toEqual({});
  });

  it("keeps the heatmap's columns in order, and drops any that name no population", () => {
    // Left unchosen, the headline indices are what the platform says they are.
    expect(parse({}).participation).toBeNull();
    expect(parse({ participation: "Nifty 50" }).participation).toBeNull();

    const read = parse({
      participation: [
        { kind: "sector", key: "Pharmaceuticals" },
        { kind: "companies", key: null },
        // An index without its key would fail the whole request.
        { kind: "index" },
        { kind: "galaxy", key: "x" },
        "junk",
        { kind: "index", key: "NSE_INDEX|Nifty 50" },
      ],
    });

    expect(read.participation).toEqual([
      { kind: "sector", key: "Pharmaceuticals" },
      { kind: "companies", key: null },
      { kind: "index", key: "NSE_INDEX|Nifty 50" },
    ]);
  });
});
