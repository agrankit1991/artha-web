import { describe, expect, it, vi } from "vitest";

import { collectKeys, holdsNothing, presentKeys } from "@/lib/keySource";

describe("collectKeys", () => {
  it("keeps a held list's order, each key once", async () => {
    await expect(collectKeys(["B", "A", "B", "C"], 10)).resolves.toEqual({
      keys: ["B", "A", "C"],
      over: false,
    });
  });

  it("takes as many as are wanted and says when there were more", async () => {
    await expect(collectKeys(["A", "B", "C"], 2)).resolves.toEqual({
      keys: ["A", "B"],
      over: true,
    });
    // Exactly as many as wanted is not over.
    await expect(collectKeys(["A", "B"], 2)).resolves.toEqual({ keys: ["A", "B"], over: false });
  });

  it("asks a fetching function for one more than it takes, to know when a list overruns", async () => {
    const fetch = vi.fn((most: number) => Promise.resolve(["A", "B", "C", "D"].slice(0, most)));

    await expect(collectKeys(fetch, 3)).resolves.toEqual({ keys: ["A", "B", "C"], over: true });
    expect(fetch).toHaveBeenCalledWith(4);
  });

  it("passes on what a fetching function throws", async () => {
    await expect(collectKeys(() => Promise.reject(new Error("refused")), 3)).rejects.toThrow(
      "refused",
    );
  });
});

describe("holdsNothing", () => {
  it("is true only for an empty list of keys", () => {
    expect(holdsNothing([])).toBe(true);
    expect(holdsNothing(["A"])).toBe(false);
    // A function might still find some.
    expect(holdsNothing(() => Promise.resolve([]))).toBe(false);
  });
});

describe("presentKeys", () => {
  it("drops the rows with no key and keeps the order", () => {
    expect(presentKeys(["B", null, "A", null])).toEqual(["B", "A"]);
    expect(presentKeys([null])).toEqual([]);
  });
});
