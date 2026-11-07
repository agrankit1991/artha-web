import { afterEach, describe, expect, it, vi } from "vitest";

import { stubPlatform } from "@/test/support";
import { listText, partsOf, symbolsFor } from "@/lib/tradingViewList";

/** What the platform calls each key on TradingView, for the stub to answer. */
const KNOWN: Record<string, { symbol: string; derived: boolean }> = {
  "NSE_EQ|A": { symbol: "NSE:AAA", derived: false },
  "NSE_EQ|B": { symbol: "NSE:BBB", derived: true },
  // Two instruments TradingView calls the same thing.
  "BSE_EQ|A": { symbol: "NSE:AAA", derived: false },
};

/** Answer an external-symbols request for the keys it names. */
function answer(path: string): unknown {
  const keys = new URLSearchParams(path.split("?")[1]).getAll("keys");
  return keys.flatMap((key) => {
    const one = KNOWN[key];
    return one === undefined
      ? []
      : [
          {
            instrument_key: key,
            provider: "tradingview",
            symbol: one.symbol,
            derived: one.derived,
          },
        ];
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("symbolsFor", () => {
  it("names each symbol once, in order, and counts the guessed and the missing", async () => {
    stubPlatform({ "/api/external-symbols": { bodyFor: answer } });

    await expect(
      symbolsFor(["NSE_EQ|B", "NSE_EQ|A", "BSE_EQ|A", "NSE_EQ|none", "NSE_EQ|B"]),
    ).resolves.toEqual({ symbols: ["NSE:BBB", "NSE:AAA"], unconfirmed: 1, missing: 1 });
  });

  it("asks fifty at a time", async () => {
    const platform = stubPlatform({ "/api/external-symbols": { bodyFor: answer } });
    const keys = Array.from({ length: 120 }, (_, at) => `NSE_EQ|${String(at)}`);

    const found = await symbolsFor(keys);

    expect(platform).toHaveBeenCalledTimes(3);
    expect(found.missing).toBe(120);
  });
});

describe("partsOf", () => {
  it("cuts a list into parts of the chosen size", () => {
    expect(partsOf(["a", "b", "c", "d", "e"], "30")).toEqual([["a", "b", "c", "d", "e"]]);
    const long = Array.from({ length: 65 }, (_, at) => String(at));
    expect(partsOf(long, "30").map((part) => part.length)).toEqual([30, 30, 5]);
  });

  it("keeps a list whole for all, and has no parts for nothing", () => {
    const long = Array.from({ length: 1200 }, (_, at) => String(at));
    expect(partsOf(long, "all")).toHaveLength(1);
    expect(partsOf([], "all")).toEqual([]);
    expect(partsOf([], "200")).toEqual([]);
  });
});

describe("listText", () => {
  it("writes symbols comma-separated without spaces", () => {
    expect(listText(["NSE:AAA", "NSE:BBB"])).toBe("NSE:AAA,NSE:BBB");
  });
});
