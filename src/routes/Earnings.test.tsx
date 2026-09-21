/** Tests for the earnings page, and through it the earnings panel. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EarningsPage } from "./Earnings";
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
    // The share growing is coloured by which side of half it falls.
    expect(within(latest as HTMLElement).getByText("73%")).toHaveClass("text-gain");
    expect(within(rows[2] as HTMLElement).getByText("40%")).toHaveClass("text-loss");
    // The oldest period has nothing before it to compare with.
    const oldest = rows[3] as HTMLElement;
    expect(within(oldest).getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/92 companies with a profile/)).toBeInTheDocument();
  });

  it("ranks sectors and leads each to its page", async () => {
    stubPlatform({
      "/api/earnings/sectors": {
        body: [
          sectorEarnings(),
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

    const table = await screen.findByRole("table", { name: "Sectors by earnings growth" });
    const link = await within(table).findByRole("link", { name: /IT - Software/ });
    expect(link).toHaveAttribute("href", "/sector/IT%20-%20Software");
    expect(within(table).getByText("92 companies")).toBeInTheDocument();
    expect(within(table).getByText("1 company")).toBeInTheDocument();
    // Growth from a loss is not a percentage; the absent comparison is a dash.
    const cement = within(table)
      .getByRole("link", { name: /Cement/ })
      .closest("tr");
    expect(cement).toHaveTextContent("n/a");
    expect(cement).toHaveTextContent("—");
  });

  it("switches both the market series and the ranking to quarterly", async () => {
    const fetched = stubPlatform({
      "/api/earnings/sectors": { body: [sectorEarnings()] },
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
    expect(screen.getByText(/keeps four quarters per company/)).toBeInTheDocument();
    await waitFor(() => {
      const asked = fetched.mock.calls.map((call) => String(call[0]));
      expect(asked.some((path) => path.includes("/api/earnings/sectors?cadence=quarterly"))).toBe(
        true,
      );
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

    renderPage(<EarningsPage />);

    expect(await screen.findByText(/sectors broke/)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Earnings by period" })).toBeInTheDocument();
  });

  it("gives up the page when the market series itself fails", async () => {
    stubPlatform({
      "/api/earnings/sectors": { body: [] },
      "/api/earnings/": { status: 500, body: { detail: "market broke" } },
    });

    renderPage(<EarningsPage />);

    expect(await screen.findByText(/market broke/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
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
    for (const name of [/^Sector/, /^Latest period/, /^Revenue YoY/, /^Profit YoY/, /^Growing/]) {
      await userEvent.click(within(sectors).getByRole("button", { name }));
    }
    const ranked = within(sectors).getAllByRole("row");
    expect(ranked[1]).toHaveTextContent("IT - Software");
    expect(ranked[2]).toHaveTextContent("Paper");
    expect(ranked[3]).toHaveTextContent("Cement");
    expect(within(sectors).getByText("30%")).toHaveClass("text-loss");
    expect(within(periods).getByText("n/a")).toBeInTheDocument();
  });
});
