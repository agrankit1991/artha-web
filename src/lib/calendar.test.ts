/** Tests for the market calendar's arithmetic and words. */

import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "@/api/client";
import {
  addDays,
  byImportance,
  dayName,
  daySummary,
  daysBetween,
  eventDays,
  eventsOn,
  eventsWithin,
  gridRange,
  groupLabel,
  isHoliday,
  isMonth,
  isWeekend,
  monthGrid,
  monthName,
  monthOf,
  shiftMonth,
  timeInIndia,
} from "@/lib/calendar";

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
    detail: "NSE and BSE closed for Dussehra.",
    certainty: "confirmed",
    at: null,
    source: "NSE, through Upstox",
    link: null,
    subject: null,
    ...overrides,
  };
}

describe("the market calendar", () => {
  it("lays a month out in whole weeks, Monday first", () => {
    const october = monthGrid("2026-10");

    // 1 October 2026 is a Thursday; 1 November a Sunday.
    expect(october).toHaveLength(5);
    expect(october[0]?.[0]).toBe("2026-09-28");
    expect(october.at(-1)?.[6]).toBe("2026-11-01");
    expect(october.every((week) => week.length === 7)).toBe(true);
    // February 2027 starts on a Monday and ends on a Sunday: four weeks exactly.
    expect(monthGrid("2027-02")).toHaveLength(4);
    expect(gridRange("2027-02")).toEqual({ start: "2027-02-01", end: "2027-02-28" });
    expect(gridRange("2026-09")).toEqual({ start: "2026-08-31", end: "2026-10-04" });
  });

  it("moves through months and days across a year's end", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(monthOf("2026-10-20")).toBe("2026-10");
    expect(daysBetween("2026-10-17", "2026-11-14")).toBe(28);
    expect(daysBetween("2026-11-14", "2026-10-17")).toBe(-28);
  });

  it("accepts only a real month from the address", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("October")).toBe(false);
  });

  it("puts an event of several days on each of them", () => {
    const meeting = event({ day: "2026-10-05", last_day: "2026-10-07", kind: "policy_meeting" });

    expect(eventsOn([meeting], "2026-10-06")).toEqual([meeting]);
    expect(eventsOn([meeting], "2026-10-08")).toEqual([]);
    expect(eventsWithin([meeting], "2026-10-07", 14)).toEqual([meeting]);
    expect(eventsWithin([meeting], "2026-10-08", 14)).toEqual([]);
  });

  it("names a day's most telling events and counts its offerings once each", () => {
    const listing = (subject: string): CalendarEvent =>
      event({ kind: "ipo_listing", group: "ipo", title: `${subject}: listing`, subject });
    const fed = event({ kind: "policy_meeting", group: "global", title: "US Fed meeting (FOMC)" });
    const cpi = event({ kind: "data_release", group: "india", title: "India CPI inflation (Sep)" });
    const day = [listing("alpha"), fed, listing("beta"), cpi, event()];

    expect(byImportance(day).map((one) => one.group)).toEqual([
      "market",
      "india",
      "global",
      "ipo",
      "ipo",
    ]);
    expect(daySummary(day, 2)).toEqual({ named: [event(), cpi], offerings: 2, more: 1 });
    expect(daySummary([listing("alpha"), listing("alpha")], 3)).toEqual({
      named: [],
      offerings: 1,
      more: 0,
    });
  });

  it("knows a closed day and a weekend", () => {
    expect(isHoliday([event()])).toBe(true);
    expect(isHoliday([event({ kind: "weekly_expiry" })])).toBe(false);
    expect(isWeekend("2026-10-17")).toBe(true);
    expect(isWeekend("2026-10-19")).toBe(false);
  });

  it("writes days, months and times as a reader says them", () => {
    expect(eventDays(event())).toBe("Tue, 20 Oct");
    expect(eventDays(event({ day: "2026-10-05", last_day: "2026-10-07" }))).toBe(
      "Mon, 5 Oct - Wed, 7 Oct",
    );
    expect(monthName("2026-10")).toBe("October 2026");
    expect(dayName("2026-10-20")).toBe("Tuesday, 20 October");
    expect(timeInIndia("2026-11-10T08:30:00-05:00")).toBe("19:00 IST");
    expect(groupLabel("global")).toBe("Global");
  });
});
