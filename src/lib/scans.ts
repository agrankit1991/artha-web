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
    key: "profitable",
    label: "Profitable",
    category: "Fundamentals",
    description: "Made a profit over the last four quarters.",
    conditions: [{ field: "profit_ttm", operator: "gt", value: "0" }],
  },
  {
    key: "profitable-growing",
    label: "Profitable and growing",
    category: "Fundamentals",
    description:
      "Profitable over the last four quarters, with revenue up 5% or more on the year before; most traded first.",
    conditions: [
      { field: "profit_ttm", operator: "gt", value: "0" },
      { field: "revenue_growth", operator: "gte", value: "5" },
    ],
    sort: "traded_value",
    featured: true,
  },
  {
    key: "value",
    label: "Value",
    category: "Fundamentals",
    description: "Profitable at a price under fifteen times its earnings.",
    conditions: [
      { field: "pe", operator: "gt", value: "0" },
      { field: "pe", operator: "lt", value: "15" },
    ],
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
    key: "high",
    label: "Near 52-week high",
    category: "Price",
    description: "Within 5% of the year's highest close.",
    conditions: [{ field: "from_high_percent", operator: "gte", value: "-5" }],
    featured: true,
  },
  {
    key: "breakout",
    label: "At a 52-week high",
    category: "Price",
    description: "Closed within half a per cent of the year's highest close.",
    conditions: [{ field: "from_high_percent", operator: "gte", value: "-0.5" }],
  },
  {
    key: "low",
    label: "Near 52-week low",
    category: "Price",
    description: "Within 5% of the year's lowest close.",
    conditions: [{ field: "from_low_percent", operator: "lte", value: "5" }],
    featured: true,
  },
  {
    key: "rising-streak",
    label: "Five rises in a row",
    category: "Price",
    description: "Closed higher five sessions running, or more.",
    conditions: [{ field: "consecutive_rises", operator: "gte", value: "5" }],
  },
  {
    key: "falling-streak",
    label: "Five falls in a row",
    category: "Price",
    description: "Closed lower five sessions running, or more.",
    conditions: [{ field: "consecutive_falls", operator: "gte", value: "5" }],
  },
  {
    key: "rising",
    label: "Above 200-day and rising",
    category: "Trend",
    description: "Above both long averages and up over the month.",
    conditions: [
      { field: "from_sma_200_percent", operator: "gt", value: "0" },
      { field: "from_sma_50_percent", operator: "gt", value: "0" },
      { field: "one_month", operator: "gt", value: "0" },
    ],
    featured: true,
  },
  {
    key: "above-20-day",
    label: "Above the 20-day average",
    category: "Trend",
    description: "Closed above its twenty-session average.",
    conditions: [{ field: "from_sma_20_percent", operator: "gt", value: "0" }],
  },
  {
    key: "long-uptrend",
    label: "A year above the 200-day",
    category: "Trend",
    description: "Above its 200-day average for at least 250 sessions running.",
    conditions: [{ field: "sessions_above_sma_200", operator: "gte", value: "250" }],
  },
  {
    key: "below-averages",
    label: "Below both averages",
    category: "Trend",
    description: "Under its 50-day and its 200-day average.",
    conditions: [
      { field: "from_sma_50_percent", operator: "lt", value: "0" },
      { field: "from_sma_200_percent", operator: "lt", value: "0" },
    ],
  },
  {
    key: "oversold",
    label: "Oversold",
    category: "Momentum",
    description: "RSI (14) under 30.",
    conditions: [{ field: "rsi", operator: "lt", value: "30" }],
    featured: true,
  },
  {
    key: "overbought",
    label: "Overbought",
    category: "Momentum",
    description: "RSI (14) over 70.",
    conditions: [{ field: "rsi", operator: "gt", value: "70" }],
    featured: true,
  },
  {
    key: "strong-momentum",
    label: "Strong momentum",
    category: "Momentum",
    description:
      "A momentum score of 80 or more: among the market's strongest over one, three and six months.",
    conditions: [{ field: "momentum_score", operator: "gte", value: "80" }],
    sort: "momentum_score",
  },
  {
    key: "macd-positive",
    label: "MACD above its signal",
    category: "Momentum",
    description: "A positive MACD histogram: momentum turning up.",
    conditions: [{ field: "macd_histogram", operator: "gt", value: "0" }],
  },
  {
    key: "volume",
    label: "Unusual volume",
    category: "Volume",
    description: "Traded over twice its usual volume.",
    conditions: [{ field: "relative_volume", operator: "gt", value: "2" }],
    featured: true,
  },
  {
    key: "volume-shocker",
    label: "Volume shocker",
    category: "Volume",
    description: "Traded three times its usual volume, or more.",
    conditions: [{ field: "relative_volume", operator: "gte", value: "3" }],
  },
  {
    key: "heavily-traded",
    label: "Heavily traded",
    category: "Volume",
    description: "A hundred crore or more changed hands in the session; most traded first.",
    conditions: [{ field: "traded_value", operator: "gte", value: "100" }],
    sort: "traded_value",
  },
  {
    key: "gap-up",
    label: "Gap up",
    category: "Volatility",
    description: "Opened 2% or more above the previous close.",
    conditions: [{ field: "gap_percent", operator: "gte", value: "2" }],
  },
  {
    key: "gap-down",
    label: "Gap down",
    category: "Volatility",
    description: "Opened 2% or more below the previous close.",
    conditions: [{ field: "gap_percent", operator: "lte", value: "-2" }],
  },
  {
    key: "wide-range",
    label: "Wide day",
    category: "Volatility",
    description: "A day's range of 5% or more of the price.",
    conditions: [{ field: "range_percent", operator: "gte", value: "5" }],
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
