/**
 * Named scans: the questions asked of the market often enough to name.
 *
 * StockEdge's scans, as saved screener conditions. A scan is only a set of
 * conditions the screener already understands, so there is one screening
 * rule-set in the application, not two: the scans page runs each through
 * the screener for its count and opens the screener on it, and the
 * screener offers the featured ones as one-click chips.
 *
 * Some scans stand behind a strategy the strategy lab backtested
 * (`research/strategy-lab`): the scan lists today's candidates and the
 * strategy says which of them it would hold. The tested figures are copied
 * from the lab's records verbatim, to the decimal the lab printed, and are
 * as of `STRATEGIES_EVALUATED`; they do not update themselves.
 */

import type { ScopeKind, ScreenCondition, ScreenHit } from "@/api/client";
import { NIFTY_50 } from "@/lib/indices";
import { PATHS } from "@/lib/paths";

/** How the scans are grouped, in the order the page shows them. */
export type ScanCategory =
  "Strategies" | "Fundamentals" | "Size" | "Price" | "Trend" | "Momentum" | "Volume" | "Volatility";

export const SCAN_CATEGORIES: readonly ScanCategory[] = [
  "Strategies",
  "Fundamentals",
  "Size",
  "Price",
  "Trend",
  "Momentum",
  "Volume",
  "Volatility",
];

/** A strategy's rules, in plain words. */
export interface StrategyRules {
  /** What it buys, and when. */
  pick: string;
  /** What makes it sell. */
  sell: string;
  /** When it steps out of the market altogether; absent for a strategy that never does. */
  marketSwitch?: string;
  /** How many positions, and how the money is split between them. */
  holding: string;
}

/**
 * How a strategy did in the lab over the years its rules were not chosen
 * on. Every figure is a percentage, or percentage points for an edge, as
 * the lab printed it.
 */
export interface StrategyRecord {
  /** The first month of the backtest, as `YYYY-MM`. */
  from: string;
  /** The first of the unseen (out-of-sample) years, which run to the evaluation. */
  unseenFrom: number;
  /**
   * Its return a year over the unseen years. For a strategy that re-picks
   * every 21 sessions, the median over the 21 sessions its schedule could
   * start on, which is what the lab judges it by.
   */
  cagr: number;
  /** The Nifty 500's return a year over the same years. */
  nifty500: number;
  /**
   * Points a year over random picks made under the same rules. Random picks
   * share every bias of the test, so this is the figure to trust.
   */
  edge: number;
  /** The same edge with 2020 and 2021, two unusually kind years, left out. */
  edgeWithout2020To2021: number;
  /** The deepest fall from a peak over the unseen years. */
  maxDrawdown: number;
}

/** A strategy the lab backtested, which a scan finds today's candidates for. */
export interface Strategy {
  /** The lab's card for it, e.g. `S0010`. */
  id: string;
  /** What it does and why, in one plain sentence. */
  headline: string;
  howItWorks: StrategyRules;
  /**
   * Which of the scan's rows the strategy would hold, and when. Named by
   * the figure it ranks them on rather than by position, because the
   * results can be re-sorted by any column on the page.
   */
  rowsHeld: string;
  tested: StrategyRecord;
  /**
   * Its return in each calendar year, per cent. For a strategy that
   * re-picks every 21 sessions these are one of its schedules, so they
   * compound to a different figure from `tested.cagr`: up to about four
   * points a year higher for the strategies here.
   */
  years: Readonly<Record<number, number>>;
  /** The years it was tested for only part of: its first, and the one still running. */
  partialYears: readonly number[];
  /** What to hold against the figures, its own first and then those every strategy shares. */
  caveats: readonly string[];
}

/** One named scan. */
export interface Scan {
  key: string;
  label: string;
  category: ScanCategory;
  /** What it finds, in a sentence. */
  description: string;
  conditions: ScreenCondition[];
  /** What the results are ordered by, largest first, when the scan says. */
  sort?: string;
  /** Offered as a chip on the screener. */
  featured?: boolean;
  /** The backtested strategy this scan finds candidates for, when it is one. */
  strategy?: Strategy;
}

/** A scan that stands behind a strategy. */
export type StrategyScan = Scan & { strategy: Strategy };

/** When the strategy lab last evaluated the strategies. */
export const STRATEGIES_EVALUATED = "2026-09-24";

/** The last session the lab's data reached; the current year's figures run to it. */
export const STRATEGIES_DATA_THROUGH = "2026-09-21";

/**
 * The session the market switch last shut, which it still was at
 * `STRATEGIES_DATA_THROUGH`: from the lab's S0008 card, whose switch the
 * three switched strategies share. It explains most of the running year:
 * they have held gold while momentum stocks rose without the Nifty 50.
 */
export const SWITCH_SHUT_SINCE = "2026-03-02";

/** The Nifty 500's return in each calendar year, per cent, as the lab measured it. */
export const NIFTY_500_YEARS: Readonly<Record<number, number>> = {
  2005: 34.0,
  2006: 34.0,
  2007: 62.5,
  2008: -57.1,
  2009: 88.6,
  2010: 14.1,
  2011: -27.2,
  2012: 31.8,
  2013: 3.6,
  2014: 37.8,
  2015: -0.7,
  2016: 3.8,
  2017: 35.9,
  2018: -3.4,
  2019: 7.7,
  2020: 16.7,
  2021: 30.2,
  2022: 3.0,
  2023: 25.8,
  2024: 15.2,
  2025: 6.7,
  2026: -4.2,
};

/**
 * The market switch three of the strategies share, as the lab tested it:
 * the Nifty 50 against its 150-day average, with a band either side so a
 * market hovering at the average does not flip it back and forth.
 */
export const MARKET_SWITCH = {
  /** The index it watches. */
  index: NIFTY_50,
  /** The screener figure for a close against its 150-day average, per cent. */
  field: "from_sma_150_percent",
  /** How far past the average, either way, before the switch changes. */
  band: 2,
} as const;

/** Where the market switch stands: invested, in gold, or inside the band where it keeps its last state. */
export type SwitchPosition = "on" | "off" | "band";

/**
 * Read the market switch off its index's distance from the average.
 *
 * @param fromAverage - The index's close against its 150-day average, per cent.
 * @returns `on` above the band, `off` below it, and `band` inside it, where
 *   the switch stays as it last was -- which one reading cannot tell.
 */
export function switchPosition(fromAverage: number): SwitchPosition {
  if (fromAverage > MARKET_SWITCH.band) {
    return "on";
  }
  if (fromAverage < -MARKET_SWITCH.band) {
    return "off";
  }
  return "band";
}

/**
 * The lab's basic filters: companies worth ₹1,000 Cr or more whose value
 * traded averaged ₹10 Cr over the 20 sessions before today. The average
 * leaves today out, as the lab's did, so one day's spike cannot make a
 * thin stock look liquid.
 */
const LIQUID_COMPANIES: readonly ScreenCondition[] = [
  { field: "market_cap", operator: "gte", value: "1000" },
  { field: "traded_value_average_20", operator: "gte", value: "10" },
];

/** `LIQUID_COMPANIES` in words, to follow "companies" or a comma mid-sentence. */
const LIQUID_COMPANIES_IN_WORDS =
  "worth ₹1,000 Cr or more with a 20-session average value traded of at least ₹10 Cr, measured before today";

/** The market switch as words, for the strategies that use it. */
const SWITCH_RULE =
  "Invested once the Nifty 50 closes more than 2% above its 150-day average; everything is sold and held in gold once it closes more than 2% below. In between, it stays as it was.";

/** How the monthly strategies hold what they pick. */
const TWENTY_EQUAL =
  "20 equal positions, bought at the next open; a winner that stays in the top 20 is not trimmed.";

/**
 * What a monthly strategy with the market switch holds of the scan's rows.
 *
 * @param figure - What it ranks the rows on, as a reader would name it.
 * @returns The rule, conditional on the switch.
 */
function twentyWhileSwitchedOn(figure: string): string {
  return `While the market switch is on, the 20 with the highest ${figure} on a re-pick day. While it is off, none of them: it holds gold.`;
}

/** What every strategy's figures share, said after its own caveats. */
const SHARED_CAVEATS: readonly string[] = [
  "Tested only on companies still listed today, which flatters every return; random picks share that flattery, so the edge over them is the figure to trust.",
  "Costs of 0.2% on every buy and every sell are counted; tax is not.",
  "Past results are not a promise.",
];

export const SCANS: readonly Scan[] = [
  {
    key: "momentum-12-1-near-high",
    label: "12-1 momentum near the 52-week high",
    category: "Strategies",
    description: `Within 15% of the 52-week high, ${LIQUID_COMPANIES_IN_WORDS}; highest 12-1 momentum first.`,
    conditions: [
      { field: "from_high_percent", operator: "gte", value: "-15" },
      ...LIQUID_COMPANIES,
    ],
    // The platform puts a company without a 12-1 figure (under a year of
    // history) last in either order, so it cannot reach the first 20 rows;
    // no condition is needed to keep it out of them.
    sort: "momentum_12_1",
    featured: true,
    strategy: {
      id: "S0010",
      headline:
        "Holds the 20 strongest stocks of the past year, skipping the latest month, among those still close to their 52-week high, because stocks that have risen steadily and are not falling away tend to keep rising.",
      howItWorks: {
        pick: `Every 21 trading sessions (about monthly), the 20 highest 12-1 momentum figures (the return from a year ago to a month ago) among companies within 15% of their 52-week high, ${LIQUID_COMPANIES_IN_WORDS}.`,
        sell: "A holding that drops out of the top 20 at a re-pick, including by falling more than 15% below its high. No stop-loss in between.",
        marketSwitch: SWITCH_RULE,
        holding: TWENTY_EQUAL,
      },
      rowsHeld: twentyWhileSwitchedOn("12-1 momentum"),
      tested: {
        from: "2005-01",
        unseenFrom: 2018,
        cagr: 26.2,
        nifty500: 10.7,
        edge: 13.5,
        edgeWithout2020To2021: 12.3,
        maxDrawdown: -32.3,
      },
      years: {
        2005: 23.9,
        2006: 61.6,
        2007: 78.5,
        2008: -17.1,
        2009: 69.9,
        2010: 11.9,
        2011: -1.5,
        2012: 25.2,
        2013: -7.7,
        2014: 102.8,
        2015: -10.9,
        2016: 8.2,
        2017: 104.8,
        2018: -19.9,
        2019: -1.0,
        2020: 75.2,
        2021: 141.7,
        2022: -5.4,
        2023: 89.2,
        2024: 53.8,
        2025: 39.9,
        2026: -22.8,
      },
      partialYears: [2026],
      caveats: [
        "The 15% near-the-high filter paid only in the unseen years: before 2018 it was neutral to slightly negative, so part of the edge rests on 2018 onwards.",
        ...SHARED_CAVEATS,
      ],
    },
  },
  {
    key: "momentum-high-delivery",
    label: "Momentum among high-delivery stocks",
    category: "Strategies",
    description: `Half or more of the traded shares taken into delivery on average over a full 20 published sessions, ${LIQUID_COMPANIES_IN_WORDS}; best 1-year return first.`,
    conditions: [
      { field: "delivery_percent_average", operator: "gte", value: "50" },
      ...LIQUID_COMPANIES,
    ],
    sort: "one_year",
    strategy: {
      id: "S0012",
      headline:
        "Holds the 20 best performers of the past year among stocks where half or more of the traded shares are taken into delivery; in the lab the gain came from ranking by the year's return within that group, as being a high-delivery stock was itself worth little after 2022.",
      howItWorks: {
        pick: `Every 21 trading sessions (about monthly), the 20 highest 1-year returns among companies whose delivered shares averaged at least 50% of those traded over their last 20 published sessions (the latest no more than 5 sessions old), ${LIQUID_COMPANIES_IN_WORDS}.`,
        sell: "A holding that drops out of the top 20 at a re-pick, including when its delivery average falls below 50%. No stop-loss in between.",
        marketSwitch: SWITCH_RULE,
        holding: TWENTY_EQUAL,
      },
      rowsHeld: twentyWhileSwitchedOn("1-year return"),
      tested: {
        from: "2019-11",
        unseenFrom: 2023,
        cagr: 35.1,
        nifty500: 11.0,
        edge: 13.8,
        edgeWithout2020To2021: 15.8,
        maxDrawdown: -23.4,
      },
      years: {
        2019: 4.3,
        2020: 97.3,
        2021: 127.8,
        2022: 1.9,
        2023: 68.0,
        2024: 52.1,
        2025: 42.5,
        2026: -11.0,
      },
      partialYears: [2019, 2026],
      caveats: [
        "Delivery figures begin in late 2019, so it is tested on about seven years and never through a bad year for the market.",
        "The delivery average needs a full 20 published sessions and goes blank when a stock's delivery data is more than 5 sessions old, as the lab tested it; a stock without one is not a candidate.",
        "The idea was drawn from the same years it is tested on, so those years are not a clean test of it.",
        "The 50% threshold sits on a peak: 40% or 60% earned about 28-30% a year over the unseen years.",
        "So far in 2026 it has done worse than the market (-11.0% against the Nifty 500's -4.2%) while its market switch held gold.",
        ...SHARED_CAVEATS,
      ],
    },
  },
  {
    key: "volume-delivery-surge",
    label: "Volume and delivery surge",
    category: "Strategies",
    description: `Up on the day on twice its usual volume with half or more of the traded shares delivered, ${LIQUID_COMPANIES_IN_WORDS}; highest relative volume first.`,
    conditions: [
      { field: "relative_volume", operator: "gte", value: "2" },
      { field: "delivery_percent", operator: "gte", value: "50" },
      { field: "change_percent", operator: "gt", value: "0" },
      ...LIQUID_COMPANIES,
    ],
    sort: "relative_volume",
    strategy: {
      id: "S0006",
      headline:
        "Buys the morning after a rising session on twice the usual volume in which half or more of the traded shares were taken into delivery; in the lab the surge and the rise added nothing on their own, and the edge came from the high delivery and the ranking by volume, in 2023-26.",
      howItWorks: {
        pick: `The next morning, after a session with at least twice the usual volume, at least half the traded shares taken into delivery and a close above the previous one, among companies ${LIQUID_COMPANIES_IN_WORDS}; highest relative volume first.`,
        sell: "At +20%, or at the open after 25 trading sessions, whichever comes first. No stop-loss.",
        holding:
          "Up to 20 equal positions; a freed slot is refilled from the next signals, and money not in a position earns nothing.",
      },
      rowsHeld:
        "Every row is a signal: bought at the next open, highest relative volume first, while any of the 20 slots is free.",
      tested: {
        from: "2019-11",
        unseenFrom: 2023,
        cagr: 30.9,
        nifty500: 11.0,
        edge: 19.0,
        edgeWithout2020To2021: 19.2,
        maxDrawdown: -17.2,
      },
      years: {
        2019: 0.2,
        2020: 16.6,
        2021: 41.1,
        2022: 4.7,
        2023: 41.0,
        2024: 53.2,
        2025: 12.2,
        2026: 17.6,
      },
      partialYears: [2019, 2026],
      caveats: [
        "Delivery figures begin in late 2019, so it is tested on about seven years.",
        "Most of the edge was earned in 2024-26.",
        "The exact settings are a local peak: neighbouring settings earned about half the edge.",
        "The lab's realistic expectation is about 5 points a year over random picks with the same exits, well under the edge above.",
        "Buying at the open is not always possible: a stock locked at its upper circuit may have no sellers.",
        ...SHARED_CAVEATS,
      ],
    },
  },
  {
    key: "volatility-adjusted-momentum",
    label: "Volatility-adjusted momentum",
    category: "Strategies",
    description: `Companies ${LIQUID_COMPANIES_IN_WORDS}; highest 1-year return per unit of volatility first.`,
    conditions: [...LIQUID_COMPANIES],
    sort: "return_per_volatility",
    strategy: {
      id: "S0009",
      headline:
        "Holds the 20 stocks with the best past year for the swings they took to get there, because a steady rise is likelier to last than a jumpy one.",
      howItWorks: {
        pick: `Every 21 trading sessions (about monthly), the 20 highest 1-year returns per unit of volatility (the year's return divided by its annualised volatility) among companies ${LIQUID_COMPANIES_IN_WORDS}.`,
        sell: "A holding that drops out of the top 20 at a re-pick. No stop-loss in between.",
        marketSwitch: SWITCH_RULE,
        holding: TWENTY_EQUAL,
      },
      rowsHeld: twentyWhileSwitchedOn("1-year return per unit of volatility"),
      tested: {
        from: "2005-01",
        unseenFrom: 2018,
        cagr: 22.1,
        nifty500: 10.7,
        edge: 9.4,
        edgeWithout2020To2021: 7.5,
        maxDrawdown: -33.9,
      },
      years: {
        2005: 34.3,
        2006: 60.9,
        2007: 96.3,
        2008: -14.5,
        2009: 79.9,
        2010: 17.6,
        2011: -4.2,
        2012: 21.9,
        2013: 4.2,
        2014: 94.3,
        2015: -10.1,
        2016: 8.5,
        2017: 101.7,
        2018: -17.2,
        2019: 2.2,
        2020: 82.2,
        2021: 97.1,
        2022: -11.3,
        2023: 86.1,
        2024: 41.6,
        2025: 31.0,
        2026: -18.4,
      },
      partialYears: [2026],
      caveats: [
        "Its ranking uses the platform's 1-year volatility, worked out from simple daily returns, where the lab used log returns; the two differ slightly, so stocks with nearly equal figures can be ordered differently from the lab's.",
        ...SHARED_CAVEATS,
      ],
    },
  },
  {
    key: "monthly-momentum",
    label: "Monthly momentum (baseline)",
    category: "Strategies",
    description: `Companies ${LIQUID_COMPANIES_IN_WORDS}; best 1-year return first.`,
    conditions: [...LIQUID_COMPANIES],
    sort: "one_year",
    strategy: {
      id: "S0003",
      headline:
        "Holds the 20 best performers of the past year, re-picked monthly and always invested: the plain momentum rule the other strategies are measured against.",
      howItWorks: {
        pick: `Every 21 trading sessions (about monthly), the 20 highest 1-year returns among companies ${LIQUID_COMPANIES_IN_WORDS}.`,
        sell: "A holding that drops out of the top 20 at a re-pick. No stop-loss.",
        holding:
          "20 equal positions, always invested; a winner that stays in the top 20 is not trimmed.",
      },
      rowsHeld: "The 20 with the highest 1-year return on a re-pick day.",
      tested: {
        from: "2005-01",
        unseenFrom: 2018,
        cagr: 23.2,
        nifty500: 10.7,
        edge: 9.8,
        edgeWithout2020To2021: 0.6,
        maxDrawdown: -44.8,
      },
      years: {
        2005: 39.0,
        2006: 31.6,
        2007: 139.1,
        2008: -70.7,
        2009: 72.1,
        2010: 24.3,
        2011: -18.6,
        2012: 47.6,
        2013: 5.6,
        2014: 108.7,
        2015: 9.7,
        2016: -10.4,
        2017: 191.4,
        2018: -13.7,
        2019: 1.2,
        2020: 75.0,
        2021: 65.7,
        2022: -13.7,
        2023: 87.7,
        2024: 32.5,
        2025: -5.0,
        2026: 42.7,
      },
      partialYears: [2026],
      caveats: [
        "Its edge over random picks almost disappears without 2020-21 (+0.6 points).",
        "It is the baseline: the plain momentum rule the other strategies are measured against.",
        ...SHARED_CAVEATS,
      ],
    },
  },
  {
    key: "profitable-growing",
    label: "Profitable and growing",
    category: "Fundamentals",
    description:
      "Profitable over the last four quarters, revenue up 5% or more on the year before, worth ₹500 Cr or more, ₹10 Cr traded; most traded first.",
    conditions: [
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "revenue_growth", operator: "gte", value: "5" },
      { field: "market_cap", operator: "gte", value: "500" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
    featured: true,
  },
  {
    key: "growth-fair-price",
    label: "Growth at a fair price",
    category: "Fundamentals",
    description:
      "Revenue up 15% or more, profitable, at under 30 times earnings, worth ₹1,000 Cr or more.",
    conditions: [
      { field: "revenue_growth", operator: "gte", value: "15" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "pe", operator: "gt", value: "0" },
      { field: "pe", operator: "lt", value: "30" },
      { field: "market_cap", operator: "gte", value: "1000" },
    ],
    sort: "revenue_growth",
  },
  {
    key: "value",
    label: "Value",
    category: "Fundamentals",
    description:
      "Profitable and still growing, at under 15 times earnings and 3 times book, worth ₹500 Cr or more.",
    conditions: [
      { field: "pe", operator: "gt", value: "0" },
      { field: "pe", operator: "lt", value: "15" },
      { field: "pb", operator: "lt", value: "3" },
      { field: "revenue_growth", operator: "gt", value: "0" },
      { field: "market_cap", operator: "gte", value: "500" },
    ],
    sort: "market_cap",
  },
  {
    key: "dividend",
    label: "Dividend payers",
    category: "Fundamentals",
    description:
      "A trailing dividend yield of 2% or more from a profitable company worth ₹1,000 Cr or more.",
    conditions: [
      { field: "dividend_yield", operator: "gte", value: "2" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "market_cap", operator: "gte", value: "1000" },
    ],
    sort: "dividend_yield",
  },
  {
    key: "large-caps",
    label: "Large caps",
    category: "Size",
    description: "The hundred largest companies by market capitalisation.",
    conditions: [{ field: "size_rank", operator: "lte", value: "100" }],
    sort: "market_cap",
  },
  {
    key: "mid-caps",
    label: "Mid caps",
    category: "Size",
    description: "Ranked 101st to 250th by market capitalisation.",
    conditions: [
      { field: "size_rank", operator: "gte", value: "101" },
      { field: "size_rank", operator: "lte", value: "250" },
    ],
    sort: "market_cap",
  },
  {
    key: "small-caps",
    label: "Small caps",
    category: "Size",
    description: "Ranked 251st to 500th by market capitalisation.",
    conditions: [
      { field: "size_rank", operator: "gte", value: "251" },
      { field: "size_rank", operator: "lte", value: "500" },
    ],
    sort: "market_cap",
  },
  {
    key: "momentum-swing",
    label: "Momentum with a tight stop",
    category: "Momentum",
    description:
      "Above its 20, 50 and 200-day averages but within 5% of the 20-day, RSI over 50, higher highs and lows with the 10-day swing low within 7%, at least usual volume, profitable, worth ₹100 Cr or more, ₹50 Cr traded; most traded first.",
    conditions: [
      { field: "from_sma_20_percent", operator: "gt", value: "0" },
      { field: "from_sma_20_percent", operator: "lte", value: "5" },
      { field: "from_sma_50_percent", operator: "gt", value: "0" },
      { field: "from_sma_200_percent", operator: "gt", value: "0" },
      { field: "rsi", operator: "gt", value: "50" },
      { field: "rising_swings", operator: "eq", value: "1" },
      { field: "from_swing_low_percent", operator: "lte", value: "7" },
      { field: "relative_volume", operator: "gte", value: "1" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "market_cap", operator: "gte", value: "100" },
      { field: "traded_value", operator: "gte", value: "50" },
    ],
    sort: "traded_value",
    featured: true,
  },
  {
    key: "strong-momentum",
    label: "Strong momentum",
    category: "Momentum",
    description:
      "A momentum score of 80 or more, profitable, ₹10 Cr traded: among the market's strongest over one, three and six months.",
    conditions: [
      { field: "momentum_score", operator: "gte", value: "80" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "momentum_score",
  },
  {
    key: "oversold-uptrend",
    label: "Oversold in an uptrend",
    category: "Momentum",
    description:
      "RSI under 35 while still above the 200-day average, ₹10 Cr traded: a pullback, not a collapse.",
    conditions: [
      { field: "rsi", operator: "lt", value: "35" },
      { field: "from_sma_200_percent", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
    featured: true,
  },
  {
    key: "overbought",
    label: "Overbought",
    category: "Momentum",
    description: "RSI over 70 with ₹10 Cr traded: stretched, worth watching for a pause.",
    conditions: [
      { field: "rsi", operator: "gt", value: "70" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "macd-turn",
    label: "MACD turning up in a trend",
    category: "Momentum",
    description: "A positive MACD histogram above the 50-day average, ₹10 Cr traded.",
    conditions: [
      { field: "macd_histogram", operator: "gt", value: "0" },
      { field: "from_sma_50_percent", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "aligned-uptrend",
    label: "Above every average",
    category: "Trend",
    description: "Above its 20, 50 and 200-day averages and up over the month, ₹10 Cr traded.",
    conditions: [
      { field: "from_sma_20_percent", operator: "gt", value: "0" },
      { field: "from_sma_50_percent", operator: "gt", value: "0" },
      { field: "from_sma_200_percent", operator: "gt", value: "0" },
      { field: "one_month", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "pullback-20",
    label: "Pullback to the 20-day",
    category: "Trend",
    description:
      "Within 2% of its 20-day average while above the 50 and 200-day, ₹10 Cr traded: an uptrend resting.",
    conditions: [
      { field: "from_sma_20_percent", operator: "gte", value: "-2" },
      { field: "from_sma_20_percent", operator: "lte", value: "2" },
      { field: "from_sma_50_percent", operator: "gt", value: "0" },
      { field: "from_sma_200_percent", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "long-uptrend",
    label: "A year above the 200-day",
    category: "Trend",
    description: "Above its 200-day average for 250 sessions running, profitable, ₹10 Cr traded.",
    conditions: [
      { field: "sessions_above_sma_200", operator: "gte", value: "250" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "below-averages",
    label: "Below every average",
    category: "Trend",
    description: "Under its 20, 50 and 200-day averages with ₹10 Cr traded: in a downtrend.",
    conditions: [
      { field: "from_sma_20_percent", operator: "lt", value: "0" },
      { field: "from_sma_50_percent", operator: "lt", value: "0" },
      { field: "from_sma_200_percent", operator: "lt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "breakout",
    label: "52-week breakout",
    category: "Price",
    description:
      "Closed up at a 52-week high (within 0.5%) on 1.5 times its usual volume, ₹10 Cr traded.",
    conditions: [
      { field: "from_high_percent", operator: "gte", value: "-0.5" },
      { field: "change_percent", operator: "gt", value: "0" },
      { field: "relative_volume", operator: "gte", value: "1.5" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "high",
    label: "Leaders near their highs",
    category: "Price",
    description: "Within 5% of the year's high, above the 200-day, profitable, ₹10 Cr traded.",
    conditions: [
      { field: "from_high_percent", operator: "gte", value: "-5" },
      { field: "from_sma_200_percent", operator: "gt", value: "0" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
    featured: true,
  },
  {
    key: "low",
    label: "Quality near its lows",
    category: "Price",
    description:
      "Within 5% of the year's low while profitable and worth ₹1,000 Cr or more, ₹10 Cr traded.",
    conditions: [
      { field: "from_low_percent", operator: "lte", value: "5" },
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "market_cap", operator: "gte", value: "1000" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "market_cap",
  },
  {
    key: "rising-streak",
    label: "Five rises in a row",
    category: "Price",
    description: "Closed higher five sessions running or more, RSI still under 75, ₹10 Cr traded.",
    conditions: [
      { field: "consecutive_rises", operator: "gte", value: "5" },
      { field: "rsi", operator: "lt", value: "75" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "falling-streak",
    label: "Five falls in a row",
    category: "Price",
    description: "Closed lower five sessions running or more, ₹10 Cr traded.",
    conditions: [
      { field: "consecutive_falls", operator: "gte", value: "5" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "traded_value",
  },
  {
    key: "volume",
    label: "Buying on unusual volume",
    category: "Volume",
    description: "Up on the day on twice its usual volume, ₹5 Cr traded.",
    conditions: [
      { field: "relative_volume", operator: "gte", value: "2" },
      { field: "change_percent", operator: "gt", value: "0" },
      { field: "traded_value", operator: "gte", value: "5" },
    ],
    sort: "relative_volume",
    featured: true,
  },
  {
    key: "volume-shocker",
    label: "Volume shocker",
    category: "Volume",
    description: "Three times its usual volume or more, either way, ₹10 Cr traded.",
    conditions: [
      { field: "relative_volume", operator: "gte", value: "3" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "relative_volume",
  },
  {
    key: "heavily-traded",
    label: "Heavily traded",
    category: "Volume",
    description: "₹100 Cr or more changed hands in the session; most traded first.",
    conditions: [{ field: "traded_value", operator: "gte", value: "100" }],
    sort: "traded_value",
  },
  {
    key: "gap-up",
    label: "Gap up on volume",
    category: "Volatility",
    description:
      "Opened 2% or more above the previous close on 1.5 times usual volume, ₹5 Cr traded.",
    conditions: [
      { field: "gap_percent", operator: "gte", value: "2" },
      { field: "relative_volume", operator: "gte", value: "1.5" },
      { field: "traded_value", operator: "gte", value: "5" },
    ],
    sort: "gap_percent",
  },
  {
    key: "gap-down",
    label: "Gap down on volume",
    category: "Volatility",
    description:
      "Opened 2% or more below the previous close on 1.5 times usual volume, ₹5 Cr traded.",
    conditions: [
      { field: "gap_percent", operator: "lte", value: "-2" },
      { field: "relative_volume", operator: "gte", value: "1.5" },
      { field: "traded_value", operator: "gte", value: "5" },
    ],
    sort: "traded_value",
  },
  {
    key: "wide-range",
    label: "Wide day",
    category: "Volatility",
    description: "A day's range of 5% or more of the price, ₹10 Cr traded.",
    conditions: [
      { field: "range_percent", operator: "gte", value: "5" },
      { field: "traded_value", operator: "gte", value: "10" },
    ],
    sort: "range_percent",
  },
];

/**
 * Whether a scan stands behind a strategy.
 *
 * @param scan - The scan.
 * @returns True when it carries one.
 */
export function isStrategyScan(scan: Scan): scan is StrategyScan {
  return scan.strategy !== undefined;
}

/** The scans behind a strategy, in the order the page shows them. */
export const STRATEGY_SCANS: readonly StrategyScan[] = SCANS.filter(isStrategyScan);

/**
 * Find a scan by its key, as the screener's address names it.
 *
 * @param key - The key, or null when the address names none.
 * @returns The scan, or undefined for no key or one no scan has.
 */
export function findScan(key: string | null): Scan | undefined {
  return key === null ? undefined : SCANS.find((scan) => scan.key === key);
}

/**
 * Write a scan into a screener address: its conditions in place of any
 * there, its order when it has one, and its key. A strategy's scan also
 * takes the address back to the whole market.
 *
 * The one place a scan becomes an address, so a link from the scans page,
 * a chip on the screener and restoring a strategy's screen all arrive at
 * the same screen. Anything else in the address -- the population for a
 * plain scan, and the order of a scan without one -- is left as it was.
 *
 * @param query - The address's parameters, changed in place.
 * @param scan - The scan.
 */
export function writeScan(query: URLSearchParams, scan: Scan): void {
  // A strategy was tested over the whole market, so one index's rows are
  // not its candidates; a plain scan is worth asking of one index or
  // sector, and keeps whichever the page had.
  if (isStrategyScan(scan)) {
    query.delete("scope_kind");
    query.delete("scope_key");
  }
  query.delete("where");
  for (const one of scan.conditions) {
    query.append("where", `${one.field}:${one.operator}:${one.value}`);
  }
  if (scan.sort !== undefined) {
    query.set("sort", scan.sort);
    query.set("order", "desc");
  }
  query.set("scan", scan.key);
}

/**
 * Where the screener runs a scan.
 *
 * @param scan - The scan.
 * @returns The screener's address with the scan's conditions, order and key.
 */
export function scanPath(scan: Scan): string {
  const parameters = new URLSearchParams();
  writeScan(parameters, scan);
  return `${PATHS.screen}?${parameters.toString()}`;
}

/** A screen as the screener's address holds it. */
export interface Screen {
  /** The conditions that are sent: every one with a number to compare with. */
  conditions: ScreenCondition[];
  sort: string | null;
  order: "asc" | "desc";
  scopeKind: ScopeKind;
}

/**
 * Whether a screen still asks exactly what a scan asks.
 *
 * Conditions are compared as a set, and their values as numbers, so `10`
 * and `10.0` are the same question. A scan runs over the whole market, so
 * a screen narrowed to one index or sector asks something else.
 *
 * @param screen - The screen as it stands.
 * @param scan - The scan it may have come from.
 * @returns True when nothing has been changed that alters the rows or their order.
 */
export function screenMatchesScan(screen: Screen, scan: Scan): boolean {
  const asked = (conditions: ScreenCondition[]): string =>
    conditions
      .map((one) => `${one.field}:${one.operator}:${String(Number(one.value))}`)
      .sort()
      .join("&");
  const sameOrder =
    scan.sort === undefined || (screen.sort === scan.sort && screen.order === "desc");
  return (
    screen.scopeKind === "companies" &&
    sameOrder &&
    asked(screen.conditions) === asked(scan.conditions)
  );
}

/**
 * The screener figure for one session's delivery. The platform keeps it in
 * the company snapshot, dated apart from the day's figures.
 */
const SESSION_DELIVERY = "delivery_percent";

/** A row whose delivery figure describes a different session from its other figures. */
export interface OffSessionDelivery {
  symbol: string;
  /** The session its other figures describe. */
  session: string;
  /** The session its delivery figure describes. */
  deliveredOn: string;
}

/**
 * The rows a scan tested on another session's delivery.
 *
 * The platform adds a session's delivery late in the evening, hours after
 * that session's figures, and does not wait for a late file; a company
 * with no delivery published for a session keeps an earlier one for up to
 * five sessions, after which its figure is blank (and fails any condition
 * on it) while `delivery_as_of` still names that earlier session. Until
 * the two meet, a condition on the day's delivery is tested against
 * another session's, and a rule that needs the volume, the rise and the
 * delivery on one session is not met by that row.
 *
 * @param scan - The scan the rows answer.
 * @param hits - The rows.
 * @returns The rows affected, in the order given; none for a scan that asks
 *   nothing of the session's delivery, and none for a row with no delivery
 *   reading at all.
 */
export function deliveryFromAnotherSession(
  scan: Scan,
  hits: readonly ScreenHit[],
): OffSessionDelivery[] {
  if (!scan.conditions.some((one) => one.field === SESSION_DELIVERY)) {
    return [];
  }
  return hits.flatMap((hit) => {
    const deliveredOn = hit.snapshot?.delivery_as_of ?? null;
    return deliveredOn === null || deliveredOn === hit.figures.as_of
      ? []
      : [{ symbol: hit.symbol, session: hit.figures.as_of, deliveredOn }];
  });
}
