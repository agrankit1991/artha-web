/** Tests for the overview page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Overview } from "./Overview";
import { forgetForTests } from "@/lib/preferences";
import {
  breadth,
  chartPoints,
  heatmapTile,
  institutionalFlow,
  moverRow,
  moversResponse,
  newsPage,
  overview,
  panel,
  priceSeries,
  renderPage,
  scopeOptions,
  sectorSummary,
  stubPlatform,
  type Reply,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Render the overview as the shell does: inside the theme it lives in. */
function renderOverview(props: Parameters<typeof Overview>[0] = {}): void {
  renderPage(<Overview {...props} />);
}

function stubEverything(extra: Record<string, Reply> = {}): ReturnType<typeof stubPlatform> {
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
    "/api/heatmap": {
      body: {
        scope_kind: "companies",
        scope_key: null,
        as_of: "2026-09-25",
        tiles: [heatmapTile()],
      },
    },
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
    ...extra,
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

    await userEvent.click(screen.getByRole("combobox", { name: "Scope" }));
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

    expect(await screen.findByText("Breadth: All companies")).toBeInTheDocument();
    expect(screen.getByText("60 advancing")).toBeInTheDocument();
  });

  it("offers the way through to breadth in full", async () => {
    stubEverything();
    const open = vi.fn();
    renderOverview({ onOpenBreadth: open });
    await screen.findByText("Breadth: All companies");

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
      "/api/heatmap": {
        body: { scope_kind: "companies", scope_key: null, as_of: null, tiles: [] },
      },
      "/api/news": { body: newsPage({ total: 0, items: [] }) },
      "/api/external-symbols": {
        body: [
          { instrument_key: "NSE_INDEX|Nifty 50", symbol: "NSE:NIFTY", derived: false },
          { instrument_key: "NSE_EQ|INF204KB17I5", symbol: "NSE:GOLDBEES", derived: false },
        ],
      },
      "/api/figures": { body: { instrument_key: "NSE_INDEX|Nifty 50", points: chartPoints(30) } },
      "/api/series": { body: [] },
      "/api/flows": { body: [] },
      "/api/sectors": { body: [] },
    });

    renderOverview();

    expect(await screen.findByRole("alert")).toHaveTextContent("The lists are being rebuilt");
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

  it("draws the chosen population's heatmap from this platform's own figures", async () => {
    // It was TradingView's SENSEX map, whose prices could disagree with the
    // stored ones every other figure here is read from.
    const fetched = stubEverything();

    renderOverview();

    const map = await screen.findByRole("group", { name: /: companies by market capitalisation/ });
    expect(within(map).getByRole("link", { name: /^RELIANCE/ })).toHaveAttribute(
      "href",
      "/company/RELIANCE",
    );
    expect(
      fetched.mock.calls.some((call) => String(call[0]).startsWith("/api/heatmap?scope_kind=")),
    ).toBe(true);
  });

  it("maps the whole market when all the indices are chosen, which are not companies", async () => {
    window.localStorage.setItem(
      "artha.preferences",
      JSON.stringify({ scope: { kind: "indices", key: null } }),
    );
    forgetForTests();
    const fetched = stubEverything();

    renderOverview();

    await screen.findByRole("group", { name: /: companies by market capitalisation/ });
    expect(
      fetched.mock.calls.some((call) => String(call[0]) === "/api/heatmap?scope_kind=companies"),
    ).toBe(true);
  });

  it("says the map could not be read without losing the page", async () => {
    stubEverything({ "/api/heatmap": { status: 500, body: { detail: "map broke" } } });

    renderOverview();

    expect(await screen.findByText(/Map broke/)).toBeInTheDocument();
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
        .some((path) => path.startsWith("/api/figures") && path.includes("sessions=253")),
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
        asked.some((path) => path.startsWith("/api/series") && path.includes("sessions=1261")),
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
    expect(first).toHaveAttribute("href", "/index/ine002a01018");
  });

  it("leads from a company's name to its own page", async () => {
    // Every row leads somewhere now. A list of companies is a list of
    // companies, and each of them has a page.
    stubEverything();
    renderOverview({});
    await screen.findByText("Top gainers");

    const [firstPanel] = screen.getAllByRole("table");
    const [first] = within(firstPanel as HTMLElement).getAllByRole("link");
    expect(first).toHaveAttribute("href", "/company/RELIANCE");
  });

  it("names a chosen population by its key when nothing named it", async () => {
    // A sector the platform no longer ranks can still be in the address
    // bar, and a button reading "Open" alone says nothing.
    stubEverything();
    const opened = vi.fn();
    renderOverview({ onOpenPopulation: opened });
    await screen.findByText("Top gainers");

    await userEvent.click(screen.getByRole("combobox", { name: "Scope" }));
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

  it("opens with what moved today: the benchmark, the population's breadth, the institutions", async () => {
    stubEverything({
      "/api/flows": {
        body: [
          institutionalFlow({ participant: "FII", net_amount: "-3809.99" }),
          institutionalFlow({ participant: "DII", net_amount: "4210.50" }),
        ],
      },
    });
    renderPage(<Overview />);

    const band = await screen.findByRole("region", { name: "What moved today" });
    expect(await within(band).findByText(/up$/)).toBeInTheDocument();
    // The population the band counts is named in it, not chosen far below.
    expect(within(band).getByText("All companies")).toBeInTheDocument();
    expect(await within(band).findByText("FII net")).toBeInTheDocument();
    expect(within(band).getByText("-3,809.99 Cr")).toBeInTheDocument();
    // Who led and who dragged are the lists' first rows, not the band's.
    expect(within(band).queryByText("Led by")).not.toBeInTheDocument();
    expect((await screen.findAllByRole("link", { name: "See all →" })).length).toBeGreaterThan(0);
  });

  it("keeps the band to what it knows before the breadth and the flows arrive", async () => {
    stubEverything({
      "/api/movers": { body: moversResponse([]) },
      "/api/breadth": { body: breadth({ latest: null, sessions: [] }) },
      "/api/flows": { body: [] },
    });
    renderPage(<Overview />);

    const band = await screen.findByRole("region", { name: "What moved today" });
    expect(within(band).queryByText(/up$/)).not.toBeInTheDocument();
    expect(within(band).queryByText("FII net")).not.toBeInTheDocument();
  });

  it("ranks the sectors by today's median move, strongest and weakest", async () => {
    // Fourteen sectors big enough to rank and one too small to mean
    // anything: the six strongest and six weakest are shown.
    const sectors = Array.from({ length: 14 }, (_, index) =>
      sectorSummary({
        sector: `Sector ${String(index + 1)}`,
        measured: 12,
        median_change_percent: String(7 - index),
        as_of: "2026-09-25",
      }),
    );
    stubEverything({
      "/api/sectors": {
        body: [
          ...sectors,
          sectorSummary({ sector: "Tiny", measured: 2, median_change_percent: "9" }),
        ],
      },
    });
    renderPage(<Overview />);

    const ranked = await screen.findByRole("list", { name: "Sectors by today's median move" });
    const names = within(ranked)
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(names).toHaveLength(12);
    expect(names[0]).toContain("Sector 1");
    expect(names[11]).toContain("Sector 14");
    expect(within(ranked).queryByText("Tiny")).not.toBeInTheDocument();
    expect(within(ranked).getByRole("link", { name: "Sector 1" })).toHaveAttribute(
      "href",
      "/sector/sector-1",
    );
    expect(screen.getByText(/strongest and weakest of 14/)).toBeInTheDocument();
  });

  it("says so when the sectors cannot be ranked, and keeps the rest of the page", async () => {
    stubEverything({ "/api/sectors": { status: 500, body: { detail: "sectors are rebuilding" } } });
    renderPage(<Overview />);

    const section = await screen.findByRole("region", { name: "Sectors today" });
    expect(await within(section).findByRole("alert")).toHaveTextContent("Sectors are rebuilding");
    expect(screen.getByRole("region", { name: "Market indices" })).toBeInTheDocument();
  });

  it("says no sector is ranked yet rather than drawing an empty chart", async () => {
    stubEverything({ "/api/sectors": { body: [] } });
    renderPage(<Overview />);

    expect(await screen.findByText("No sector ranked yet")).toBeInTheDocument();
  });

  it("offers the lists beyond gainers and losers in one panel, chosen from its title", async () => {
    stubEverything({
      "/api/movers": {
        body: moversResponse([
          panel({ name: "top-gainers" }),
          panel({ name: "top-losers" }),
          panel({ name: "most-active" }),
          panel({ name: "unusual-volume" }),
        ]),
      },
    });
    renderPage(<Overview />);

    const chooser = await screen.findByRole("combobox", { name: "Which list" });
    expect(screen.getByRole("columnheader", { name: /Volume/ })).toBeInTheDocument();
    await userEvent.click(chooser);
    await userEvent.click(await screen.findByRole("option", { name: "Unusual volume" }));

    expect(await screen.findByRole("columnheader", { name: /vs average/ })).toBeInTheDocument();
  });

  it("opens on the population the reader left it on last time", async () => {
    window.localStorage.setItem(
      "artha.preferences",
      JSON.stringify({ scope: { kind: "index", key: "NSE_INDEX|Nifty 50" } }),
    );
    forgetForTests();
    const fetched = stubEverything();
    renderPage(<Overview />);

    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) =>
        decodeURIComponent(String(call[0])).replaceAll("+", " "),
      );
      expect(
        asked.some((path) =>
          path.includes("/api/movers?scope_kind=index&scope_key=NSE_INDEX|Nifty 50"),
        ),
      ).toBe(true);
    });
    window.localStorage.removeItem("artha.preferences");
    forgetForTests();
  });
});
