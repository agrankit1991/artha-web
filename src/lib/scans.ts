/**
 * Named scans: the questions asked of the market often enough to name.
 *
 * StockEdge's scans, as saved screener conditions. A scan is only a set of
 * conditions the screener already understands, so there is one screening
 * rule-set in the application, not two: the scans page runs each through
 * the screener for its count and opens the screener on it, and the
 * screener offers the featured ones as one-click chips.
 */

import type { ScreenCondition } from "@/api/client";
import { PATHS } from "@/lib/paths";

/** How the scans are grouped, in the order the page shows them. */
export type ScanCategory =
  "Fundamentals" | "Size" | "Price" | "Trend" | "Momentum" | "Volume" | "Volatility";

export const SCAN_CATEGORIES: readonly ScanCategory[] = [
  "Fundamentals",
  "Size",
  "Price",
  "Trend",
  "Momentum",
  "Volume",
  "Volatility",
];

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
}

export const SCANS: readonly Scan[] = [
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
 * Where the screener runs a scan.
 *
 * @param scan - The scan.
 * @returns The screener's address with the scan's conditions.
 */
export function scanPath(scan: Scan): string {
  const parameters = new URLSearchParams();
  for (const one of scan.conditions) {
    parameters.append("where", `${one.field}:${one.operator}:${one.value}`);
  }
  if (scan.sort !== undefined) {
    parameters.set("sort", scan.sort);
    parameters.set("order", "desc");
  }
  return `${PATHS.screen}?${parameters.toString()}`;
}
