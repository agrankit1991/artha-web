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
  fetchScopes,
  fetchSeries,
  signIn,
  signOut,
} from "./client";
import { ACCOUNT, moversResponse, panel, scopeOptions, stubPlatform } from "@/test/support";

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

    const paths = fetchMock.mock.calls.map((call) => String(call[0]));
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

    expect(fetchMock.mock.calls.map((call) => String(call[0]).split("?")[0])).toEqual([
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
