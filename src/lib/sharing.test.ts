/** Tests for what a share card fetches. */

import { afterEach, describe, expect, it, vi } from "vitest";

import { monthOfCloses } from "./sharing";
import { priceSeries, stubPlatform } from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("monthOfCloses", () => {
  it("asks for a month and returns the closes as numbers, oldest first", async () => {
    const fetched = stubPlatform({
      "/api/series": { body: [priceSeries("NSE_EQ|INE002A01018", [100, 101.5, 99])] },
    });

    const closes = await monthOfCloses("NSE_EQ|INE002A01018");

    expect(closes).toEqual([100, 101.5, 99]);
    expect(String(fetched.mock.calls[0]?.[0])).toContain("sessions=22");
  });

  it("returns nothing for an instrument with no series", async () => {
    stubPlatform({ "/api/series": { body: [] } });

    expect(await monthOfCloses("NSE_EQ|nowhere")).toEqual([]);
  });
});
