/**
 * Turning the platform's figures into something readable.
 *
 * Figures arrive as strings because the platform computes in decimal. They
 * are parsed here, at the point of display, and nowhere else -- so the
 * precision survives everything except the last step, where a screen can
 * only show so many digits anyway.
 *
 * An absent figure is not nought. A company listed last month has no yearly
 * return, and showing one of `0.00%` would rank it in the middle of a sorted
 * column rather than out of it. Every formatter here renders absence as a
 * dash.
 */

/** What a missing figure looks like. One character, so a column stays aligned. */
export const ABSENT = "—";

/**
 * Parse a figure for arithmetic or sorting.
 *
 * @param value - The figure as the platform sent it.
 * @returns The number, or null when there was no figure.
 */
export function toNumber(value: string | null | undefined): number | null {
  // An empty string is not a figure, but `Number("")` is nought -- which is
  // precisely the confusion between absence and nought this module exists
  // to prevent, arriving through the back door.
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Render a price.
 *
 * @param value - The figure.
 * @returns Two decimal places, grouped, or a dash.
 */
export function formatPrice(value: string | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null
    ? ABSENT
    : parsed.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Render a move in price or points, signed, as a header shows it beside
 * the percentage: `+312.45`.
 *
 * @param value - The move.
 * @returns The move with its sign, grouped, or a dash.
 */
export function formatSignedPrice(value: string | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  return `${parsed > 0 ? "+" : ""}${formatPrice(value)}`;
}

/**
 * Render a percentage, signed.
 *
 * The sign is always shown, including for a rise: a column of percentages
 * where only the falls carry a mark reads as though the rises were absolute.
 *
 * @param value - The figure.
 * @returns The percentage, or a dash.
 */
export function formatPercent(value: string | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  const sign = parsed > 0 ? "+" : "";
  return `${sign}${parsed.toFixed(2)}%`;
}

/**
 * Render a percentage to one decimal place, signed: `+26.2%`.
 *
 * For figures published to one decimal, such as the strategy lab's
 * returns, where a second decimal would be a digit nobody measured.
 *
 * @param value - The figure.
 * @returns The percentage, or a dash.
 */
export function formatPercentTenths(value: string | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(1)}%`;
}

/**
 * Render a difference between two percentages, in percentage points:
 * `+13.5 pp`.
 *
 * Points, not per cent: a return of 26% against 13% is thirteen points
 * better and a hundred per cent better, and the wrong word makes the
 * figure ambiguous.
 *
 * @param value - The difference, to one decimal.
 * @returns The signed difference with its unit, or a dash.
 */
export function formatPercentagePoints(value: string | null | undefined): string {
  const parsed = toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  return `${parsed > 0 ? "+" : ""}${parsed.toFixed(1)} pp`;
}

/**
 * Render a ratio, as a multiple.
 *
 * @param value - The figure.
 * @returns Something like `4.2×`, or a dash.
 */
export function formatMultiple(value: string | null | undefined): string {
  const parsed = toNumber(value);
  return parsed === null ? ABSENT : `${parsed.toFixed(1)}×`;
}

/**
 * Render a traded volume.
 *
 * Abbreviated in the Indian convention -- lakh and crore -- because a
 * column of nine-digit numbers is unreadable and this is an Indian market.
 *
 * @param value - The volume, as a number or a figure.
 * @returns Something like `1.2 Cr`, or a dash.
 */
export function formatVolume(value: number | string | null | undefined): string {
  const parsed = typeof value === "number" ? value : toNumber(value);
  if (parsed === null) {
    return ABSENT;
  }
  if (Math.abs(parsed) >= 10_000_000) {
    return `${(parsed / 10_000_000).toFixed(2)} Cr`;
  }
  if (Math.abs(parsed) >= 100_000) {
    return `${(parsed / 100_000).toFixed(2)} L`;
  }
  return parsed.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/**
 * Render a plain count.
 *
 * @param value - The count.
 * @returns The number, or a dash.
 */
export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? ABSENT : String(value);
}

/**
 * Render a whole number, grouped the Indian way.
 *
 * For sums whose decimals are noise -- a market capitalisation in crore
 * -- where a count's plain digits would be unreadable past five figures.
 *
 * @param value - The figure; rounded to the nearest whole.
 * @returns The grouped figure, e.g. ``1,67,825``.
 */
export function formatWhole(value: number): string {
  return Math.round(value).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

/**
 * Render a session date.
 *
 * @param value - An ISO date, or null.
 * @returns Something like `18 Sep 2026`, or a dash.
 */
export function formatDay(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ABSENT;
  }
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? ABSENT
    : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Render a session date without its year, for a heading the year already
 * stands over: `21 Sep`.
 *
 * @param value - An ISO date.
 * @returns The day and the month, or a dash.
 */
export function formatDayMonth(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? ABSENT
    : parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Render a calendar month: `Nov 2019`.
 *
 * @param value - The month, as `YYYY-MM`.
 * @returns The month and the year, or a dash.
 */
export function formatMonth(value: string): string {
  const parsed = new Date(`${value}-01T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? ABSENT
    : parsed.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/**
 * Describe how long something has been in a list.
 *
 * @param streak - Sessions in a row, counting this one.
 * @returns `1d`, `6d`, and so on.
 */
export function formatStreak(streak: number): string {
  return `${String(streak)}d`;
}

/**
 * Decide whether a figure reads as a rise, a fall, or neither.
 *
 * @param value - The figure.
 * @returns Its direction, with `flat` covering both nought and absence --
 *   neither of which should be coloured as a move.
 */
export function direction(value: string | number | null | undefined): "up" | "down" | "flat" {
  const parsed = typeof value === "number" ? value : toNumber(value);
  if (parsed === null || parsed === 0) {
    return "flat";
  }
  return parsed > 0 ? "up" : "down";
}

/**
 * Render how long ago something happened.
 *
 * Relative rather than absolute, because on a news item "3h ago" is the
 * question a reader is actually asking and a timestamp makes them subtract.
 *
 * @param value - An ISO timestamp, or null.
 * @param now - The moment to measure from; injected so a test is not
 *   dependent on when it runs.
 * @returns Something like `3h ago`, or a dash.
 */
export function formatSince(value: string | null | undefined, now: Date = new Date()): string {
  if (value === null || value === undefined) {
    return ABSENT;
  }
  const moment = new Date(value);
  if (Number.isNaN(moment.getTime())) {
    return ABSENT;
  }
  const minutes = Math.round((now.getTime() - moment.getTime()) / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${String(minutes)}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${String(hours)}h ago`;
  }
  const days = Math.floor(hours / 24);
  return days < 7
    ? `${String(days)}d ago`
    : moment.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Today's date on the Indian markets' calendar.
 *
 * Not the browser's UTC date: between midnight and half past five in the
 * morning, India's today is UTC's tomorrow, and an ex-date compared with
 * the wrong one is called past on the day it happens.
 *
 * @param now - The moment to read; injected so a test is not dependent on
 *   when it runs.
 * @returns The ISO date, such as `2026-09-23`.
 */
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}
