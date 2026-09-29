/** Tests for the identifier this browser keeps for itself. */

import { afterEach, describe, expect, it, vi } from "vitest";

import { visitorId } from "./visitor";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("visitorId", () => {
  it("makes one identifier and keeps it", () => {
    const first = visitorId();

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(visitorId()).toBe(first);
    expect(window.localStorage.getItem("artha.visitor")).toBe(first);
  });

  it("replaces one that storage has mangled rather than sending it", () => {
    window.localStorage.setItem("artha.visitor", "not an identifier");

    expect(visitorId()).not.toBe("not an identifier");
  });

  it("keeps one for the page when storage refuses", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage refused");
    });

    const first = visitorId();

    expect(visitorId()).toBe(first);
  });
});
