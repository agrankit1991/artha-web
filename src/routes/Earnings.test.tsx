/** Tests for the earnings page, and through it the earnings panel. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EarningsPage } from "./Earnings";
import { chartCalls } from "@/test/chartStub";
import {
  earnings,
  earningsPeriod,
  growthFigure,
  renderPage,
  sectorEarnings,
  stubPlatform,
} from "@/test/support";

vi.mock("lightweight-charts", async () => (await import("@/test/chartStub")).chartModule());

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Every series' points the chart was given, flattened. */
function drawnDays(): string[] {
  return chartCalls.setData.mock.calls.flatMap((call) =>
    (call[0] as { time: string }[]).map((point) => point.time),
  );
}

describe("EarningsPage", () => {
  it("states every period with the sample its growth was taken over", async () => {
    stubPlatform({
      "/api/earnings/sectors": { body: [sectorEarnings()] },
      "/api/earnings/": {
        body: earnings({
          scope_kind: "companies",
          scope_key: "all",
          periods: [
            earningsPeriod(),
            earningsPeriod({
              period_end: "2025-03-31",
              revenue_yoy: growthFigure({ percent: "1.00", growing: "40.00" }),
            }),
            earningsPeriod({ period_end: "2024-03-31", revenue_yoy: null, profit_yoy: null }),
          ],
        }),
      },
    });

    renderPage(<EarningsPage />);

    const table = await screen.findByRole("table", { name: "Earnings by period" });
    const rows = await within(table).findAllByRole("row");
    // A header and three periods.
    expect(rows).toHaveLength(4);
    const latest = rows[1];
    expect(latest).toHaveTextContent("+20.00%");
    expect(latest).toHaveTextContent("n = 40");
    // The share growing is a level, not a rise: plain, above half or below.
    expect(within(latest as HTMLElement).getByText("73%")).not.toHaveClass("text-gain");
    expect(within(rows[2] as HTMLElement).getByText("40%")).not.toHaveClass("text-loss");
    // The oldest period has nothing before it to compare with.
    const oldest = rows[3] as HTMLElement;
    expect(within(oldest).getAllByText("-").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/92 companies with a profile/)).toBeInTheDocument();
  });

  it("draws only the periods most companies reported, and lists the rest on request", async () => {
    // One company whose year ends in January is a period of its own; its
    // total beside three thousand companies' is a sawtooth, not a trend.
    stubPlatform({
      "/api/earnings/sectors": { body: [] },
      "/api/earnings/": {
        body: earnings({
          periods: [
            earningsPeriod({ period_end: "2026-03-31", reported: 3036 }),
            earningsPeriod({
              period_end: "2026-01-31",
              reported: 1,
              revenue: "57.46",
              revenue_yoy: null,
              profit_yoy: null,
            }),
            earningsPeriod({ period_end: "2025-03-31", reported: 4866 }),
          ],
        }),
      },
    });

    renderPage(<EarningsPage />);

    const table = await screen.findByRole("table", { name: "Earnings by period" });
    await waitFor(() => {
      expect(drawnDays()).toContain("2025-03-31");
    });
    expect(drawnDays()).not.toContain("2026-01-31");
    expect(within(table).getAllByRole("row")).toHaveLength(3);

    await userEvent.click(screen.getByRole("button", { name: /Show every period end \(1 more/ }));
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("57")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Show only the periods most companies reported" }),
    );
    expect(within(table).getAllByRole("row")).toHaveLength(3);
  });

  it("ranks sectors in two columns and leads each to its page", async () => {
    stubPlatform({
      "/api/earnings/sectors": {
        body: [
          sectorEarnings(),
          sectorEarnings({ sector: "Paper", revenue_yoy: growthFigure({ percent: "8.00" }) }),
          sectorEarnings({ sector: "Steel", revenue_yoy: growthFigure({ percent: "-4.00" }) }),
          // Too few companies to rank, on an older year, and grown from a loss.
          sectorEarnings({
            sector: "Tea",
            revenue_yoy: growthFigure({ percent: "90.00", sample: 4 }),
          }),
          sectorEarnings({ sector: "Glass", period_end: "2025-03-31" }),
          sectorEarnings({
            sector: "Cement",
            companies: 1,
            revenue_yoy: growthFigure({ percent: null }),
            profit_yoy: null,
          }),
        ],
      },
      "/api/earnings/": { body: earnings() },
    });

    renderPage(<EarningsPage />);

    expect(
      await screen.findByRole("heading", { name: /^Revenue growth, year to 31 Mar 2026$/ }),
    ).toBeInTheDocument();
    const fastest = screen.getByRole("list", { name: "Sectors growing revenue fastest" });
    const slowest = screen.getByRole("list", { name: "Sectors growing revenue slowest" });
    expect(
      within(fastest)
        .getAllByRole("listitem")
        .map((one) => one.textContent),
    ).toEqual(["IT - Software+20.00%", "Paper+8.00%"]);
    expect(within(slowest).getByRole("link", { name: "Steel" })).toHaveAttribute(
      "href",
      "/sector/steel",
    );
    expect(screen.getByText(/The 3 sectors with at least 10 companies/)).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Sectors by earnings growth" });
    const link = within(table).getByRole("link", { name: /IT - Software/ });
    expect(link).toHaveAttribute("href", "/sector/it-software");
    expect(link.closest("tr")).toHaveTextContent("92");
    // Growth from a loss is not a percentage; the absent comparison is a dash.
    const cement = within(table)
      .getByRole("link", { name: /Cement/ })
      .closest("tr");
    expect(cement).toHaveTextContent("n/a");
    expect(cement).toHaveTextContent("-");
  });

  it("switches both the market series and the sectors to quarterly, in the address", async () => {
    const fetched = stubPlatform({
      "/api/earnings/sectors": {
        body: [
          sectorEarnings({ revenue_yoy: growthFigure({ sample: 3 }) }),
          sectorEarnings({ sector: "Paper", revenue_yoy: growthFigure({ sample: 8 }) }),
        ],
      },
      "/api/earnings/": {
        bodyFor: (path) =>
          path.includes("cadence=quarterly")
            ? earnings({
                cadence: "quarterly",
                periods: [
                  earningsPeriod({
                    period_end: "2026-06-30",
                    revenue_yoy: null,
                    profit_yoy: null,
                    revenue_qoq: growthFigure({ percent: "3.10" }),
                    profit_qoq: growthFigure({ percent: "-1.20" }),
                  }),
                ],
              })
            : earnings(),
      },
    });

    renderPage(<EarningsPage />);
    await screen.findByRole("table", { name: "Earnings by period" });

    await userEvent.click(screen.getByRole("button", { name: "Quarterly" }));

    expect(await screen.findByText("Revenue QoQ")).toBeInTheDocument();
    expect(screen.getByText("+3.10%")).toBeInTheDocument();
    expect(screen.getByText(/keeps four quarters per company, so a year-ago/)).toBeInTheDocument();
    // Year on year rests on a few companies per sector: said, and not ranked.
    expect(await screen.findByText(/3 to 8 here/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /growing revenue/ })).not.toBeInTheDocument();
    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("/api/earnings/sectors?cadence=quarterly"))).toBe(
        true,
      );
    });
    // Drawn quarter on quarter, which most companies have.
    expect(await screen.findByText("Revenue growth, quarter on quarter")).toBeInTheDocument();
  });

  it("opens on the cadence in its address", async () => {
    const fetched = stubPlatform({
      "/api/earnings/sectors": {
        body: [sectorEarnings({ revenue_yoy: growthFigure({ sample: 5 }) })],
      },
      "/api/earnings/": { body: earnings({ cadence: "quarterly" }) },
    });

    renderPage(<EarningsPage />, { at: "/earnings?cadence=quarterly" });

    expect(await screen.findByText(/: 5 here/)).toBeInTheDocument();
    expect(
      fetched.mock.calls.some((call) =>
        String(call[0]).includes("/api/earnings/companies/all?cadence=quarterly"),
      ),
    ).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Annual" }));
    await waitFor(() => {
      expect(
        fetched.mock.calls.some((call) =>
          String(call[0]).includes("/api/earnings/sectors?cadence=annual"),
        ),
      ).toBe(true);
    });
  });

  it("says when no statements are held", async () => {
    stubPlatform({
      "/api/earnings/sectors": { body: [] },
      "/api/earnings/": { body: earnings({ periods: [] }) },
    });

    renderPage(<EarningsPage />);

    expect(await screen.findByText("No statements held for these companies")).toBeInTheDocument();
    expect(await screen.findByText("No sector has a comparable period yet")).toBeInTheDocument();
  });

  it("reports a failed request for either half on its own", async () => {
    stubPlatform({
      "/api/earnings/sectors": { status: 500, body: { detail: "sectors broke" } },
      "/api/earnings/": { body: earnings() },
    });
    const { unmount } = renderPage(<EarningsPage />);

    expect(await screen.findByText(/Sectors broke/)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Earnings by period" })).toBeInTheDocument();
    unmount();

    stubPlatform({
      "/api/earnings/sectors": { body: [sectorEarnings()] },
      "/api/earnings/": { status: 500, body: { detail: "market broke" } },
    });
    renderPage(<EarningsPage />);

    expect(await screen.findByText(/Market broke/)).toBeInTheDocument();
    expect(
      await screen.findByRole("table", { name: "Sectors by earnings growth" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Earnings", level: 1 })).toBeInTheDocument();
  });

  it("sorts by any column, with a period that has no comparison last", async () => {
    stubPlatform({
      "/api/earnings/sectors": {
        body: [
          sectorEarnings({ sector: "Cement", revenue_yoy: null, profit_yoy: null }),
          sectorEarnings({
            sector: "Paper",
            revenue_yoy: growthFigure({ percent: "2.00", growing: "30.00" }),
          }),
          sectorEarnings(),
        ],
      },
      "/api/earnings/": {
        body: earnings({
          periods: [
            earningsPeriod({
              period_end: "2026-03-31",
              revenue: null,
              profit: null,
              profit_yoy: growthFigure({ percent: null }),
            }),
            earningsPeriod({
              period_end: "2025-03-31",
              revenue_yoy: growthFigure({ percent: "30.00" }),
              profit_yoy: growthFigure({ percent: "9.00" }),
            }),
            earningsPeriod({ period_end: "2024-03-31", revenue_yoy: null, profit_yoy: null }),
          ],
        }),
      },
    });

    renderPage(<EarningsPage />);
    const periods = await screen.findByRole("table", { name: "Earnings by period" });
    await within(periods).findByText("+30.00%");

    for (const name of [/^Period/, /^Reported/, /^Revenue \(/, /^Profit \(/, /^Growing/]) {
      await userEvent.click(within(periods).getByRole("button", { name }));
    }
    // Widest growth first; the period with nothing to compare against
    // sorts last rather than pretending to a growth of nought.
    await userEvent.click(within(periods).getByRole("button", { name: /^Revenue YoY/ }));
    await userEvent.click(within(periods).getByRole("button", { name: /^Profit YoY/ }));
    const rows = within(periods).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("2025");
    expect(rows[3]).toHaveTextContent("2024");

    const sectors = await screen.findByRole("table", { name: "Sectors by earnings growth" });
    for (const name of [
      /^Sector/,
      /^Companies/,
      /^Latest period/,
      /^Revenue YoY/,
      /^Profit YoY/,
      /^Growing/,
    ]) {
      await userEvent.click(within(sectors).getByRole("button", { name }));
    }
    const ranked = within(sectors).getAllByRole("row");
    expect(ranked[1]).toHaveTextContent("IT - Software");
    expect(ranked[2]).toHaveTextContent("Paper");
    expect(ranked[3]).toHaveTextContent("Cement");
    expect(within(sectors).getByText("30%")).not.toHaveClass("text-loss");
    expect(within(periods).getByText("n/a")).toBeInTheDocument();
  });
});
