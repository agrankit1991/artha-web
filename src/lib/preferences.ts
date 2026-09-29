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

import { DEFAULT_RANGE, rangeFrom } from "@/lib/priceRanges";
import { useSyncExternalStore } from "react";

import type { ChartStyle, Overlay } from "@/components/ChartControls";
import type { Scope } from "@/components/ScopeSelector";
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
  /** Whether a price chart draws the forecast band past its last session. */
  forecast: boolean;
  /** How many sessions a chart reaches back by default. */
  range: number;
  /** The layout each list page was last left in, by page. */
  views: Partial<Record<string, ViewMode>>;
  /**
   * The populations the participation heatmap lays side by side, in order;
   * null until the reader changes them, meaning the headline indices the
   * platform counts -- so a reset follows the platform rather than a list
   * stored on the day of the change.
   */
  participation: Scope[] | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  scope: { kind: "companies", key: null },
  chartStyle: "line",
  overlays: ["sma_20", "sma_50", "sma_200", "volume"],
  // Shown unless turned off: preferences stored before the band existed
  // carry no choice, and should not hide it.
  forecast: true,
  range: DEFAULT_RANGE,
  views: {},
  participation: null,
};

const STORAGE_KEY = "artha.preferences";

const SCOPE_KINDS: readonly ScopeKind[] = ["companies", "indices", "sector", "index"];
const KEYED_KINDS: readonly ScopeKind[] = ["sector", "index"];
const STYLES: readonly ChartStyle[] = ["line", "candles", "area"];
const OVERLAYS: readonly Overlay[] = ["sma_20", "sma_50", "sma_200", "volume", "rsi"];

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
  const chartStyle = record["chartStyle"];
  const overlays = record["overlays"];
  const forecast = record["forecast"];
  const range = record["range"];
  const views = record["views"];
  const participation = record["participation"];
  return {
    scope: scopeOf(record["scope"]) ?? DEFAULT_PREFERENCES.scope,
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
    forecast: typeof forecast === "boolean" ? forecast : DEFAULT_PREFERENCES.forecast,
    range: rangeFrom(range),
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
    // A column that names no population would fail the whole heatmap's
    // request, so it is dropped rather than kept with its key missing.
    participation: Array.isArray(participation)
      ? participation
          .map(scopeOf)
          .filter(
            (scope): scope is Scope =>
              scope !== null && (scope.key !== null || !KEYED_KINDS.includes(scope.kind)),
          )
      : DEFAULT_PREFERENCES.participation,
  };
}

/**
 * Read a stored population.
 *
 * @param stored - Whatever storage held for one.
 * @returns The population, its key null when none was stored; null when
 *   its kind is not one this version knows.
 */
function scopeOf(stored: unknown): Scope | null {
  if (typeof stored !== "object" || stored === null) {
    return null;
  }
  const kind = (stored as Record<string, unknown>)["kind"];
  const key = (stored as Record<string, unknown>)["key"];
  return typeof kind === "string" && (SCOPE_KINDS as readonly string[]).includes(kind)
    ? { kind: kind as ScopeKind, key: typeof key === "string" ? key : null }
    : null;
}

/** Only for tests: forget what was read, so the next read is from storage. */
export function forgetForTests(): void {
  current = null;
}
