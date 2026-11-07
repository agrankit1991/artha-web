import { describe, expect, it } from "vitest";

import { keptFromParams, keptParams, sameKept, withoutKept } from "@/lib/keptLists";

describe("keptFromParams", () => {
  it("reads a kept list and where it was opened from, keys with colons and all", () => {
    const params = new URLSearchParams({
      kept: "index",
      key: "NSE_INDEX|Nifty 50",
      from: "indices:SECTORAL",
    });
    expect(keptFromParams(params)).toEqual({
      source: { kind: "index", key: "NSE_INDEX|Nifty 50" },
      from: { kind: "indices", key: "SECTORAL" },
    });
    expect(
      keptFromParams(new URLSearchParams({ kept: "sector", key: "IT", from: "sector:A: B" }))?.from,
    ).toEqual({ kind: "sector", key: "A: B" });
  });

  it("names nothing when the kind is unknown, the key missing, or the way back malformed", () => {
    expect(keptFromParams(new URLSearchParams())).toBeNull();
    expect(keptFromParams(new URLSearchParams({ kept: "funds", key: "x" }))).toBeNull();
    expect(keptFromParams(new URLSearchParams({ kept: "sector", key: "" }))).toBeNull();
    for (const from of ["sector", ":x", "funds:x", "sector:"]) {
      expect(keptFromParams(new URLSearchParams({ kept: "sector", key: "IT", from }))?.from).toBe(
        null,
      );
    }
  });
});

describe("keptParams and withoutKept", () => {
  it("replace the reader's own list with a kept one, and take it out again", () => {
    const start = new URLSearchParams({ list: "3", view: "table" });

    const shown = keptParams(start, { kind: "movers", key: "top-gainers" });
    expect(Object.fromEntries(shown)).toEqual({
      view: "table",
      kept: "movers",
      key: "top-gainers",
    });

    const opened = keptParams(
      shown,
      { kind: "index", key: "NSE_INDEX|Nifty Bank" },
      { kind: "indices", key: "SECTORAL" },
    );
    expect(opened.get("from")).toBe("indices:SECTORAL");
    expect(keptParams(opened, { kind: "sector", key: "IT" }).has("from")).toBe(false);

    expect(Object.fromEntries(withoutKept(opened))).toEqual({ view: "table" });
  });
});

describe("sameKept", () => {
  it("compares kind and key, and nothing with nothing", () => {
    expect(sameKept({ kind: "sector", key: "IT" }, { kind: "sector", key: "IT" })).toBe(true);
    expect(sameKept({ kind: "sector", key: "IT" }, { kind: "index", key: "IT" })).toBe(false);
    expect(sameKept({ kind: "sector", key: "IT" }, null)).toBe(false);
  });
});
