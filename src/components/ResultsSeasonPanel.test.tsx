/** Tests for a results season's panel. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { ResultsSeason, SeasonCompany } from "@/api/client";
import { ResultsSeasonPanel } from "@/components/ResultsSeasonPanel";
import { renderPage, stubPlatform } from "@/test/support";

/**
 * Build a season.
 *
 * @param overrides - Fields to change.
 * @returns The season.
 */
function season(overrides: Partial<ResultsSeason> = {}): ResultsSeason {
  return {
    quarter_end: "2026-09-30",
    quarter: "Jul-Sep 2026",
    deadline: "2026-11-14",
    held: 21,
    expected: 4337,
    by_week: [{ week: "2026-10-12", companies: 19 }],
    ...overrides,
  };
}

const COMPANIES: SeasonCompany[] = [
  {
    isin: "INE467B01029",
    instrument_key: "NSE_EQ|INE467B01029",
    symbol: "TCS",
    name: "Tata Consultancy Services",
    seen_on: "2026-10-17",
  },
  { isin: "INE999Z01010", instrument_key: null, symbol: null, name: null, seen_on: "2026-10-10" },
];

describe("ResultsSeasonPanel", () => {
  it("says when the deadline has passed and stays silent on an unknown share", () => {
    renderPage(
      <ResultsSeasonPanel season={season({ expected: 0, by_week: [] })} today="2026-12-01" />,
    );

    expect(screen.getByText(/Due by 14 Nov 2026, passed/)).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Results held" })).not.toHaveAttribute(
      "aria-valuenow",
    );
    expect(screen.queryByText("Arrived each week")).toBeNull();
  });

  it("says when the deadline is today", () => {
    renderPage(<ResultsSeasonPanel season={season()} today="2026-11-14" />);

    expect(screen.getByText(/Due by 14 Nov 2026, today/)).toBeInTheDocument();
    expect(screen.getByText("Week of 12 Oct")).toBeInTheDocument();
  });

  it("lists the companies when asked, an unlisted one by its ISIN with no link", async () => {
    stubPlatform({ "/api/calendar/results/2026-09-30": { body: COMPANIES } });
    renderPage(<ResultsSeasonPanel season={season()} today="2026-10-17" />);

    await userEvent.click(screen.getByRole("button", { name: "Show the companies" }));

    expect(await screen.findByRole("link", { name: "TCS" })).toHaveAttribute(
      "href",
      "/company/TCS",
    );
    expect(screen.getByText("INE999Z01010")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "INE999Z01010" })).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Hide the companies" }));
    expect(screen.queryByText("INE999Z01010")).toBeNull();
  });

  it("says so when the companies cannot be read", async () => {
    stubPlatform({
      "/api/calendar/results/": { status: 500, body: { detail: "the store is down" } },
    });
    renderPage(<ResultsSeasonPanel season={season()} today="2026-10-17" />);

    await userEvent.click(screen.getByRole("button", { name: "Show the companies" }));

    await waitFor(() => {
      expect(screen.getByText(/The store is down/i)).toBeInTheDocument();
    });
  });
});
