/**
 * Shared test helpers.
 *
 * The platform is stubbed at `fetch`, which is the one boundary this
 * application has. Stubbing anything closer in -- the api module, say --
 * would test the components against a fiction the platform never sends.
 */

import { vi } from "vitest";

import type {
  Account,
  BreadthGrid,
  ChartPoint,
  Comparison,
  Member,
  Performance,
  Population,
  BreadthResponse,
  BreadthSession,
  InstrumentOverview,
  MoverPanel,
  MoverRow,
  MentionedInstrument,
  MoversResponse,
  NewsItem,
  NewsPage,
  PriceSeries,
  ScopeBreadth,
  ScopeOptions,
  TrailingReturns,
} from "@/api/client";

/** A reply the stubbed platform should give to a path. */
export interface Reply {
  status?: number;
  /** A fixed body, whatever was asked for. */
  body?: unknown;
  /**
   * A body worked out from the path, for an endpoint whose answer depends
   * on the query. A stub that always returns the first page answers a
   * different question from the platform and hides whatever depended on
   * the difference.
   */
  bodyFor?: (path: string) => unknown;
}

/**
 * Stub `fetch` with a table of replies, matched by path prefix.
 *
 * @param replies - Path prefix to reply. A path with no entry answers 404,
 *   which is what an unexpected request should look like.
 * @returns The mock, so a test can assert on what was requested.
 */
export function stubPlatform(replies: Record<string, Reply>): ReturnType<typeof vi.fn> {
  const mock = vi.fn((input: string | URL | Request) => {
    const path = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const match = Object.keys(replies)
      .sort((a, b) => b.length - a.length)
      .find((prefix) => path.startsWith(prefix));
    const reply: Reply = match === undefined ? { status: 404 } : (replies[match] ?? {});
    const status = reply.status ?? 200;
    const body = reply.bodyFor === undefined ? reply.body : reply.bodyFor(path);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body ?? {}),
    } as Response);
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** An account to be signed in as. */
export const ACCOUNT: Account = {
  account_id: 1,
  email: "tester@example.com",
  display_name: "Tester",
  is_owner: true,
};

/** Build a mover row. */
export function moverRow(overrides: Partial<MoverRow> = {}): MoverRow {
  return {
    instrument_key: "NSE_EQ|INE002A01018",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    rank: 1,
    value: "8.250000",
    streak: 3,
    close: "1294.900000",
    change_percent: "8.250000",
    ...overrides,
  };
}

/** Build one mover list. */
export function panel(overrides: Partial<MoverPanel> = {}): MoverPanel {
  return {
    name: "top-gainers",
    as_of: "2026-09-18",
    rows: [moverRow()],
    ...overrides,
  };
}

/** Build a movers response carrying every list the API returns. */
export function moversResponse(panels: MoverPanel[] = [panel()]): MoversResponse {
  return { scope_kind: "companies", scope_key: null, panels };
}

/** Build the scope options. */
export function scopeOptions(overrides: Partial<ScopeOptions> = {}): ScopeOptions {
  return {
    sectors: [{ key: "IT - Software", label: "IT - Software" }],
    indices: [{ key: "NSE_INDEX|Nifty 50", label: "Nifty 50" }],
    ...overrides,
  };
}

/** Build an instrument's derived figures. */
export function overview(overrides: Partial<InstrumentOverview> = {}): InstrumentOverview {
  return {
    instrument_key: "NSE_INDEX|Nifty 50",
    as_of: "2026-09-18",
    sessions: 410,
    day: {
      open: "24700.000000",
      high: "24850.000000",
      low: "24690.000000",
      close: "24812.400000",
      previous_close: "24659.000000",
      volume: 0,
      change: "153.400000",
      change_percent: "0.620000",
      range_percent: "0.640000",
      gap_percent: "0.160000",
    },
    returns: {
      one_week: "1.100000",
      one_month: "2.400000",
      three_months: "5.900000",
      six_months: "9.200000",
      one_year: "14.300000",
      year_to_date: "11.700000",
    },
    year_range: {
      high: "25100.000000",
      high_day: "2026-08-04",
      low: "21400.000000",
      low_day: "2025-11-07",
      from_high_percent: "-1.150000",
      from_low_percent: "15.900000",
      max_drawdown_percent: "-8.200000",
    },
    trend: {
      sma_20: "24600.000000",
      sma_50: "24300.000000",
      sma_200: "23500.000000",
      from_sma_50_percent: "2.100000",
      from_sma_200_percent: "5.600000",
      sessions_above_sma_200: 61,
      consecutive_rises: 2,
      consecutive_falls: 0,
    },
    volume: {
      average_week: "0.00",
      average_month: "0.00",
      average_quarter: "0.00",
      relative_to_average: null,
    },
    risk: {
      average_true_range: "180.000000",
      deviation_20: "120.000000",
      volatility_month: "11.400000",
      volatility_year: "13.900000",
    },
    momentum: {
      rsi: "58.200000",
      macd: "42.000000",
      macd_signal: "38.000000",
      macd_histogram: "4.000000",
    },
    ...overrides,
  };
}

/** Build one session's breadth counts. */
export function breadthSession(overrides: Partial<BreadthSession> = {}): BreadthSession {
  return {
    as_of: "2026-09-18",
    instruments: 100,
    advancing: 60,
    declining: 35,
    unchanged: 5,
    advancing_volume: 600,
    declining_volume: 400,
    new_highs: 12,
    new_lows: 3,
    above_sma_20: "58.000000",
    above_sma_50: "54.000000",
    above_sma_200: "62.000000",
    advance_decline_ratio: "1.714286",
    net_advance_percent: "26.315789",
    arms_index: "0.857143",
    advance_decline_line: "1250",
    mcclellan_oscillator: "42.500000",
    ...overrides,
  };
}

/** The date a given number of days before the latest counted session. */
function sessionDay(daysBefore: number): string {
  const day = new Date("2026-09-18T00:00:00Z");
  day.setUTCDate(day.getUTCDate() - daysBefore);
  return day.toISOString().slice(0, 10);
}

/** Build a breadth reading with a run behind it. */
export function breadth(overrides: Partial<BreadthResponse> = {}): BreadthResponse {
  const length = 40;
  const sessions = Array.from({ length }, (_unused, index) =>
    breadthSession({
      as_of: sessionDay(length - 1 - index),
      advance_decline_line: String(1000 + index * 10),
      mcclellan_oscillator: index < length - 2 ? null : String(index),
    }),
  );
  return {
    scope_kind: "companies",
    scope_key: null,
    latest: sessions[sessions.length - 1] ?? null,
    sessions,
    advance_decline_line: "1390",
    mcclellan_oscillator: "39",
    mcclellan_summation: "500",
    breadth_thrust: "0.62",
    high_low_index: "80",
    regime: "risk-on",
    percentiles: {
      sessions: 6621,
      above_sma_20: "64.00",
      above_sma_50: "58.00",
      above_sma_200: "71.00",
    },
    ...overrides,
  };
}

/** Build one population's place in a grid. */
export function scopeBreadth(overrides: Partial<ScopeBreadth> = {}): ScopeBreadth {
  return {
    scope_key: "IT - Software",
    instruments: 42,
    advancing: 30,
    declining: 12,
    above_sma_200: "76.190000",
    above_sma_50: "61.900000",
    regime: "over-extended",
    rotation: "4.500000",
    ...overrides,
  };
}

/** Build a grid of populations. */
export function breadthGrid(overrides: Partial<BreadthGrid> = {}): BreadthGrid {
  return {
    scope_kind: "sector",
    as_of: "2026-09-18",
    compared_with: "2026-09-11",
    scopes: [
      scopeBreadth(),
      scopeBreadth({
        scope_key: "Pharmaceuticals",
        instruments: 61,
        advancing: 20,
        declining: 38,
        above_sma_200: "31.100000",
        above_sma_50: "24.500000",
        regime: "risk-off",
        rotation: "-8.200000",
      }),
    ],
    ...overrides,
  };
}

/** Build a news article. */
export function newsItem(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    url: "https://upstox.com/news/oil",
    headline: "Refiners lead the index higher",
    summary: "Crude eased overnight and the refiners opened strongly.",
    thumbnail_url: null,
    published_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    mentions: [{ instrument_key: "NSE_EQ|INE002A01018", symbol: "RELIANCE" }],
    ...overrides,
  };
}

/** Build a page of the news feed. */
export function newsPage(overrides: Partial<NewsPage> = {}): NewsPage {
  return {
    total: 1,
    limit: 12,
    offset: 0,
    items: [newsItem()],
    ...overrides,
  };
}

/** Build a run of articles, each an hour older than the one before. */
export function newsItems(count: number): NewsItem[] {
  return Array.from({ length: count }, (_unused, index) =>
    newsItem({
      url: `https://upstox.com/news/a${String(index)}`,
      headline: `Headline ${String(index)}`,
      published_at: new Date(Date.now() - (index + 1) * 3_600_000).toISOString(),
    }),
  );
}

/** Build a company offered as a news filter. */
export function mentionedInstrument(
  overrides: Partial<MentionedInstrument> = {},
): MentionedInstrument {
  return {
    instrument_key: "NSE_EQ|INE467B01029",
    symbol: "TCS",
    name: "Tata Consultancy Services",
    articles: 12,
    ...overrides,
  };
}

/** Build a set of trailing returns. */
function trailing(scale = 1): TrailingReturns {
  return {
    one_week: String(1 * scale),
    one_month: String(2 * scale),
    three_months: String(3 * scale),
    six_months: String(4 * scale),
    one_year: String(5 * scale),
    year_to_date: String(6 * scale),
  };
}

/** Build one company in a population. */
export function member(overrides: Partial<Member> = {}): Member {
  return {
    instrument_key: "NSE_EQ|INE002A01018",
    symbol: "RELIANCE",
    name: "Reliance Industries",
    close: "1294.900000",
    change_percent: "2.500000",
    volume: 9799528,
    one_week: "1.100000",
    one_month: "2.400000",
    three_months: "5.900000",
    one_year: "14.300000",
    from_high_percent: "-8.200000",
    from_low_percent: "15.900000",
    from_sma_200_percent: "5.600000",
    as_of: "2026-09-18",
    ...overrides,
  };
}

/** Build a comparison against one benchmark. */
export function comparison(overrides: Partial<Comparison> = {}): Comparison {
  return {
    instrument_key: "NSE_INDEX|Nifty 500",
    label: "Nifty 500",
    role: "Whole market",
    returns: trailing(),
    relative: trailing(2),
    ...overrides,
  };
}

/** Build a population's performance. */
export function performance(overrides: Partial<Performance> = {}): Performance {
  return {
    basis: "index",
    returns: trailing(3),
    against: [comparison()],
    ...overrides,
  };
}

/** Build one index or sector. */
export function population(overrides: Partial<Population> = {}): Population {
  return {
    scope_kind: "index",
    scope_key: "NSE_INDEX|Nifty Bank",
    name: "Nifty Bank",
    category: "SECTORAL",
    description: "The most liquid and large capitalised Indian banking stocks.",
    instrument_key: "NSE_INDEX|Nifty Bank",
    performance: performance(),
    members: [member(), member({ instrument_key: "NSE_EQ|INE467B01029", symbol: "TCS" })],
    ...overrides,
  };
}

/** Build a run of chart sessions, each a day after the last. */
export function chartPoints(count: number, start = "2026-09-01"): ChartPoint[] {
  const first = new Date(`${start}T00:00:00Z`);
  return Array.from({ length: count }, (_unused, index) => {
    const day = new Date(first);
    day.setUTCDate(first.getUTCDate() + index);
    return {
      day: day.toISOString().slice(0, 10),
      open: String(100 + index),
      high: String(104 + index),
      low: String(99 + index),
      close: String(103 + index),
      volume: 1_000_000 + index,
      sma_20: String(101 + index),
      sma_50: String(99 + index),
      sma_200: String(95 + index),
      rsi: "57.5",
    };
  });
}

/** Build a closing-price series of a given length. */
export function priceSeries(
  instrumentKey: string,
  closes: number[],
  start = "2026-03-02",
): PriceSeries {
  // Built in UTC throughout: local midnight serialised through
  // toISOString() lands on the previous day everywhere east of Greenwich,
  // which is where this application runs.
  const first = new Date(`${start}T00:00:00Z`);
  return {
    instrument_key: instrumentKey,
    points: closes.map((close, index) => {
      const day = new Date(first);
      day.setUTCDate(first.getUTCDate() + index);
      return { day: day.toISOString().slice(0, 10), close: close.toFixed(6) };
    }),
  };
}
