/** Tests for the market calendar page. */

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CalendarEvent, CalendarView, ResultsSeason, SeasonCompany } from "@/api/client";
import { MarketCalendar } from "@/routes/MarketCalendar";
import { renderPage, stubPlatform } from "@/test/support";

/**
 * Build an event.
 *
 * @param overrides - Fields to change.
 * @returns The event.
 */
function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    day: "2026-10-20",
    last_day: null,
    kind: "holiday",
    group: "market",
    title: "Market holiday: Dussehra",
    detail: "NSE and BSE closed for Dussehra. MCX trades 17:00-23:55.",
    certainty: "confirmed",
    at: null,
    source: "NSE, through Upstox",
    link: null,
    subject: null,
    ...overrides,
  };
}

const SEASON: ResultsSeason = {
  quarter_end: "2026-09-30",
  quarter: "Jul-Sep 2026",
  deadline: "2026-11-14",
  held: 21,
  expected: 4337,
  by_week: [
    { week: "2026-10-05", companies: 2 },
    { week: "2026-10-12", companies: 19 },
  ],
};

const EVENTS: CalendarEvent[] = [
  event(),
  event({
    day: "2026-10-21",
    last_day: "2026-10-23",
    kind: "ipo_bidding",
    group: "ipo",
    title: "Veegaland Developers IPO: bidding",
    detail: "Mainboard offering open for bids.",
    certainty: "expected",
    source: "Upstox",
    subject: "veegaland",
  }),
  event({
    day: "2026-11-10",
    kind: "data_release",
    group: "global",
    title: "US CPI inflation (Oct)",
    detail: "US consumer prices.",
    at: "2026-11-10T19:00:00+05:30",
    source: "US Bureau of Labor Statistics",
    link: "https://www.bls.gov/schedule/news_release/cpi.htm",
  }),
  // The 28th holds more events than a day names.
  event({
    day: "2026-10-27",
    last_day: "2026-10-28",
    kind: "policy_meeting",
    group: "global",
    title: "US Fed meeting (FOMC)",
    detail: "The Federal Reserve's rate-setting committee meets.",
    source: "Federal Reserve",
  }),
  event({
    day: "2026-10-28",
    kind: "data_release",
    group: "india",
    title: "India industrial production (Sep)",
    detail: "The Index of Industrial Production.",
    source: "MoSPI",
  }),
  event({
    day: "2026-10-28",
    kind: "ipo_listing",
    group: "ipo",
    title: "Veegaland Developers IPO: listing",
    detail: "Mainboard offering.",
    source: "Upstox",
    subject: "veegaland",
  }),
  event({
    day: "2026-10-28",
    kind: "data_release",
    group: "india",
    title: "India services output (Sep)",
    detail: "The Index of Services Production.",
    source: "MoSPI",
  }),
  event({
    day: "2026-10-28",
    kind: "monthly_expiry",
    title: "NSE monthly expiry",
    detail: "The month's index options expire.",
  }),
];

/**
 * The platform's answer for a range: the events inside it.
 *
 * @param path - The requested path.
 * @returns The view.
 */
function viewFor(path: string): CalendarView {
  const query = new URLSearchParams(path.slice(path.indexOf("?") + 1));
  const start = query.get("start") ?? "";
  const end = query.get("end") ?? "";
  return {
    start,
    end,
    events: EVENTS.filter((one) => one.day <= end && (one.last_day ?? one.day) >= start),
    seasons: start <= "2026-11-14" && end > "2026-09-30" ? [SEASON] : [],
    announced_checked_on: "2026-10-17",
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
];

/**
 * Stub the platform's calendar.
 *
 * @returns The stub.
 */
function stub(): ReturnType<typeof stubPlatform> {
  return stubPlatform({
    "/api/calendar/results/": { body: COMPANIES },
    "/api/calendar?": { bodyFor: (path) => viewFor(path) },
  });
}

describe("MarketCalendar", () => {
  beforeEach(() => {
    // Only the date: timers stay real, so the page's requests settle.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-17T06:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens on this month, with today's events chosen and the grid's days labelled", async () => {
    const platform = stub();
    renderPage(<MarketCalendar />, { at: "/calendar" });

    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    const dussehra = await screen.findByRole("button", { name: /20 Oct 2026: market closed/ });
    expect(dussehra).toHaveAccessibleName(/Market holiday: Dussehra/);
    expect(screen.getByRole("heading", { name: /Saturday, 17 October/ })).toBeInTheDocument();
    expect(platform.mock.calls.map((call) => call[0])).toContain(
      "/api/calendar?start=2026-09-28&end=2026-11-01",
    );
  });

  it("shows a chosen day's events in full", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar" });

    await userEvent.click(await screen.findByRole("button", { name: /20 Oct 2026/ }));

    const day = screen.getByRole("heading", { name: /Tuesday, 20 October/ }).parentElement;
    expect(day).not.toBeNull();
    expect(
      within(day as HTMLElement).getByText(
        "NSE and BSE closed for Dussehra. MCX trades 17:00-23:55.",
      ),
    ).toBeInTheDocument();
  });

  it("lists the next two weeks, counting the offerings until asked for them", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar" });

    const next = await screen.findByRole("region", { name: "What's next" });
    expect(await within(next).findByText("NSE monthly expiry")).toBeInTheDocument();
    expect(within(next).queryByText("US CPI inflation (Oct)")).toBeNull();
    expect(within(next).queryByRole("link", { name: /Veegaland/ })).toBeNull();
    expect(within(next).getByText(/2 IPO events in these two weeks/)).toBeInTheDocument();

    await userEvent.click(within(next).getByRole("button", { name: "Show IPOs" }));

    const offering = await within(next).findByRole("link", {
      name: "Veegaland Developers IPO: bidding",
    });
    expect(offering).toHaveAttribute("href", "/ipo/veegaland");
    expect(within(next).getByText("Expected")).toBeInTheDocument();
  });

  it("narrows every view to one group", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar" });
    await screen.findByRole("button", { name: /20 Oct 2026: market closed/ });

    await userEvent.click(screen.getByRole("button", { name: "IPOs" }));

    expect(screen.queryByRole("button", { name: /market closed/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Results season" })).toBeNull();
  });

  it("pages to another month, whose day says its time in India and links its source", async () => {
    const platform = stub();
    renderPage(<MarketCalendar />, { at: "/calendar?month=2026-10&day=2026-11-10" });
    await screen.findByRole("heading", { name: "October 2026" });

    await userEvent.click(screen.getByRole("button", { name: "Next month" }));
    await userEvent.click(await screen.findByRole("button", { name: /10 Nov 2026/ }));

    expect(platform.mock.calls.map((call) => call[0])).toContain(
      "/api/calendar?start=2026-10-26&end=2026-12-06",
    );
    expect(await screen.findByText("19:00 IST")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Source: US Bureau of Labor Statistics/ }),
    ).toHaveAttribute("href", "https://www.bls.gov/schedule/news_release/cpi.htm");
    await userEvent.click(screen.getByRole("button", { name: "This month" }));
    expect(await screen.findByRole("heading", { name: "October 2026" })).toBeInTheDocument();
  });

  it("shows the results season and its companies when asked", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar" });

    const season = await screen.findByRole("region", { name: "Results season" });
    expect(within(season).getByText("Jul-Sep 2026 results")).toBeInTheDocument();
    expect(within(season).getByText(/28 days left/)).toBeInTheDocument();
    expect(within(season).getByText(/21 of about 4,337 companies/)).toBeInTheDocument();

    await userEvent.click(within(season).getByRole("button", { name: "Show the companies" }));

    await waitFor(() => {
      expect(within(season).getByText("TCS")).toBeInTheDocument();
    });
  });

  it("counts the events a day cannot name", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar" });

    const busy = await screen.findByRole("button", { name: /28 Oct 2026/ });

    // Four events beside the offering: three named, the market's first, and one counted.
    expect(busy).toHaveAccessibleName(
      "28 Oct 2026: NSE monthly expiry; India industrial production (Sep); India services output (Sep); 1 IPO; 1 more",
    );
    expect(within(busy).getByText("1 IPO")).toBeInTheDocument();
    expect(within(busy).getByText("+1 more")).toBeInTheDocument();
  });

  it("shows an event of several days with its span on any of them", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar?day=2026-10-22" });

    const day = await screen.findByRole("heading", { name: /Thursday, 22 October/ });

    expect(
      await within(day.parentElement as HTMLElement).findByText("Wed, 21 Oct - Fri, 23 Oct"),
    ).toBeInTheDocument();
  });

  it("goes back a month, and choosing today clears the day chosen", async () => {
    const platform = stub();
    renderPage(<MarketCalendar />, { at: "/calendar?day=2026-10-20" });
    await screen.findByRole("heading", { name: /Tuesday, 20 October/ });

    await userEvent.click(screen.getByRole("button", { name: /17 Oct 2026/ }));
    expect(screen.getByRole("heading", { name: /Saturday, 17 October/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(await screen.findByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose a day" })).toBeInTheDocument();
    expect(platform.mock.calls.map((call) => call[0])).toContain(
      "/api/calendar?start=2026-08-31&end=2026-10-04",
    );
  });

  it("keeps the results season when showing results alone", async () => {
    stub();
    renderPage(<MarketCalendar />, { at: "/calendar?group=results" });

    expect(await screen.findByRole("region", { name: "Results season" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /market closed/ })).toBeNull();
  });

  it("says so when the calendar cannot be read", async () => {
    stubPlatform({ "/api/calendar?": { status: 500, body: { detail: "the calendar is down" } } });
    renderPage(<MarketCalendar />, { at: "/calendar?month=bogus&group=bogus" });

    expect(await screen.findAllByText(/The calendar is down/i)).not.toHaveLength(0);
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
  });
});
