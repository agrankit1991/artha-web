/** Tests for the shell, and the choice it makes on load. */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import {
  ACCOUNT,
  breadth,
  breadthGrid as grid,
  overview,
  moversResponse,
  company,
  fund,
  newsPage,
  offering,
  schemePage,
  scopeOptions,
  stubPlatform,
} from "@/test/support";

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
  "/api/news": { body: newsPage({ total: 0, items: [] }) },
  "/api/news/mentions": { body: [] },
  "/api/series": { body: [] },
  "/api/populations": {
    body: {
      scope_kind: "index",
      scope_key: "NSE_INDEX|Nifty 50",
      name: "Nifty 50",
      category: null,
      description: null,
      instrument_key: "NSE_INDEX|Nifty 50",
      performance: null,
      members: [],
    },
  },
  "/api/figures": { body: { instrument_key: "NSE_INDEX|Nifty 50", points: [] } },
  // Every readable address names the fixture the rest of these replies
  // describe, as the platform's resolver would.
  "/api/references": {
    bodyFor: (path: string) => {
      const [kind = "", reference = ""] = path.split("/").slice(3);
      if (kind === "company") {
        return { kind, key: "NSE_EQ|INE002A01018", name: "Reliance Industries" };
      }
      if (kind === "index") {
        return { kind, key: "NSE_INDEX|Nifty 50", name: "Nifty 50" };
      }
      return { kind, key: decodeURIComponent(reference), name: decodeURIComponent(reference) };
    },
  },
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

    expect(await screen.findByText("Market Movers")).toBeInTheDocument();
  });

  it("returns to the sign-in page at once on signing out", async () => {
    // Leaving the application on screen while the request travels is how a
    // shared machine ends up showing one person's dashboard to the next.
    stubPlatform({ "/api/me": { body: ACCOUNT }, "/api/logout": { status: 204 }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Sign out/ }));

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
      expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument();
    });
  });

  it("names the account in the header, and takes it to a page of its own", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Profile/ }));

    expect(await screen.findByRole("heading", { name: "Tester" })).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("says which build is running, at the foot of every screen", async () => {
    // The first thing worth knowing when a screen disagrees with what the
    // code says it does.
    stubPlatform({
      "/api/me": { body: ACCOUNT },
      "/api/hello": { body: { message: "", service: "artha-platform", version: "0.1.0" } },
      ...DATA,
    });

    render(<App />);

    expect(await screen.findByText("artha-platform 0.1.0")).toBeInTheDocument();
  });

  it("hides the navigation behind a button on a phone", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    const opener = screen.getByRole("button", { name: "Open navigation" });
    await userEvent.click(opener);

    expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();
  });

  it("shuts the navigation again when the page behind it is touched", async () => {
    // On a phone it covers the page, and one left open over the content is
    // the most common way a sidebar gets in the way.
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    const { container } = render(<App />);
    await screen.findByText("Market Movers");
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const overlay = container.querySelector(".bg-black\\/40");
    await userEvent.click(overlay as HTMLElement);

    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
  });

  it("closes the navigation on choosing a screen from it", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");
    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    await userEvent.click(screen.getByRole("link", { name: "Breadth" }));

    expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
  });

  it("opens on the overview", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });

    render(<App />);

    expect(await screen.findByText("Market Movers")).toBeInTheDocument();
  });

  it("moves between screens without reloading the application", async () => {
    // These are places a reader navigates to and bookmarks, which is what
    // makes them routes rather than a piece of component state.
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    await userEvent.click(screen.getByRole("link", { name: "Breadth" }));

    expect(await screen.findByText("Daily Breadth")).toBeInTheDocument();
  });

  it("opens straight onto whichever screen the address names", async () => {
    window.history.pushState({}, "", "/breadth");
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });

    render(<App />);

    expect(await screen.findByText("Daily Breadth")).toBeInTheDocument();
  });

  it("takes the overview's own way through to breadth", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    await userEvent.click(screen.getByRole("button", { name: /See breadth in full/ }));

    expect(await screen.findByText("Daily Breadth")).toBeInTheDocument();
  });

  it("routes to the news page and back", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    await userEvent.click(screen.getByRole("link", { name: "News" }));

    expect(await screen.findByLabelText("Search news")).toBeInTheDocument();
  });

  it("takes the overview's own way through to the feed", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market News");

    await userEvent.click(screen.getByRole("button", { name: /View all news/ }));

    expect(await screen.findByLabelText("Search news")).toBeInTheDocument();
  });

  it("opens an index's own page from its card", async () => {
    stubPlatform({
      "/api/me": { body: ACCOUNT },
      ...DATA,
      "/api/overviews": { body: [overview()] },
    });
    render(<App />);
    // Waiting for the card itself: a card only becomes clickable once its
    // figures have arrived.
    await screen.findAllByText("24,812.40");

    // Scoped to the cards: "Nifty 50" also names a chip in the scope
    // picker further down, which chooses a population rather than opening
    // one.
    const cards = screen.getByRole("region", { name: "Market Indices" });
    const [card] = within(cards).getAllByRole("button");
    await userEvent.click(card as HTMLElement);

    expect(await screen.findByText("Relative strength")).toBeInTheDocument();
  });

  it("opens a company's own page from a list of companies", async () => {
    // Every mover row leads somewhere now, and a list of companies leads
    // to each company.
    stubPlatform({
      "/api/me": { body: ACCOUNT },
      ...DATA,
      "/api/companies/NSE_EQ%7CINE002A01018/fundamentals": { body: [] },
      "/api/companies/NSE_EQ%7CINE002A01018/delivery": { body: [] },
      "/api/deals": { body: [] },
      "/api/companies/NSE_EQ%7CINE002A01018/corporate-actions": { body: [] },
      "/api/companies/NSE_EQ%7CINE002A01018/valuation": { body: null },
      "/api/companies": { body: company() },
      "/api/ipos": { body: [] },
    });
    render(<App />);
    // Awaited on the row rather than the heading: the heading is drawn
    // before the lists under it arrive.
    const [first] = await screen.findAllByRole("link", { name: /RELIANCE/ });

    await userEvent.click(first as HTMLElement);

    expect(await screen.findByText("Reliance Industries")).toBeInTheDocument();
  });

  it("opens the public offerings and the funds from the navigation", async () => {
    stubPlatform({
      "/api/me": { body: ACCOUNT },
      ...DATA,
      "/api/ipos": { body: [offering()] },
      "/api/funds/filters": { body: { categories: [], fund_houses: [] } },
      "/api/funds": { body: schemePage() },
    });
    render(<App />);
    await screen.findByText("Market Movers");

    await userEvent.click(screen.getByRole("link", { name: "IPOs" }));
    expect(await screen.findByText("Initial Public Offerings")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("link", { name: "Funds" }));
    expect(await screen.findByText("Mutual Funds")).toBeInTheDocument();
  });

  it("opens a scheme's own page from the funds list", async () => {
    stubPlatform({
      "/api/me": { body: ACCOUNT },
      ...DATA,
      "/api/ipos": { body: [] },
      "/api/funds/filters": { body: { categories: [], fund_houses: [] } },
      "/api/funds/120503": { body: fund() },
      "/api/funds": { body: schemePage() },
    });
    render(<App />);
    await screen.findByText("Market Movers");
    await userEvent.click(screen.getByRole("link", { name: "Funds" }));
    await screen.findByText("Mutual Funds");

    await userEvent.click(await screen.findByRole("link", { name: /Axis Bluechip/ }));

    expect(await screen.findByText("NAV History")).toBeInTheDocument();
  });

  it("opens a population's own page from the breadth grid", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA, "/api/breadth/grid": { body: grid() } });
    render(<App />);
    await screen.findByText("Market Movers");
    await userEvent.click(screen.getByRole("link", { name: "Breadth" }));
    await screen.findByText("Sector & Index Breadth");

    await userEvent.click(screen.getByRole("link", { name: /IT - Software/ }));

    expect(await screen.findByText("Relative strength")).toBeInTheDocument();
  });

  it("opens the chosen population's own page from the movers", async () => {
    stubPlatform({ "/api/me": { body: ACCOUNT }, ...DATA });
    render(<App />);
    await screen.findByText("Market Movers");

    // The pinned chip appears once the platform has said which
    // populations it ranks.
    await userEvent.click(await screen.findByRole("button", { name: "Nifty 50" }));
    await userEvent.click(await screen.findByRole("button", { name: /Open Nifty 50/ }));

    expect(await screen.findByRole("tab", { name: "Relative strength" })).toBeInTheDocument();
  });
});
