/** Tests for the overview page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Overview } from "./Overview";
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
  renderPage,
  stubPlatform,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Render the overview as the shell does: inside the theme it lives in. */
function renderOverview(props: Parameters<typeof Overview>[0] = {}): void {
  renderPage(<Overview {...props} />);
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
    "/api/external-symbols": {
      body: [
        { instrument_key: "NSE_INDEX|Nifty 50", symbol: "NSE:NIFTY", derived: false },
        { instrument_key: "NSE_EQ|INF204KB17I5", symbol: "NSE:GOLDBEES", derived: false },
      ],
    },
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
    const cards = screen.getByRole("region", { name: "Market Indices" });
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

    expect(await screen.findByText("Market Breadth")).toBeInTheDocument();
    expect(screen.getByText("60 advancing")).toBeInTheDocument();
  });

  it("offers the way through to breadth in full", async () => {
    stubEverything();
    const open = vi.fn();
    renderOverview({ onOpenBreadth: open });
    await screen.findByText("Market Breadth");

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
      "/api/external-symbols": {
        body: [
          { instrument_key: "NSE_INDEX|Nifty 50", symbol: "NSE:NIFTY", derived: false },
          { instrument_key: "NSE_EQ|INF204KB17I5", symbol: "NSE:GOLDBEES", derived: false },
        ],
      },
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

  it("opens on the comparison against gold", async () => {
    // What the index has done against gold is the question somebody opens
    // this page with; its own price is on the card above already.
    stubEverything();

    renderOverview();

    expect(await screen.findByText("+10.00%")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /vs Gold/ })).toHaveAttribute("aria-selected", "true");
  });

  it("draws the benchmark's own sessions when that tab is chosen", async () => {
    // The chart shows the values a rule would fire on rather than ones it
    // worked out for itself in the browser.
    stubEverything();
    renderOverview();
    await screen.findByText("+10.00%");

    await userEvent.click(screen.getByRole("tab", { name: "Nifty 50" }));

    expect(await screen.findByText("SMA 200")).toBeInTheDocument();
  });

  it("embeds only what this platform has no data of its own for", async () => {
    // A TradingView chart of prices this platform also holds would sooner
    // or later disagree with a signal fired on the stored ones.
    stubEverything();

    renderOverview();

    expect(await screen.findByRole("region", { name: "Sector heatmap" })).toBeInTheDocument();
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

  it("opens on a year and asks for whatever span is chosen", async () => {
    const fetchMock = stubEverything();
    renderOverview();
    await screen.findByText("+10.00%");
    expect(
      fetchMock.mock.calls
        .map((call) => String(call[0]))
        .some((path) => path.startsWith("/api/figures") && path.includes("sessions=250")),
    ).toBe(true);

    await userEvent.click(
      within(screen.getByRole("group", { name: "History" })).getByRole("button", {
        name: "Max",
      }),
    );

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.startsWith("/api/figures") && path.includes("sessions=12500")),
      ).toBe(true);
    });
  });

  it("asks for the span chosen, whichever chart is showing", async () => {
    // The range is shared: switching views to find it reset is what makes
    // one chart feel like two.
    const fetchMock = stubEverything();
    renderOverview();
    await screen.findByText("+10.00%");

    await userEvent.click(
      within(screen.getByRole("group", { name: "History" })).getByRole("button", { name: "5Y" }),
    );

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(
        asked.some((path) => path.startsWith("/api/series") && path.includes("sessions=1250")),
      ).toBe(true);
    });
  });

  it("offers a way out to TradingView for what it draws", async () => {
    // This platform holds nothing intraday, so "what is it doing right
    // now" is a question it cannot answer and TradingView can.
    stubEverything();

    renderOverview();

    expect(
      await screen.findByRole("link", { name: /Nifty 50 on TradingView/ }),
    ).toBeInTheDocument();
  });

  it("asks about every instrument on the page in one request", async () => {
    // Eight cards and two chart lines is ten round trips otherwise.
    const fetchMock = stubEverything();

    renderOverview();

    await waitFor(() => {
      const asked = fetchMock.mock.calls
        .map((call) => String(call[0]))
        .find((path) => path.startsWith("/api/external-symbols"));
      expect(asked).toBeDefined();
      expect(asked?.match(/keys=/g)).toHaveLength(9);
    });
  });

  it("leads from an index's name to its own page", async () => {
    stubEverything();
    renderOverview({ onOpenIndex: vi.fn() });
    await screen.findByText("Top gainers");
    await userEvent.click(screen.getByRole("button", { name: "Indices" }));
    await screen.findByText("Top gainers");

    const [firstPanel] = screen.getAllByRole("table");
    const [first] = within(firstPanel as HTMLElement).getAllByRole("link");
    expect(first).toHaveAttribute("href", "/index/NSE_EQ%7CINE002A01018");
  });

  it("leads from a company's name to its own page", async () => {
    // Every row leads somewhere now. A list of companies is a list of
    // companies, and each of them has a page.
    stubEverything();
    renderOverview({});
    await screen.findByText("Top gainers");

    const [firstPanel] = screen.getAllByRole("table");
    const [first] = within(firstPanel as HTMLElement).getAllByRole("link");
    expect(first).toHaveAttribute("href", "/company/NSE_EQ%7CINE002A01018");
  });

  it("names a chosen population by its key when nothing named it", async () => {
    // A sector the platform no longer ranks can still be in the address
    // bar, and a button reading "Open" alone says nothing.
    stubEverything();
    const opened = vi.fn();
    renderOverview({ onOpenPopulation: opened });
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("combobox"));
    await userEvent.click(screen.getByRole("option", { name: "IT - Software" }));

    expect(await screen.findByRole("button", { name: /Open IT - Software/ })).toBeInTheDocument();
  });

  it("offers the chosen population's own page", async () => {
    stubEverything();
    const opened = vi.fn();
    renderOverview({ onOpenPopulation: opened });
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("button", { name: "Nifty 50" }));
    await userEvent.click(await screen.findByRole("button", { name: /Open Nifty 50/ }));

    expect(opened).toHaveBeenCalledWith("index", "NSE_INDEX|Nifty 50");
  });
});
