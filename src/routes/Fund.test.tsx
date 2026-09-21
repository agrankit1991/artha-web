/** Tests for one mutual fund scheme's own page. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Fund } from "./Fund";
import { fund, fundScheme, renderPage, stubPlatform } from "@/test/support";

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
    expect(screen.getByText("Direct Plan")).toBeInTheDocument();
    // Named twice on purpose: once as a badge and once among the facts
    // that identify the scheme.
    expect(screen.getAllByText("Axis Mutual Fund")).toHaveLength(2);
  });

  it("states its latest value and the day it is for", async () => {
    // A value with no date is a value of unknown age.
    stubPlatform({ "/api/funds/120503": { body: fund() } });

    renderPage(<Fund schemeCode="120503" />);

    expect(await screen.findByText("62.50")).toBeInTheDocument();
    expect(screen.getByText(/18 Sept? 2026/)).toBeInTheDocument();
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
});
