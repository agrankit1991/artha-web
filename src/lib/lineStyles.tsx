/**
 * How the reader has each kind of chart line drawn, shared by every chart.
 *
 * Kept on the reader's account (the owner's choice, 2026-11-08) and read once
 * for the signed-in application, so SMA 50 looks the same on every chart and
 * every device. A change is shown at once and kept behind it; one the
 * platform refuses is undone and said. Outside the provider -- a chart
 * rendered on its own, in a test -- every line is drawn the chart's own way
 * and a change goes nowhere, so a screen that does not style lines needs
 * nothing set up.
 */

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  type LineStyleChange,
  fetchLineStyles,
  forgetLineStyles,
  saveLineStyle,
} from "@/api/client";
import { useResource } from "@/hooks/useResource";
import { CHART_LINES, type LineKey, type LineLook } from "@/lib/chartLines";

/** What a component can ask about, and change in, the reader's line styles. */
export interface LineStyles {
  /** How a line is drawn now: the reader's colour and width where set, the chart's own where not. */
  drawn: (line: LineKey) => LineLook;
  /** What the reader has set for a line, each part null where they have not. */
  own: (line: LineKey) => LineStyleChange;
  /** Set how a line is drawn; neither part set is the chart's own again. */
  save: (line: LineKey, change: LineStyleChange) => void;
  /** Draw every line the chart's own way again. */
  forgetAll: () => void;
  /** Why the last change could not be kept, or null. */
  problem: string | null;
}

/** A line with nothing of the reader's: the chart's own. */
const NOTHING: LineStyleChange = { colour: null, width: null };

/**
 * Lay the reader's choices over the chart's own way of drawing a line.
 *
 * @param line - Which line.
 * @param own - What the reader has set for it.
 * @returns The colour and width to draw it with.
 */
function lookOf(line: LineKey, own: LineStyleChange): LineLook {
  const fallback = CHART_LINES[line];
  return { colour: own.colour ?? fallback.colour, width: own.width ?? fallback.width };
}

const UNSTYLED: LineStyles = {
  drawn: (line) => lookOf(line, NOTHING),
  own: () => NOTHING,
  save: () => undefined,
  forgetAll: () => undefined,
  problem: null,
};

const LineStylesContext = createContext<LineStyles>(UNSTYLED);

/**
 * Fetch the reader's line styles and share them with everything inside.
 *
 * @param props - What is drawn inside.
 * @returns The children, with the styles available to them.
 */
export function LineStylesProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const load = useCallback(() => fetchLineStyles(), []);
  const kept = useResource(load);
  // Changes since the read, laid over it, so a choice shows before the
  // platform has answered; the read is not repeated after each one.
  const [changed, setChanged] = useState<ReadonlyMap<string, LineStyleChange>>(new Map());
  const [problem, setProblem] = useState<string | null>(null);

  const value = useMemo<LineStyles>(() => {
    const styles = new Map<string, LineStyleChange>(
      (kept.data ?? []).map((one) => [one.line, { colour: one.colour, width: one.width }]),
    );
    for (const [line, change] of changed) {
      styles.set(line, change);
    }
    const own = (line: LineKey): LineStyleChange => styles.get(line) ?? NOTHING;
    // Updates from what is current, not from this render's copy, so two
    // quick changes both stand; a refusal puts back only the lines it touched.
    const lay = (lines: ReadonlyMap<string, LineStyleChange>): void => {
      setChanged((now) => new Map([...now, ...lines]));
    };
    const keep = (
      attempt: Promise<unknown>,
      before: ReadonlyMap<string, LineStyleChange>,
    ): void => {
      setProblem(null);
      attempt.catch((error: unknown) => {
        lay(before);
        setProblem(error instanceof Error ? error.message : "The style could not be kept");
      });
    };
    return {
      drawn: (line) => lookOf(line, own(line)),
      own,
      save: (line, change) => {
        const before = new Map([[line, own(line)]]);
        lay(new Map([[line, change]]));
        keep(saveLineStyle(line, change), before);
      },
      forgetAll: () => {
        const before = new Map(styles);
        lay(new Map([...styles.keys()].map((line) => [line, NOTHING])));
        keep(forgetLineStyles(), before);
      },
      problem,
    };
  }, [kept.data, changed, problem]);

  return <LineStylesContext.Provider value={value}>{children}</LineStylesContext.Provider>;
}

/**
 * Read the reader's line styles.
 *
 * @returns How each line is drawn, and the way to change it.
 */
export function useLineStyles(): LineStyles {
  return useContext(LineStylesContext);
}
