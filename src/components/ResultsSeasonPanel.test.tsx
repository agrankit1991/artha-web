/** Tests for a results season's panel. */

import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { CalendarEvent, ResultsSeason, SeasonCompany } from "@/api/client";
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
      <ResultsSeasonPanel
        season={season({ expected: 0, by_week: [] })}
        today="2026-12-01"
        fetchedOn="2026-11-28"
        declaring={[]}
        noticesSince="2026-10-17"
      />,
    );

    expect(screen.getByText(/Due by 14 Nov 2026, passed/)).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Results held" })).not.toHaveAttribute(
      "aria-valuenow",
    );
    expect(screen.queryByText("Arrived each week")).toBeNull();
  });

  it("says why a season holds nothing yet, and when statements were last fetched", () => {
    const { rerender } = renderPage(
      <ResultsSeasonPanel
        season={season({ held: 0, by_week: [] })}
        today="2026-10-17"
        fetchedOn="2026-09-26"
        declaring={[]}
        noticesSince="2026-10-17"
      />,
    );

    expect(screen.getByText(/No company's Jul-Sep 2026 results are held yet/)).toBeInTheDocument();
    expect(screen.getByText(/the last fetch finished on 26 Sept? 2026/)).toBeInTheDocument();

    rerender(
      <ResultsSeasonPanel
        season={season({ held: 0, by_week: [] })}
        today="2026-10-17"
        fetchedOn={null}
        declaring={[]}
        noticesSince="2026-10-17"
      />,
    );
    expect(screen.getByText(/have not been fetched yet/)).toBeInTheDocument();
  });

  it("says when the deadline is today", () => {
    renderPage(
      <ResultsSeasonPanel
        season={season()}
        today="2026-11-14"
        fetchedOn="2026-11-14"
        declaring={[]}
        noticesSince="2026-10-17"
      />,
    );

    expect(screen.getByText(/Due by 14 Nov 2026, today/)).toBeInTheDocument();
    expect(screen.getByText("Week of 12 Oct")).toBeInTheDocument();
  });

  it("lists the companies when asked, an unlisted one by its ISIN with no link", async () => {
    stubPlatform({ "/api/calendar/results/2026-09-30": { body: COMPANIES } });
    renderPage(
      <ResultsSeasonPanel
        season={season()}
        today="2026-10-17"
        fetchedOn="2026-10-17"
        declaring={[]}
        noticesSince="2026-10-17"
      />,
    );

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
    renderPage(
      <ResultsSeasonPanel
        season={season()}
        today="2026-10-17"
        fetchedOn="2026-10-17"
        declaring={[]}
        noticesSince="2026-10-17"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show the companies" }));

    await waitFor(() => {
      expect(screen.getByText(/The store is down/i)).toBeInTheDocument();
    });
  });
});

/**
 * Build one company's results meeting.
 *
 * @param symbol - The company, by its symbol.
 * @param day - The day it declares.
 * @param listed - Whether it has a page.
 * @returns The event.
 */
function meeting(symbol: string, day = "2026-10-19", listed = true): CalendarEvent {
  return {
    day,
    last_day: null,
    kind: "results_meeting",
    group: "results",
    title: `${symbol}: results`,
    detail: "",
    certainty: "confirmed",
    at: null,
    source: "NSE board meeting notice",
    link: `https://x.test/${symbol}.xml`,
    subject: listed ? `NSE_EQ|INE${symbol}` : null,
    symbol: listed ? symbol : null,
  };
}

describe("ResultsSeasonPanel's coming results", () => {
  it("says the window, and lists who declares each day, a dozen named", () => {
    const busy = Array.from({ length: 13 }, (_, index) => meeting(`CO${String(index)}`));
    renderPage(
      <ResultsSeasonPanel
        season={season()}
        today="2026-10-17"
        fetchedOn="2026-10-17"
        declaring={[...busy, meeting("Nobody Limited", "2026-10-20", false)]}
        noticesSince="2026-10-15"
      />,
    );

    expect(screen.getByText(/SEBI gives them 45 days/)).toBeInTheDocument();
    const declaring = screen.getByRole("region", { name: "Declaring results" });
    expect(declaring).toHaveTextContent("13 companies");
    expect(declaring).toHaveTextContent("+1 more: choose the day on the calendar");
    expect(screen.getByRole("link", { name: "CO0" })).toHaveAttribute("href", "/company/CO0");
    expect(screen.queryByRole("link", { name: "CO12" })).toBeNull();
    expect(screen.getByText("Nobody Limited")).toBeInTheDocument();
    expect(declaring).toHaveTextContent("1 company");
    expect(declaring).toHaveTextContent(/read every hour since 15 Oct 2026/);
  });

  it("says when nothing is notified yet, or nothing is read yet, or it is still reading", () => {
    const { rerender } = renderPage(
      <ResultsSeasonPanel
        season={season()}
        today="2026-10-17"
        fetchedOn="2026-10-17"
        declaring={[]}
        noticesSince={null}
      />,
    );
    expect(screen.getByText(/No company has notified a results meeting/)).toBeInTheDocument();
    expect(screen.getByText(/none is read yet/)).toBeInTheDocument();

    rerender(
      <ResultsSeasonPanel
        season={season()}
        today="2026-10-17"
        fetchedOn="2026-10-17"
        declaring={null}
        noticesSince={null}
      />,
    );
    expect(screen.getByText("Reading the notices...")).toBeInTheDocument();
  });
});
