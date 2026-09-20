/** Tests for the overview page. */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Overview } from "./Overview";
import { ThemeProvider } from "@/lib/theme";
import {
  breadth,
  chartPoints,
  moverRow,
  moversResponse,
  newsPage,
  overview,
  panel,
  priceSeries,
  scopeOptions,
  stubPlatform,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Render the overview as the shell does: inside the theme it lives in. */
function renderOverview(props: Parameters<typeof Overview>[0] = {}): void {
  render(
    <ThemeProvider>
      <Overview {...props} />
    </ThemeProvider>,
  );
}

function stubEverything(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/movers/scopes": { body: scopeOptions() },
    "/api/movers": {
      body: moversResponse([
        panel(),
        panel({ name: "unusual-volume", rows: [moverRow({ value: "4.23" })] }),
      ]),
    },
    "/api/overviews": {
      body: [overview(), overview({ instrument_key: "BSE_INDEX|SENSEX" })],
    },
    "/api/breadth": { body: breadth() },
    "/api/news": { body: newsPage() },
    "/api/figures": { body: { instrument_key: "NSE_INDEX|Nifty 50", points: chartPoints(30) } },
    "/api/series": {
      body: [
        priceSeries("NSE_INDEX|Nifty 50", [100, 110]),
        priceSeries("NSE_EQ|INF204KB17I5", [200, 190]),
      ],
    },
  });
}

describe("Overview", () => {
  it("shows the headline indices as cards, in their settled order", async () => {
    stubEverything();

    renderOverview();

    await screen.findAllByText("24,812.40");
    const cards = screen.getByRole("region", { name: "Market indices" });
    const names = within(cards)
      .getAllByText(/Nifty|Sensex|Bank Nifty|India VIX/)
      .map((element) => element.textContent);
    expect(names.slice(0, 3)).toEqual(["Nifty 50", "Sensex", "Nifty Next 50"]);
    expect(names).toContain("India VIX");
  });

  it("asks for every featured index in one request", async () => {
    // Eight requests to draw one row of cards is eight chances for the row
    // to arrive in pieces.
    const fetchMock = stubEverything();

    renderOverview();

    await waitFor(() => {
      const asked = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .find((path) => path.startsWith("/api/overviews"));
      expect(asked).toBeDefined();
      expect(asked?.match(/keys=/g)).toHaveLength(8);
    });
  });

  it("draws every list the platform returned", async () => {
    // One request brings all of them, so the page arrives whole rather
    // than panel by panel.
    stubEverything();

    renderOverview();

    expect(await screen.findByText("Top gainers")).toBeInTheDocument();
    expect(screen.getByText("Unusual volume")).toBeInTheDocument();
  });

  it("re-ranks when the scope changes, and says which scope it asked for", async () => {
    const fetchMock = stubEverything();
    renderOverview();
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "IT - Software" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("scope_key=IT+-+Software"))).toBe(true);
    });
  });

  it("ranks the indices against each other, not only the companies", async () => {
    const fetchMock = stubEverything();
    renderOverview();
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("button", { name: "Indices" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.includes("/api/movers?") && path.includes("scope_kind=indices")),
      ).toBe(true);
    });
  });

  it("shows breadth beside the lists, for the same population", async () => {
    // An index rising on five companies while four hundred fall is exactly
    // what the lists alone cannot show.
    stubEverything();

    renderOverview();

    expect(await screen.findByText("Market breadth")).toBeInTheDocument();
    expect(screen.getByText("60 advancing")).toBeInTheDocument();
  });

  it("offers the way through to breadth in full", async () => {
    stubEverything();
    const open = vi.fn();
    renderOverview({ onOpenBreadth: open });
    await screen.findByText("Market breadth");

    await userEvent.click(screen.getByRole("button", { name: /See breadth in full/ }));

    expect(open).toHaveBeenCalled();
  });

  it("shows what was published about the market", async () => {
    stubEverything();

    renderOverview();

    expect(await screen.findByText("Refiners lead the index higher")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    // An empty overview and a broken one look identical otherwise, and the
    // second is the one worth knowing about.
    stubPlatform({
      "/api/movers/scopes": { body: scopeOptions() },
      "/api/movers": { status: 500, body: { detail: "the lists are being rebuilt" } },
      "/api/overviews": { body: [] },
      "/api/breadth": { body: breadth() },
      "/api/news": { body: newsPage({ total: 0, items: [] }) },
      "/api/figures": { body: { instrument_key: "NSE_INDEX|Nifty 50", points: chartPoints(30) } },
      "/api/series": { body: [] },
    });

    renderOverview();

    expect(await screen.findByRole("alert")).toHaveTextContent("the lists are being rebuilt");
  });

  it("passes a chosen instrument on to whoever asked for it", async () => {
    stubEverything();
    const chosen = vi.fn();
    renderOverview({ onSelect: chosen });
    await screen.findByText("Top gainers");

    const [firstPanel] = screen.getAllByRole("table");
    const [, firstRow] = within(firstPanel as HTMLElement).getAllByRole("row");
    await userEvent.click(firstRow as HTMLElement);

    expect(chosen).toHaveBeenCalledWith(expect.objectContaining({ symbol: "RELIANCE" }));
  });

  it("draws the benchmark's own sessions, with this platform's averages", async () => {
    // The chart shows the values a rule would fire on rather than ones it
    // worked out for itself in the browser.
    stubEverything();

    renderOverview();

    expect(await screen.findByText("200-day")).toBeInTheDocument();
  });

  it("compares the benchmark against gold when asked to", async () => {
    // Different orders of magnitude on one price axis is one line and a
    // floor, so both are rebased to the session they share.
    stubEverything();
    renderOverview();
    await screen.findByText("200-day");

    await userEvent.click(screen.getByRole("button", { name: "vs Gold" }));

    expect(await screen.findByText("+10.00%")).toBeInTheDocument();
  });

  it("embeds only what this platform has no data of its own for", async () => {
    // A TradingView chart of prices this platform also holds would sooner
    // or later disagree with a signal fired on the stored ones.
    stubEverything();

    renderOverview();

    expect(await screen.findByRole("region", { name: "World markets" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sector heatmap" })).toBeInTheDocument();
  });

  it("offers the way through to the whole feed, under it as the old page did", async () => {
    stubEverything();
    const open = vi.fn();
    renderOverview({ onOpenNews: open });
    await screen.findByText("Refiners lead the index higher");

    await userEvent.click(screen.getByRole("button", { name: /View all news/ }));

    expect(open).toHaveBeenCalled();
  });

  it("asks for only a handful of headlines, not the whole feed", async () => {
    // The overview is a glance; the feed has its own page.
    const fetchMock = stubEverything();

    renderOverview();

    await waitFor(() => {
      const asked = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .find((path) => path.startsWith("/api/news"));
      expect(asked).toContain("limit=6");
    });
  });
});
