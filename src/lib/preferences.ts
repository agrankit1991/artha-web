/**
 * What the reader has chosen once and should not have to choose again.
 *
 * The population the overview opens on, the shape a price chart is drawn
 * in and what is laid over it, and how far back a chart reaches. Kept in
 * the browser, like the theme, because they are about this reader at this
 * screen; read on every page that has a default and written wherever the
 * reader changes one, so a choice made on one page is the default on the
 * next visit to any.
 *
 * Storage may refuse -- a private window, a locked-down browser -- and
 * then the preferences are simply forgotten between visits, which is a
 * convenience lost rather than a fault. Anything stored that is not a
 * preference this version knows is ignored, so an old browser never
 * breaks a new page.
 */

import { useSyncExternalStore } from "react";

import type { ChartStyle, Overlay } from "@/components/ChartControls";
import type { ScopeKind } from "@/api/client";

/** The reader's standing choices. */
/** The layouts a list page can be shown in: one table, a table per category, or cards. */
export type ViewMode = "list" | "grouped" | "cards";

/** Every layout, in the order a page offers them. */
export const VIEW_MODES: readonly ViewMode[] = ["list", "grouped", "cards"];

export interface Preferences {
  /** The population the overview opens on. */
  scope: { kind: ScopeKind; key: string | null };
  /** How a price chart is drawn. */
  chartStyle: ChartStyle;
  /** What is laid over the price. */
  overlays: Overlay[];
  /** How many sessions a chart reaches back by default. */
  range: number;
  /** The layout each list page was last left in, by page. */
  views: Partial<Record<string, ViewMode>>;
}

export const DEFAULT_PREFERENCES: Preferences = {
  scope: { kind: "companies", key: null },
  chartStyle: "line",
  overlays: ["sma_20", "sma_50", "sma_200", "volume"],
  range: 250,
  views: {},
};

const STORAGE_KEY = "artha.preferences";

const SCOPE_KINDS: readonly ScopeKind[] = ["companies", "indices", "sector", "index"];
const STYLES: readonly ChartStyle[] = ["line", "candles", "area"];
const OVERLAYS: readonly Overlay[] = ["sma_20", "sma_50", "sma_200", "volume", "rsi"];
const RANGES: readonly number[] = [21, 65, 125, 250, 1250, 12500];

const listeners = new Set<() => void>();
let current: Preferences | null = null;

/**
 * Read the preferences, from storage the first time.
 *
 * @returns The preferences, defaults filling anything unstored or unknown.
 */
export function readPreferences(): Preferences {
  if (current === null) {
    current = parse(load());
  }
  return current;
}

/**
 * Change some preferences and remember them.
 *
 * @param patch - The preferences to change; the rest stay.
 */
export function writePreferences(patch: Partial<Preferences>): void {
  current = { ...readPreferences(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage refused; the choice holds for this visit and is forgotten after.
  }
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Forget every preference.
 */
export function resetPreferences(): void {
  writePreferences(DEFAULT_PREFERENCES);
}

/**
 * The preferences, re-rendering whoever reads them when they change.
 *
 * @returns The preferences.
 */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, readPreferences, () => DEFAULT_PREFERENCES);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** What storage holds, or nothing when it refuses or holds nothing. */
function load(): unknown {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

/**
 * Keep only what this version understands.
 *
 * @param stored - Whatever storage held.
 * @returns Preferences, each field the stored one when it is a value this
 *   version knows and the default otherwise.
 */
export function parse(stored: unknown): Preferences {
  const record =
    typeof stored === "object" && stored !== null ? (stored as Record<string, unknown>) : {};
  const scope = record["scope"];
  const kind =
    typeof scope === "object" && scope !== null
      ? (scope as Record<string, unknown>)["kind"]
      : undefined;
  const key =
    typeof scope === "object" && scope !== null
      ? (scope as Record<string, unknown>)["key"]
      : undefined;
  const chartStyle = record["chartStyle"];
  const overlays = record["overlays"];
  const range = record["range"];
  const views = record["views"];
  return {
    scope:
      typeof kind === "string" && (SCOPE_KINDS as readonly string[]).includes(kind)
        ? { kind: kind as ScopeKind, key: typeof key === "string" ? key : null }
        : DEFAULT_PREFERENCES.scope,
    chartStyle:
      typeof chartStyle === "string" && (STYLES as readonly string[]).includes(chartStyle)
        ? (chartStyle as ChartStyle)
        : DEFAULT_PREFERENCES.chartStyle,
    overlays: Array.isArray(overlays)
      ? overlays.filter(
          (one): one is Overlay =>
            typeof one === "string" && (OVERLAYS as readonly string[]).includes(one),
        )
      : DEFAULT_PREFERENCES.overlays,
    range: typeof range === "number" && RANGES.includes(range) ? range : DEFAULT_PREFERENCES.range,
    // Only layouts that exist, so a choice from a later version -- or a
    // hand-edited one -- falls back to a list rather than to nothing.
    views:
      typeof views === "object" && views !== null
        ? Object.fromEntries(
            Object.entries(views as Record<string, unknown>).filter(
              (entry): entry is [string, ViewMode] =>
                typeof entry[1] === "string" &&
                (VIEW_MODES as readonly string[]).includes(entry[1]),
            ),
          )
        : DEFAULT_PREFERENCES.views,
  };
}

/** Only for tests: forget what was read, so the next read is from storage. */
export function forgetForTests(): void {
  current = null;
}
