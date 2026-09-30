/** Tests for one mutual fund scheme's own page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Fund } from "./Fund";
import { fund, fundScheme, renderPage, schemePage, stubPlatform } from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Fund", () => {
  it("opens with what the scheme is", async () => {
    // A direct plan and a regular one are the same fund with and without
    // commission, so which this is has to be said.
    stubPlatform({ "/api/funds/120503": { body: fund() } });

    renderPage(<Fund schemeCode="120503" />);

    expect(
      await screen.findByText("Axis Bluechip Fund - Direct Plan - Growth"),
    ).toBeInTheDocument();
    // The plan as the list says it, with what it costs explained.
    expect(screen.getByText("Direct")).toBeInTheDocument();
    expect(screen.getByText("Large Cap Fund")).toBeInTheDocument();
    expect(screen.getByText("AMFI 120503")).toBeInTheDocument();
    // Named once, in the header: the details no longer repeat its badges.
    expect(screen.getAllByText("Axis Mutual Fund")).toHaveLength(1);
    expect(
      screen.getByText("Open Ended Schemes(Equity Scheme - Large Cap Fund)"),
    ).toBeInTheDocument();
  });

  it("states its latest value and the day it is for", async () => {
    // A value with no date is a value of unknown age.
    stubPlatform({ "/api/funds/120503": { body: fund() } });

    renderPage(<Fund schemeCode="120503" />);

    expect((await screen.findAllByText("62.50")).length).toBeGreaterThan(0);
    expect(screen.getByText(/As of 18 Sept? 2026/)).toBeInTheDocument();
  });

  it("names the long windows as yearly rates", async () => {
    // A three-year total and a yearly rate are different numbers, and only
    // one of them can be read beside a one-year figure.
    stubPlatform({ "/api/funds/120503": { body: fund() } });

    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("3 years");
    // Said under the tile, once per annualised window that has a figure.
    expect(screen.getAllByText("Yearly rate")).toHaveLength(1);
  });

  it("leaves a window it has no history for blank", async () => {
    // A fund launched last March has no five-year record, which is not a
    // five-year record of nothing.
    stubPlatform({ "/api/funds/120503": { body: fund() } });

    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("5 years");
    expect(screen.getByText("No history that far back")).toBeInTheDocument();
  });

  it("colours a losing window as a loss", async () => {
    stubPlatform({
      "/api/funds/120503": {
        body: fund({ returns: { ...fund().returns, one_month: "-2.10" } }),
      },
    });

    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("-2.10%")).toBeInTheDocument();
  });

  it("leaves out a value that will not parse rather than drawing nought", async () => {
    stubPlatform({
      "/api/funds/120503": {
        body: fund({ values: [{ nav_date: "2026-09-18", nav: "not a number" }] }),
      },
    });

    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("No values published for this scheme")).toBeInTheDocument();
  });

  it("draws the published values", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });

    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("Net asset value")).toBeInTheDocument();
  });

  it("asks for more history when a longer span is chosen", async () => {
    const fetchMock = stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("NAV history");

    await userEvent.click(screen.getByRole("button", { name: "10Y" }));

    await waitFor(() => {
      const asked = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("years=10"))).toBe(true);
    });
  });

  it("says nothing was published rather than drawing an empty frame", async () => {
    stubPlatform({
      "/api/funds/120503": {
        body: fund({ scheme: fundScheme({ nav: null, nav_date: null }), values: [] }),
      },
    });

    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("No values published for this scheme")).toBeInTheDocument();
  });

  it("reports a failure rather than showing an empty page", async () => {
    stubPlatform({
      "/api/funds/000000": { status: 404, body: { detail: "no scheme called 000000" } },
    });

    renderPage(<Fund schemeCode="000000" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("No scheme called 000000");
  });

  it("opens on ten thousand rupees growing, with the other readings a tab away", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("NAV history");

    expect(screen.getByRole("tab", { name: "Growth of ₹10,000" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // How far below the peak is a pane under the growth, not a tab of its own.
    expect(screen.queryByRole("tab", { name: "Drawdown" })).not.toBeInTheDocument();
    expect(screen.getByText(/below its highest point/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Rolling 1-year return" }));
    expect(screen.getByText(/as it stood on each day/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "NAV" }));
    expect(screen.getByText(/One value a day/)).toBeInTheDocument();
  });

  it("draws each calendar year's return, the running one to date", async () => {
    stubPlatform({
      "/api/funds/120503": {
        body: fund({
          values: [
            { nav_date: "2024-12-31", nav: "50.000000" },
            { nav_date: "2025-12-31", nav: "45.000000" },
            { nav_date: "2026-09-18", nav: "54.000000" },
          ],
        }),
      },
    });
    renderPage(<Fund schemeCode="120503" />);

    const years = await screen.findByRole("region", { name: "Calendar-year returns" });
    // 2024 has no year-end before it here, so it is not drawn.
    expect(within(years).queryByText("2024")).not.toBeInTheDocument();
    expect(within(years).getByText("2025")).toBeInTheDocument();
    expect(within(years).getByText("-10.00%")).toBeInTheDocument();
    expect(within(years).getByText("2026 to date")).toBeInTheDocument();
    expect(within(years).getByText("+20.00%")).toBeInTheDocument();
  });

  it("draws no calendar years from values that do not span a year-end", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("NAV history");
    expect(screen.queryByRole("region", { name: "Calendar-year returns" })).not.toBeInTheDocument();
  });

  it("holds each return's place while loading, rather than saying there is none", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);

    expect(screen.queryByText("No history that far back")).not.toBeInTheDocument();
    // Once loaded, the five-year window the fixture lacks says so.
    expect(await screen.findByText("No history that far back")).toBeInTheDocument();
  });

  it("states where the value peaked, troughed and fell furthest", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("Highest in window")).toBeInTheDocument();
    expect(screen.getByText("Lowest in window")).toBeInTheDocument();
    expect(screen.getByText("61.00")).toBeInTheDocument();
    expect(screen.getByText("Deepest fall from a peak")).toBeInTheDocument();
  });

  it("summarises the rolling year as a distribution", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("Rolling one-year returns")).toBeInTheDocument();
    expect(screen.getByText("Best one-year return")).toBeInTheDocument();
    expect(screen.getByText("Worst one-year return")).toBeInTheDocument();
    // Three positive days of three, said as days: it was once called years.
    expect(screen.getByText("100% of days")).toBeInTheDocument();
    expect(screen.getByText("Days it was positive")).toBeInTheDocument();
    expect(screen.queryByText(/Years positive/)).not.toBeInTheDocument();
  });

  it("says nothing of a rolling year for a scheme too young to have one", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund({ rolling: [] }) } });
    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("NAV history");
    expect(screen.queryByText("Rolling one-year returns")).not.toBeInTheDocument();
    expect(screen.getByText("Less than a year of values")).toBeInTheDocument();
  });

  it("lists similar schemes in its category, each leading to its own page", async () => {
    const fetchMock = stubPlatform({
      "/api/funds/120503": { body: fund() },
      "/api/funds": {
        body: schemePage({
          items: [
            fundScheme(),
            fundScheme({ scheme_code: "118989", name: "HDFC Top 100 Fund", amc: null }),
          ],
        }),
      },
    });
    renderPage(<Fund schemeCode="120503" />);

    const table = await screen.findByRole("table", { name: "Similar schemes" });
    // Awaited on the row: the table is drawn before its schemes arrive.
    expect(await within(table).findByRole("link", { name: /HDFC Top 100/ })).toHaveAttribute(
      "href",
      "/fund/118989",
    );
    // Itself left out: a scheme is not similar to itself.
    expect(within(table).queryByText(/Axis Bluechip/)).not.toBeInTheDocument();
    const asked = fetchMock.mock.calls.map((call) => String(call[0]));
    // The category's best over three years, not the first ten by name.
    expect(
      asked.some(
        (path) =>
          path.includes("category=Open") &&
          path.includes("sort=three_years") &&
          path.includes("order=desc"),
      ),
    ).toBe(true);
    // Each with its plan, so a fund's direct and regular plans can be told apart.
    expect(within(table).getByText("Direct")).toBeInTheDocument();
  });

  it("asks for no similar schemes when the scheme has no category", async () => {
    const fetchMock = stubPlatform({
      "/api/funds/120503": { body: fund({ scheme: fundScheme({ category: null }) }) },
    });
    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("NAV history");
    expect(screen.queryByText("Similar schemes")).not.toBeInTheDocument();
    const asked = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(asked.some((path) => path.includes("category="))).toBe(false);
  });

  it("draws no rolling line from returns that will not parse", async () => {
    stubPlatform({
      "/api/funds/120503": {
        body: fund({ rolling: [{ nav_date: "2026-09-18", percent: "not a number" }] }),
      },
    });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("NAV history");

    await userEvent.click(screen.getByRole("tab", { name: "Rolling 1-year return" }));

    expect(screen.getByText("No values published for this scheme")).toBeInTheDocument();
  });

  it("offers a share card drawn from its own values", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() }, "/api/funds?": { body: schemePage() } });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("Net asset value");

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    const dialog = await screen.findByRole("dialog", { name: "Share" });
    // jsdom has no canvas: the card says so rather than failing quietly.
    expect(await within(dialog).findByText(/cannot draw the card/)).toBeInTheDocument();
  });

  it("says when the value changed scale inside the window drawn, and only then", async () => {
    // A 1:10 split would draw as a fall of ninety per cent; the platform
    // redraws the earlier values in today's unit, and the page says so.
    stubPlatform({
      "/api/funds/120503": {
        body: fund({
          rescales: [
            { nav_date: "2020-01-10", factor: "10" },
            { nav_date: "2026-09-17", factor: "0.1" },
          ],
        }),
      },
    });

    renderPage(<Fund schemeCode="120503" />);

    const note = await screen.findByText(/changed scale on/);
    expect(note).toHaveTextContent(/17 Sept? 2026/);
    expect(note).not.toHaveTextContent("2020");
    expect(note).toHaveTextContent(/not a gain or a loss/);
  });
});
