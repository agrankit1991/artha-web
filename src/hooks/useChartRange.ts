/**
 * How many sessions a price chart shows, remembered across pages.
 *
 * A reader who widens one company's chart to five years expects the next
 * chart to open at five years too; the contract page opened at its own
 * 125 sessions whatever had been chosen elsewhere. The choice lives in
 * preferences, so every price chart reads and writes the same one.
 */

import { useState } from "react";

import { readPreferences, writePreferences } from "@/lib/preferences";

/**
 * Read and remember the chart range.
 *
 * @returns The range in sessions, and a setter that also remembers it.
 */
export function useChartRange(): [number, (sessions: number) => void] {
  const [sessions, setSessions] = useState(() => readPreferences().range);
  const choose = (next: number): void => {
    setSessions(next);
    writePreferences({ range: next });
  };
  return [sessions, choose];
}
