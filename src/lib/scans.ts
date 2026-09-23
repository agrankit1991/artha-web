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
export type ScanCategory = "Price" | "Trend" | "Momentum" | "Volume" | "Volatility";

export const SCAN_CATEGORIES: readonly ScanCategory[] = [
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
  /** Offered as a chip on the screener. */
  featured?: boolean;
}

export const SCANS: readonly Scan[] = [
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
  return `${PATHS.screen}?${parameters.toString()}`;
}
