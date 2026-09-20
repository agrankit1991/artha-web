/**
 * Turning breadth measures into something a reader can act on.
 *
 * Every figure here is meaningless cold. "+42" is a McClellan oscillator
 * reading that says the last month has been broader than the two before it;
 * "0.86" is an Arms index saying volume went into the risers. Neither
 * number carries that, so each one is paired with the sentence, and the
 * pairing is decided in one place rather than per screen.
 */

import type { BreadthRegime, BreadthResponse } from "@/api/client";
import { ABSENT, formatVolume, toNumber } from "@/lib/format";
import type { Tone } from "@/components/Statistic";

/** One measure, ready to show. */
export interface Reading {
  label: string;
  value: string;
  hint: string;
  tone: Tone;
}

/** Sessions of the advance-decline line compared, to call its direction. */
const TREND_WINDOW = 20;

/** Sessions the high-low index averages over, as the platform computes it. */
const HIGH_LOW_SESSIONS = 10;

/** Below this, a reading is better described by what it is under. */
const LOW_RANK = 10;

/** Zweig's thresholds: a rise from below the first to above the second. */
const THRUST_LOW = 0.4;
const THRUST_HIGH = 0.615;

/**
 * Say what a McClellan oscillator reading means.
 *
 * @param reading - The oscillator, or null when too few sessions exist.
 * @returns A short phrase.
 */
export function describeOscillator(reading: number | null): string {
  if (reading === null) {
    return "Needs 39 sessions";
  }
  if (reading > 100) {
    return "Broadening sharply";
  }
  if (reading > 0) {
    return "More stocks joining";
  }
  if (reading < -100) {
    return "Narrowing sharply";
  }
  return "Fewer stocks joining";
}

/**
 * Describe which way the advance-decline line has been going.
 *
 * Its level is arbitrary -- it depends on when counting started -- so the
 * only thing worth saying about it is its direction.
 *
 * @param breadth - The reading, with its run of sessions.
 * @returns The direction as a phrase, and whether it is good news.
 */
function trend(breadth: BreadthResponse): { hint: string; tone: Tone } {
  const line = breadth.sessions.map((session) => toNumber(session.advance_decline_line));
  const latest = line[line.length - 1] ?? null;
  const earlier = line[Math.max(0, line.length - 1 - TREND_WINDOW)] ?? null;
  if (latest === null || earlier === null || line.length < 2) {
    return { hint: "Not enough sessions", tone: "neutral" };
  }
  if (latest > earlier) {
    return { hint: `Rising over ${String(TREND_WINDOW)} sessions`, tone: "good" };
  }
  if (latest < earlier) {
    return { hint: `Falling over ${String(TREND_WINDOW)} sessions`, tone: "bad" };
  }
  return { hint: "Flat", tone: "neutral" };
}

/**
 * Format a measure, or say it is absent.
 *
 * @param value - The figure as the platform sent it.
 * @param render - How to render it once parsed.
 * @returns The rendered figure, or a dash.
 */
function reading(value: string | null, render: (parsed: number) => string): string {
  const parsed = toNumber(value);
  return parsed === null ? ABSENT : render(parsed);
}

/**
 * Build every headline measure, in the order a reader asks about them.
 *
 * @param breadth - The reading, or null while it is still arriving.
 * @returns The measures, each with a phrase saying what it means.
 */
export function readings(breadth: BreadthResponse | null): Reading[] {
  if (breadth === null) {
    return [];
  }
  const oscillator = toNumber(breadth.mcclellan_oscillator);
  const summation = toNumber(breadth.mcclellan_summation);
  const thrust = toNumber(breadth.breadth_thrust);
  const highLow = toNumber(breadth.high_low_index);
  const arms = toNumber(breadth.latest?.arms_index ?? null);
  const direction = trend(breadth);

  return [
    {
      label: "Advance–decline line",
      value: reading(breadth.advance_decline_line, (parsed) => formatVolume(parsed)),
      ...direction,
    },
    {
      label: "McClellan oscillator",
      value: reading(breadth.mcclellan_oscillator, (parsed) => parsed.toFixed(0)),
      hint: describeOscillator(oscillator),
      tone: oscillator === null ? "neutral" : oscillator > 0 ? "good" : "bad",
    },
    {
      label: "McClellan summation",
      value: reading(breadth.mcclellan_summation, (parsed) => parsed.toFixed(0)),
      hint:
        summation === null
          ? "Needs 39 sessions"
          : summation > 0
            ? "Participation broad overall"
            : "Participation narrow overall",
      tone: summation === null ? "neutral" : summation > 0 ? "good" : "bad",
    },
    {
      label: "Breadth thrust",
      value: reading(breadth.breadth_thrust, (parsed) => `${(parsed * 100).toFixed(1)}%`),
      hint:
        thrust === null
          ? "Needs 10 sessions"
          : thrust >= THRUST_HIGH
            ? "Above Zweig's 61.5% mark"
            : thrust <= THRUST_LOW
              ? "Washed out, below 40%"
              : "Between 40% and 61.5%",
      tone: thrust === null ? "neutral" : thrust >= THRUST_HIGH ? "good" : "neutral",
    },
    {
      label: "High–low index",
      value: reading(breadth.high_low_index, (parsed) => `${parsed.toFixed(0)}%`),
      hint:
        highLow === null
          ? // Absent for two different reasons, and saying the wrong one is
            // worse than saying nothing: a population where nothing reached
            // a yearly high or low has no ratio to average, however long it
            // has been counted. The indices, counted against each other,
            // are exactly that population.
            breadth.sessions.length < HIGH_LOW_SESSIONS
            ? `Needs ${String(HIGH_LOW_SESSIONS)} sessions`
            : "No new highs or lows"
          : highLow > 50
            ? "More new highs than lows"
            : "More new lows than highs",
      tone: highLow === null ? "neutral" : highLow > 50 ? "good" : "bad",
    },
    {
      label: "Arms index (TRIN)",
      value: reading(breadth.latest?.arms_index ?? null, (parsed) => parsed.toFixed(2)),
      hint:
        arms === null
          ? "No volume counted"
          : arms < 1
            ? "Volume favouring the risers"
            : "Volume favouring the fallers",
      // Deliberately inverted: a low Arms index is the healthy reading,
      // because it means volume went where the prices went.
      tone: arms === null ? "neutral" : arms < 1 ? "good" : "bad",
    },
  ];
}

/** What a regime is called, and what the band actually means. */
export interface RegimeReading {
  label: string;
  hint: string;
  tone: Tone;
}

const REGIMES: Record<BreadthRegime, RegimeReading> = {
  "deep-risk-off": {
    label: "Deep risk-off",
    hint: "Under a fifth are above their 200-day. Broad downtrend.",
    tone: "bad",
  },
  "risk-off": {
    label: "Risk-off",
    hint: "Most are below their 200-day. Defensive conditions.",
    tone: "bad",
  },
  mixed: {
    label: "Mixed",
    hint: "A two-sided market, with no strong direction either way.",
    tone: "neutral",
  },
  "risk-on": {
    label: "Risk-on",
    hint: "Most are above their 200-day. Broad uptrend.",
    tone: "good",
  },
  "over-extended": {
    label: "Over-extended",
    hint: "Nearly all are above their 200-day — historically where money rotates out of risk.",
    tone: "warn",
  },
};

/**
 * Say what a regime means, in words a reader can act on.
 *
 * @param regime - The band, or null when nothing has been counted.
 * @returns The reading, or null.
 */
export function describeRegime(regime: BreadthRegime | null | undefined): RegimeReading | null {
  return regime === null || regime === undefined ? null : REGIMES[regime];
}

/**
 * Say what a percentile rank means, since the number alone does not.
 *
 * @param rank - The rank, as a percentage.
 * @returns A short phrase placing the reading in its own history.
 */
export function describeRank(rank: number | null): string {
  if (rank === null) {
    return "No history to rank against";
  }
  // Phrased as a comparison rather than an ordinal: "71st percentile"
  // needs suffix rules that read badly when generated, and "higher than
  // 71% of its own history" is the same fact in plainer words.
  return rank <= LOW_RANK
    ? `Lower than ${(100 - rank).toFixed(0)}% of its own history`
    : `Higher than ${rank.toFixed(0)}% of its own history`;
}
