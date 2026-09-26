/**
 * A kept backtest, read for a page: its growth as lines, its rules as words.
 *
 * The platform sends the equity at every close from one, and the
 * benchmark's close over its first; a chart of growth wants both as
 * percentages from the start. The rules arrive as the strategy was
 * written; a reader wants each setting named and the stop and target
 * said in words, with the settings left at their defaults left out.
 */

import type { BacktestEquityPoint } from "@/api/client";
import type { Point } from "@/components/Chart";

/** A backtest's growth and its benchmark's, in percent from the first close. */
export interface GrowthLines {
  playbook: Point[];
  benchmark: Point[];
}

/**
 * Turn the equity curve into growth lines.
 *
 * @param equity - The portfolio at every close.
 * @returns The playbook's growth, and the benchmark's where it has a close.
 */
export function growthLines(equity: readonly BacktestEquityPoint[]): GrowthLines {
  return {
    playbook: equity.map((point) => ({ time: point.session, value: (point.value - 1) * 100 })),
    benchmark: equity.flatMap((point) =>
      point.benchmark === null ? [] : [{ time: point.session, value: (point.benchmark - 1) * 100 }],
    ),
  };
}

/** One setting of a strategy, named, and whether it is an expression. */
export interface Rule {
  label: string;
  value: string;
  expression: boolean;
}

/** The settings shown, in the order a strategy is read, with their names. */
const SETTINGS: { key: string; label: string; expression: boolean; unless?: unknown }[] = [
  { key: "universe", label: "Universe", expression: true, unless: "1" },
  { key: "filter", label: "Filter", expression: true, unless: "1" },
  { key: "entry", label: "Entry", expression: true, unless: "1" },
  { key: "rank", label: "Ranking", expression: true },
  { key: "exit", label: "Exit", expression: true },
  { key: "regime", label: "Market regime", expression: true },
  { key: "exposure", label: "Exposure", expression: true },
  { key: "recover_cost", label: "Recover cost while", expression: true },
  { key: "idle_return", label: "Idle money earns", expression: true },
  { key: "slots", label: "Slots", expression: false },
  { key: "rebalance", label: "Rebalance", expression: false },
  { key: "rotate", label: "Rotate at a rebalance", expression: false, unless: true },
  { key: "stop", label: "Stop", expression: false },
  { key: "target", label: "Target", expression: false },
  { key: "hold_sessions", label: "Hold at most", expression: false },
  { key: "cost_percent", label: "Cost per side", expression: false },
];

/**
 * Name a strategy's settings, leaving out those at their defaults.
 *
 * @param rules - The strategy, as written.
 * @returns Each setting shown, in the order a strategy is read.
 */
export function readRules(rules: Readonly<Record<string, unknown>>): Rule[] {
  return SETTINGS.flatMap((setting) => {
    const value = rules[setting.key];
    if (value === null || value === undefined || value === setting.unless) {
      return [];
    }
    const said = say(setting.key, value);
    return said === null
      ? []
      : [{ label: setting.label, value: said, expression: setting.expression }];
  });
}

/**
 * Say one setting's value in words.
 *
 * @param key - The setting.
 * @param value - Its value, as written.
 * @returns The words, or null for a stop or target that is not set.
 */
function say(key: string, value: unknown): string | null {
  switch (key) {
    case "stop":
      return sayStop(value as Record<string, unknown>);
    case "target":
      return sayTarget(value as Record<string, unknown>);
    case "rebalance":
      return typeof value === "number" ? `every ${String(value)} sessions` : String(value);
    case "rotate":
      return "no: holdings stay until they leave by their own rules";
    case "hold_sessions":
      return `${String(value)} sessions`;
    case "cost_percent":
      return `${String(value)}%`;
    default:
      return String(value);
  }
}

/**
 * Say where a stop sits.
 *
 * @param stop - The stop, as written.
 * @returns The words, or null for none.
 */
function sayStop(stop: Readonly<Record<string, unknown>>): string | null {
  const value = String(stop.value);
  const trailing = stop.trailing === true ? ", trailing the highest close" : "";
  switch (stop.kind) {
    case "percent":
      return `${value}% below the entry${trailing}`;
    case "atr":
      return `${value} × the ${String(stop.period)}-session average true range${trailing}`;
    case "volatility":
      return `the low edge of a ${String(stop.horizon)}-session volatility band, z = ${value}${trailing}`;
    default:
      return null;
  }
}

/**
 * Say where a target sits, and which holdings run past it.
 *
 * @param target - The target, as written.
 * @returns The words, or null for none.
 */
function sayTarget(target: Readonly<Record<string, unknown>>): string | null {
  const value = String(target.value);
  let place: string;
  if (target.kind === "percent") {
    place = `${value}% above the entry`;
  } else if (target.kind === "reward") {
    place = `${value} × the risk to the stop (1:${value})`;
  } else {
    return null;
  }
  const portion = typeof target.portion === "number" && target.portion < 1 ? target.portion : 1;
  const sells = portion < 1 ? `; sells ${String(Math.round(portion * 100))}% there` : "";
  const runner =
    typeof target.runner === "string" ? `; runs on past it while ${target.runner}` : "";
  return `${place}${sells}${runner}`;
}
