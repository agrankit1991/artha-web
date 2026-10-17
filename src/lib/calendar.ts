/**
 * The market calendar's arithmetic and words.
 *
 * The owner asked for a calendar of the Indian market's important events
 * (2026-10-17), from free sources, laid out as a month grid with what comes
 * next beside it. The events are the platform's (`/api/calendar`); this
 * module lays them out: a month's weeks, which events fall on a day, and
 * what each group is called.
 *
 * Every date is an ISO string, and the arithmetic is done in UTC: a date
 * built at local midnight east of Greenwich lands on the previous day once
 * serialised, which is how two fixtures here once went wrong.
 */

import type { CalendarEvent, EventGroup } from "@/api/client";

/** What each group is called and holds; keyed by group, so none can be missing. */
const GROUP_WORDS: Record<EventGroup, { label: string; description: string }> = {
  market: {
    label: "Market days",
    description:
      "Holidays, special sessions and F&O expiries, from the exchanges' own calendar and listed contracts.",
  },
  ipo: {
    label: "IPOs",
    description: "Each public offering's bidding, allotment and listing, mainboard and SME.",
  },
  results: {
    label: "Results",
    description:
      "SEBI's deadlines for company results, and how many companies' results the platform holds so far.",
  },
  india: {
    label: "India",
    description:
      "RBI policy meetings, inflation, industrial output, GDP, GST collections, the PMIs and the Union Budget.",
  },
  global: {
    label: "Global",
    description: "The US Fed's meetings and the US inflation and jobs reports.",
  },
};

/** The groups, in the order the page offers them, with what each holds. */
export const EVENT_GROUPS: readonly { key: EventGroup; label: string; description: string }[] = (
  ["market", "ipo", "results", "india", "global"] as const
).map((key) => ({ key, ...GROUP_WORDS[key] }));

/** What "expected" means on an event, said once for every place it shows. */
export const EXPECTED_HINT =
  "Not yet announced: the date follows a convention or a published rule (the Budget on 1 February, a release moved off a weekend, a tentative Fed meeting, an IPO's provisional dates), so it may move.";

/**
 * The name of a group.
 *
 * @param group - The group.
 * @returns How the page calls it.
 */
export function groupLabel(group: EventGroup): string {
  return GROUP_WORDS[group].label;
}

/** Milliseconds in a day. */
const DAY = 86_400_000;

/**
 * Parse an ISO date as UTC midnight.
 *
 * @param day - An ISO date.
 * @returns The moment.
 */
function utc(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

/**
 * Write a moment's UTC date.
 *
 * @param moment - The moment.
 * @returns Its ISO date.
 */
function iso(moment: Date): string {
  return moment.toISOString().slice(0, 10);
}

/**
 * Move a day forwards or back.
 *
 * @param day - An ISO date.
 * @param days - How many days; negative goes back.
 * @returns The ISO date that many days away.
 */
export function addDays(day: string, days: number): string {
  return iso(new Date(utc(day).getTime() + days * DAY));
}

/**
 * The month a day falls in.
 *
 * @param day - An ISO date.
 * @returns The month, as `YYYY-MM`.
 */
export function monthOf(day: string): string {
  return day.slice(0, 7);
}

/**
 * Move a month forwards or back.
 *
 * @param month - A month, as `YYYY-MM`.
 * @param months - How many; negative goes back.
 * @returns The month that many away.
 */
export function shiftMonth(month: string, months: number): string {
  const first = utc(`${month}-01`);
  first.setUTCMonth(first.getUTCMonth() + months);
  return monthOf(iso(first));
}

/**
 * Whether a string names a month the page can show.
 *
 * @param value - What the address carries.
 * @returns True for `YYYY-MM` with a real month.
 */
export function isMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * The weeks a month's grid draws, Monday first, with the days either side
 * that complete its first and last weeks.
 *
 * @param month - The month, as `YYYY-MM`.
 * @returns Each week as seven ISO dates.
 */
export function monthGrid(month: string): string[][] {
  const { start, end } = gridRange(month);
  const weeks: string[][] = [];
  for (let monday = start; monday <= end; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, offset) => addDays(monday, offset)));
  }
  return weeks;
}

/**
 * The first and last day a month's grid draws: the Monday on or before its
 * first day, and the Sunday on or after its last.
 *
 * @param month - The month, as `YYYY-MM`.
 * @returns The two ISO dates.
 */
export function gridRange(month: string): { start: string; end: string } {
  const first = `${month}-01`;
  // getUTCDay counts from Sunday; the grid counts from Monday.
  const start = addDays(first, -((utc(first).getUTCDay() + 6) % 7));
  const weeks = Math.ceil(daysBetween(start, `${shiftMonth(month, 1)}-01`) / 7);
  return { start, end: addDays(start, weeks * 7 - 1) };
}

/**
 * Whether a day falls on a weekend.
 *
 * @param day - An ISO date.
 * @returns True for Saturday and Sunday.
 */
export function isWeekend(day: string): boolean {
  const weekday = utc(day).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/**
 * The events falling on a day, an event of several days on each of them.
 *
 * @param events - Events, in the order they fall.
 * @param day - An ISO date.
 * @returns Those whose span includes the day, in the same order.
 */
export function eventsOn(events: readonly CalendarEvent[], day: string): CalendarEvent[] {
  return events.filter((event) => event.day <= day && (event.last_day ?? event.day) >= day);
}

/**
 * The events from a day for a number of days, each once, by its first day
 * (an event already running on the first day counts from it).
 *
 * @param events - Events, in the order they fall.
 * @param from - The first day.
 * @param days - How many days, the first included.
 * @returns The events touching those days.
 */
export function eventsWithin(
  events: readonly CalendarEvent[],
  from: string,
  days: number,
): CalendarEvent[] {
  const last = addDays(from, days - 1);
  return events.filter((event) => event.day <= last && (event.last_day ?? event.day) >= from);
}

/**
 * Whether the equity market is shut on a day.
 *
 * @param events - The day's events.
 * @returns True when one of them is a holiday.
 */
export function isHoliday(events: readonly CalendarEvent[]): boolean {
  return events.some((event) => event.kind === "holiday");
}

/**
 * Write when an event falls: one day, or its first and last.
 *
 * @param event - The event.
 * @returns Something like `Tue 20 Oct` or `Mon 5 Oct - Wed 7 Oct`.
 */
export function eventDays(event: CalendarEvent): string {
  const write = (day: string): string =>
    utc(day).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return event.last_day === null || event.last_day === event.day
    ? write(event.day)
    : `${write(event.day)} - ${write(event.last_day)}`;
}

/**
 * Write a time on India's clock.
 *
 * @param moment - A timestamp with its offset.
 * @returns Something like `19:00 IST`.
 */
export function timeInIndia(moment: string): string {
  const written = new Date(moment).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  return `${written} IST`;
}

/**
 * How many days from one day to another.
 *
 * @param from - An ISO date.
 * @param to - Another.
 * @returns The days between, negative when `to` comes first.
 */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / DAY);
}

/**
 * Write a month in full.
 *
 * @param month - A month, as `YYYY-MM`.
 * @returns Something like `October 2026`.
 */
export function monthName(month: string): string {
  return utc(`${month}-01`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Write a day in full, for a heading.
 *
 * @param day - An ISO date.
 * @returns Something like `Tuesday 20 October`.
 */
export function dayName(day: string): string {
  return utc(day).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * The order groups take within a day: the exchanges' own days first, then
 * policy and data, results, and offerings last. A day can hold dozens of
 * offerings, most of them on the SME board, and they would otherwise bury
 * the one policy meeting that moves the whole market.
 */
const GROUP_RANK: Record<EventGroup, number> = {
  market: 0,
  india: 1,
  global: 2,
  results: 3,
  ipo: 4,
};

/**
 * A day's events, the most telling first (`GROUP_RANK`), otherwise as they came.
 *
 * @param events - The day's events.
 * @returns The same events, reordered.
 */
export function byImportance(events: readonly CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group]);
}

/** What a day's cell has room for. */
export interface DaySummary {
  /** The events named, the most telling first. */
  named: CalendarEvent[];
  /** How many offerings have an event that day, counted as one line. */
  offerings: number;
  /** How many other events there are beyond those named. */
  more: number;
}

/**
 * Sum a day up for its cell: a few events named, the offerings counted.
 *
 * @param events - The day's events.
 * @param room - How many events the cell names.
 * @returns What the cell shows.
 */
export function daySummary(events: readonly CalendarEvent[], room: number): DaySummary {
  const others = byImportance(events.filter((event) => event.group !== "ipo"));
  const offerings = new Set(
    events.filter((event) => event.group === "ipo").map((event) => event.subject ?? event.title),
  ).size;
  return {
    named: others.slice(0, room),
    offerings,
    more: Math.max(0, others.length - room),
  };
}
