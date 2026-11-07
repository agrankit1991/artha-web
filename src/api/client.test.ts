/** Tests for the typed platform client. */

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  fetchAccount,
  fetchHello,
  fetchMoverList,
  fetchMovers,
  fetchNews,
  fetchOverviews,
  fetchPriceBands,
  fetchScopes,
  fetchSeries,
  signIn,
  signOut,
} from "./client";
import {
  ACCOUNT,
  moversResponse,
  panel,
  priceBands,
  scopeOptions,
  stubPlatform,
} from "@/test/support";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("requests", () => {
  it("names the scope in the query, and omits a key the scope does not take", async () => {
    // A key on a whole-population scope is refused by the platform, so
    // sending one would turn a working screen into a 422.
    const fetchMock = stubPlatform({ "/api/movers": { body: moversResponse() } });

    await fetchMovers("companies", null);
    await fetchMovers("sector", "IT - Software");

    const paths = fetchMock.mock.calls.map((call) => call[0]);
    expect(paths[0]).toContain("scope_kind=companies");
    expect(paths[0]).not.toContain("scope_key");
    expect(paths[1]).toContain("scope_key=IT+-+Software");
  });

  it("asks for each instrument key separately", async () => {
    // Repeated `keys=` rather than one comma-joined value, because an
    // instrument key contains characters a split would break on.
    const fetchMock = stubPlatform({ "/api/overviews": { body: [] } });

    await fetchOverviews(["NSE_EQ|A", "NSE_EQ|B"]);

    const path = String(fetchMock.mock.calls[0]?.[0]);
    expect(path).toContain("keys=NSE_EQ%7CA");
    expect(path).toContain("keys=NSE_EQ%7CB");
  });

  it("sends the session cookie with every request", async () => {
    // The session is a cookie, so a request that omits it is a request
    // from nobody.
    const fetchMock = stubPlatform({ "/api/me": { body: ACCOUNT } });

    await fetchAccount();

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "same-origin" });
  });

  it("reads an empty response without trying to parse it", async () => {
    // Signing out answers 204, and calling json() on that throws.
    stubPlatform({ "/api/logout": { status: 204 } });

    await expect(signOut()).resolves.toBeUndefined();
  });

  it("reaches the endpoints it says it does", async () => {
    const fetchMock = stubPlatform({
      "/api/hello": { body: { message: "", service: "", version: "" } },
      "/api/login": { body: ACCOUNT },
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers/top-gainers": { body: panel() },
      "/api/news": { body: [] },
    });

    await fetchHello();
    await signIn("tester@example.com", "a long enough passphrase");
    await fetchScopes();
    await fetchMoverList("top-gainers", "companies", null);
    await fetchNews();

    expect(fetchMock.mock.calls.map((call) => call[0].split("?")[0])).toEqual([
      "/api/hello",
      "/api/login",
      "/api/movers/scopes",
      "/api/movers/top-gainers",
      "/api/news",
    ]);
  });

  it("asks for every series in one request, over one window", async () => {
    // Two requests could return windows ending on different sessions, and
    // the two lines would then be compared as though they matched.
    const fetchMock = stubPlatform({ "/api/series": { body: [] } });

    await fetchSeries(["NSE_INDEX|Nifty 50", "NSE_EQ|INF204KB17I5"], 90);

    const path = String(fetchMock.mock.calls[0]?.[0]);
    expect(path).toContain("sessions=90");
    expect(path).toContain("keys=NSE_INDEX%7CNifty+50");
    expect(path).toContain("keys=NSE_EQ%7CINF204KB17I5");
  });
});

describe("failures", () => {
  it("carries the platform's own explanation", async () => {
    // "that invitation is not valid" says more than 403 ever will.
    stubPlatform({
      "/api/login": { status: 403, body: { detail: "that invitation is not valid" } },
    });

    await expect(signIn("a@b.com", "password")).rejects.toThrow("that invitation is not valid");
  });

  it("falls back to the status when there is no explanation", async () => {
    // A proxy error page has no JSON body at all.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error("not json")),
      }),
    );

    await expect(fetchAccount()).rejects.toThrow("status 502");
  });

  it("falls back when the explanation is not a sentence", async () => {
    // FastAPI's validation errors put a list in `detail`.
    stubPlatform({ "/api/me": { status: 422, body: { detail: [{ msg: "bad" }] } } });

    await expect(fetchAccount()).rejects.toThrow("status 422");
  });

  it("distinguishes not being signed in from anything else going wrong", async () => {
    // One means show the sign-in page; the other means show the failure.
    stubPlatform({ "/api/me": { status: 401, body: { detail: "not signed in" } } });

    await expect(fetchAccount()).rejects.toMatchObject({ status: 401 });
    expect(new ApiError(401, "x").isUnauthorised).toBe(true);
    expect(new ApiError(500, "x").isUnauthorised).toBe(false);
  });
});

describe("fetchPriceBands", () => {
  it("asks for one instrument's bands by its key", async () => {
    const fetchMock = stubPlatform({ "/api/price-bands": { body: priceBands() } });

    const bands = await fetchPriceBands("NSE_EQ|INE002A01018");

    expect(bands?.points).toHaveLength(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("instrument_key=NSE_EQ%7CINE002A01018");
  });

  it("answers null for an instrument with no forecast", async () => {
    stubPlatform({ "/api/price-bands": { status: 404 } });

    await expect(fetchPriceBands("NSE_EQ|X")).resolves.toBeNull();
  });

  it("still fails on anything but having no forecast", async () => {
    stubPlatform({ "/api/price-bands": { status: 500 } });

    await expect(fetchPriceBands("NSE_EQ|X")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("fetchScreenKeys", () => {
  it("collects a whole screen in the platform's largest pages, in order", async () => {
    const { fetchScreenKeys } = await import("./client");
    const total = 450;
    const fetched = vi.fn((path: string) => {
      const query = new URLSearchParams(path.split("?")[1]);
      const offset = Number(query.get("offset"));
      const limit = Number(query.get("limit"));
      const items = Array.from({ length: Math.min(limit, total - offset) }, (_, at) => ({
        instrument_key: `NSE_EQ|${String(offset + at)}`,
      }));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ total, items }),
      } as Response);
    });
    vi.stubGlobal("fetch", fetched);

    const keys = await fetchScreenKeys(
      { conditions: [], scope_kind: "companies", scope_key: "all", sort: null, order: "desc" },
      1_000,
    );

    expect(keys).toHaveLength(450);
    expect(keys[0]).toBe("NSE_EQ|0");
    expect(keys[449]).toBe("NSE_EQ|449");
    // 200 first; then the rest asked for together, never more than the cap.
    const asked = fetched.mock.calls.map(([path]) => {
      const query = new URLSearchParams(path.split("?")[1]);
      return [query.get("offset"), query.get("limit")];
    });
    expect(asked).toEqual([
      ["0", "200"],
      ["200", "200"],
      ["400", "50"],
    ]);
  });

  it("asks for no more than are wanted", async () => {
    const { fetchScreenKeys } = await import("./client");
    const fetched = vi.fn<(path: string) => Promise<Response>>(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ total: 9_000, items: [{ instrument_key: "NSE_EQ|0" }] }),
      } as Response),
    );
    vi.stubGlobal("fetch", fetched);

    await fetchScreenKeys(
      { conditions: [], scope_kind: "companies", scope_key: "all", sort: null, order: "desc" },
      5,
    );

    expect(fetched).toHaveBeenCalledTimes(1);
    expect(fetched.mock.calls[0]?.[0]).toContain("limit=5");
  });
});
