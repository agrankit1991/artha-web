/**
 * The market's phases, their signals and the strategies' categories, in words.
 *
 * The platform names each session's phase by rule (its
 * `artha.backtest.market_phases`, where the rules are written once) and
 * reads a checklist of signals off the same measures; this says them. The
 * one-line descriptions are the owner's chosen wording (2026-10-16); the
 * exact rule, in words generated from the rule itself, comes with the
 * reading, so a page can show it beside the summary.
 *
 * A strategy's style is the platform's too, read from how it ranks; its
 * risk is banded here, from its deepest fall.
 */

import type { MarketPhase, PhaseSignal, SignalKey, StrategyStyle, Verdict } from "@/api/client";
import { formatPercentTenths } from "@/lib/format";

/** One phase as a reader meets it. */
export interface PhaseWords {
  key: MarketPhase;
  label: string;
  /** What it means, in a line. */
  summary: string;
}

/** The five phases in the order a market moves through them. */
export const PHASES: readonly PhaseWords[] = [
  {
    key: "broad_rise",
    label: "Broad rise",
    summary:
      "The Nifty 50 is above its 200-day average, with 60% or more of large companies above theirs.",
  },
  {
    key: "narrowing",
    label: "Narrowing",
    summary:
      "Still above its 200-day average, but fewer large companies are joining: breadth is 5 points or more lower than a month ago.",
  },
  {
    key: "falling",
    label: "Falling",
    summary:
      "The Nifty 50 is at or below its 200-day average, and breadth is lower than a month ago.",
  },
  {
    key: "bottoming",
    label: "Bottoming",
    summary:
      "Still at or below its 200-day average, but breadth has turned up 5 points or more from a low under 40% this month.",
  },
  {
    key: "recovering",
    label: "Recovering",
    summary:
      "Back above its 200-day average within the last three months, with breadth higher than a month ago.",
  },
];

/** What a session that fits none of the five is called. */
export const NO_PHASE = "Between phases";

/**
 * A phase's words.
 *
 * @param phase - The phase, or null for a session fitting none.
 * @returns Its label.
 */
export function phaseLabel(phase: MarketPhase | null): string {
  return PHASES.find((one) => one.key === phase)?.label ?? NO_PHASE;
}

/** The horizons a start is followed over, in months. */
export const HORIZON_MONTHS = [3, 6, 12] as const;

/** One checklist signal as a reader meets it. */
interface SignalWords {
  label: string;
  /** What is measured and why it matters, in a line. */
  meaning: string;
  /**
   * The figure and what it is read against, in words.
   *
   * @param signal - The signal.
   * @param flowSessions - How many sessions the flows signal adds up.
   */
  reads: (signal: PhaseSignal, flowSessions: number) => string;
}

function share(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(0)}%`;
}

/**
 * A share and how far it moved over a span: "41%, -8 points in a month".
 *
 * @param value - The share now, percent.
 * @param earlier - The share at the span's start; null leaves the move out.
 * @param span - The span in words.
 * @returns The words; a dash without a share.
 */
function turn(value: number | null, earlier: number | null, span: string): string {
  if (value === null) {
    return "-";
  }
  if (earlier === null) {
    return share(value);
  }
  const change = value - earlier;
  return `${share(value)}, ${change >= 0 ? "+" : ""}${change.toFixed(0)} points in ${span}`;
}

/** Each signal of the checklist. */
export const SIGNALS: Record<SignalKey, SignalWords> = {
  trend: {
    label: "Nifty 50 trend",
    meaning: "Where the index stands against its 200-day average: the long trend.",
    reads: ({ value, reference }) =>
      value === null || reference === null
        ? "-"
        : `${formatPercentTenths(String((value / reference - 1) * 100))} from its 200-day average`,
  },
  breadth: {
    label: "Breadth, 200-day",
    meaning: "How many large companies are above their own 200-day average, against a month ago.",
    reads: ({ value, reference }) => turn(value, reference, "a month"),
  },
  short_breadth: {
    label: "Breadth, 50-day",
    meaning: "The same over 50 days, against two weeks ago: the first to turn at a bottom.",
    reads: ({ value, reference }) => turn(value, reference, "two weeks"),
  },
  highs_lows: {
    label: "New highs and lows",
    meaning: "Large companies closing at a 52-week high, against those at a 52-week low.",
    reads: ({ value, reference }) =>
      value === null ? "-" : `${share(value)} at highs, ${share(reference)} at lows`,
  },
  vix: {
    label: "India VIX",
    meaning: "Expected volatility against its 50-day average: fear rising reads down.",
    reads: ({ value, reference }) =>
      value === null || reference === null
        ? "-"
        : `${value.toFixed(1)} against ${reference.toFixed(1)}`,
  },
  flows: {
    label: "Foreign institutions",
    meaning: "What they bought less what they sold in cash: their money arriving or leaving.",
    reads: ({ value }, flowSessions) =>
      value === null
        ? "Not held"
        : `${value >= 0 ? "+" : "-"}Rs ${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })} crore over ${String(flowSessions)} sessions`,
  },
};

/** A verdict in words. */
export const VERDICTS: Record<Verdict, string> = {
  up: "Up",
  neutral: "Neutral",
  down: "Down",
};

/** The verdicts in the order a reader chooses among them. */
export const VERDICT_ORDER: readonly Verdict[] = ["up", "neutral", "down"];

/** A strategy's style in words. */
export const STYLES: Record<StrategyStyle, string> = {
  momentum: "Momentum",
  rebound: "Rebound",
  pullback: "Pullback",
  low_volatility: "Low volatility",
  model: "Model",
  combination: "Combination",
  other: "Other",
};

/** How deep a strategy's worst fall went, in bands. */
export type RiskBand = "milder" | "middle" | "deeper";

/** Each band's words and where it ends, as a fall in percent. */
export const RISK_BANDS: readonly { key: RiskBand; label: string; within: number }[] = [
  { key: "milder", label: "Fall under 25%", within: 25 },
  { key: "middle", label: "Fall 25-35%", within: 35 },
  { key: "deeper", label: "Fall over 35%", within: Number.POSITIVE_INFINITY },
];

/**
 * The band a strategy's deepest fall puts it in.
 *
 * @param maxDrawdown - Its deepest fall over its backtest, percent (negative or positive).
 * @returns The band, or null before a backtest.
 */
export function riskBand(maxDrawdown: number | null | undefined): RiskBand | null {
  if (maxDrawdown === null || maxDrawdown === undefined) {
    return null;
  }
  const fall = Math.abs(maxDrawdown);
  return (
    (RISK_BANDS.find((band) => fall < band.within) ?? RISK_BANDS[RISK_BANDS.length - 1])?.key ??
    null
  );
}

/**
 * A band's words.
 *
 * @param band - The band, or null.
 * @returns Its label, or a dash.
 */
export function riskLabel(band: RiskBand | null): string {
  return RISK_BANDS.find((one) => one.key === band)?.label ?? "-";
}
