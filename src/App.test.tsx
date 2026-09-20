/** Tests for the shell, and the choice it makes on load. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { ACCOUNT, breadth, moversResponse, scopeOptions, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
});

const DATA = {
  "/api/movers/scopes": { body: scopeOptions() },
  "/api/movers": { body: moversResponse() },
  "/api/overviews": { body: [] },
  "/api/breadth": { body: breadth() },
  "/api/news": { body: [] },
  "/api/series": { body: [] },
};

describe("App", () => {
  it("asks the platform who is signed in rather than guessing", async () => {
    // The session cookie is HttpOnly, so this side cannot read it. Asking
    // is the only honest way to know, and it is one request.
    const fetchMock = stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Tester")).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls.some((call) => String(call[0]) === "/api/me")).toBe(true);
  });

  it("shows the sign-in page when nobody is", async () => {
    stubPlatform({ "/api/me": { status: 401, body: { detail: "not signed in" } } });

    render(<App />);

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("goes straight into the application once someone signs in", async () => {
    stubPlatform({
      "/api/me": { status: 401, body: { detail: "not signed in" } },
      "/api/login": { body: ACCOUNT },
      ...DATA,
    });
    render(<App />);
    await screen.findByRole("button", { name: "Sign in" });

    await userEvent.type(screen.getByLabelText("Email"), "tester@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "a long enough passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Market movers")).toBeInTheDocument();
  });

  it("returns to the sign-in page at once on signing out", async () => {
    // Leaving the application on screen while the request travels is how a
    // shared machine ends up showing one person's dashboard to the next.
    stubPlatform({ "/api/me": { body: ACCOUNT }, "/api/logout": { status: 204 }, ...DATA });
    render(<App />);
    await screen.findByText("Market movers");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("waits before deciding, rather than flashing the sign-in page", () => {
    // Showing the sign-in form for a moment to someone who is signed in is
    // the most common way an application like this feels broken.
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise(() => undefined)),
    );

    render(<App />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("offers the theme control wherever the application is", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    });
  });

  it("opens on the overview", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });

    render(<App />);

    expect(await screen.findByText("Market movers")).toBeInTheDocument();
  });

  it("moves between screens without reloading the application", async () => {
    // These are places a reader navigates to and bookmarks, which is what
    // makes them routes rather than a piece of component state.
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market movers");

    await userEvent.click(screen.getByRole("link", { name: "Breadth" }));

    expect(await screen.findByText("Session by session")).toBeInTheDocument();
  });

  it("opens straight onto whichever screen the address names", async () => {
    window.history.pushState({}, "", "/breadth");
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });

    render(<App />);

    expect(await screen.findByText("Session by session")).toBeInTheDocument();
  });

  it("takes the overview's own way through to breadth", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market movers");

    await userEvent.click(screen.getByRole("button", { name: /See breadth in full/ }));

    expect(await screen.findByText("Session by session")).toBeInTheDocument();
  });
});
