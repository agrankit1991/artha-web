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
    expect(screen.getAllByText("Direct Plan").length).toBeGreaterThan(0);
    // Named twice on purpose: once as a badge and once among the facts
    // that identify the scheme.
    expect(screen.getAllByText("Axis Mutual Fund")).toHaveLength(2);
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

    expect(await screen.findByText("Net Asset Value")).toBeInTheDocument();
  });

  it("asks for more history when a longer span is chosen", async () => {
    const fetchMock = stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("NAV History");

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

    expect(await screen.findByRole("alert")).toHaveTextContent("no scheme called 000000");
  });

  it("opens on ten thousand rupees growing, with the other readings a tab away", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() } });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("NAV History");

    expect(screen.getByRole("tab", { name: "Growth of ₹10,000" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await userEvent.click(screen.getByRole("tab", { name: "Drawdown" }));
    expect(screen.getByText(/below its highest point/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Rolling 1-year return" }));
    expect(screen.getByText(/as it stood on each day/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "NAV" }));
    expect(screen.getByText(/One value a day/)).toBeInTheDocument();
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

    expect(await screen.findByText("Rolling One-Year Returns")).toBeInTheDocument();
    expect(screen.getByText("Best year")).toBeInTheDocument();
    expect(screen.getByText("Worst year")).toBeInTheDocument();
    // Three positive years of three, said in the tile and among the facts.
    expect(screen.getAllByText("100%")).toHaveLength(2);
  });

  it("says nothing of a rolling year for a scheme too young to have one", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund({ rolling: [] }) } });
    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("NAV History");
    expect(screen.queryByText("Rolling One-Year Returns")).not.toBeInTheDocument();
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
    expect(asked.some((path) => path.includes("category=Open"))).toBe(true);
  });

  it("asks for no similar schemes when the scheme has no category", async () => {
    const fetchMock = stubPlatform({
      "/api/funds/120503": { body: fund({ scheme: fundScheme({ category: null }) }) },
    });
    renderPage(<Fund schemeCode="120503" />);

    await screen.findByText("NAV History");
    expect(screen.queryByText("Similar Schemes")).not.toBeInTheDocument();
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
    await screen.findByText("NAV History");

    await userEvent.click(screen.getByRole("tab", { name: "Rolling 1-year return" }));

    expect(screen.getByText("No values published for this scheme")).toBeInTheDocument();
  });

  it("offers a share card drawn from its own values", async () => {
    stubPlatform({ "/api/funds/120503": { body: fund() }, "/api/funds?": { body: schemePage() } });
    renderPage(<Fund schemeCode="120503" />);
    await screen.findByText("Net Asset Value");

    await userEvent.click(screen.getByRole("button", { name: "Share" }));

    const dialog = await screen.findByRole("dialog", { name: "Share" });
    // jsdom has no canvas: the card says so rather than failing quietly.
    expect(await within(dialog).findByText(/cannot draw the card/)).toBeInTheDocument();
  });
});
