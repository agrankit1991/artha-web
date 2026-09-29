/**
 * Participation over time, as a grid: a row per population, a column per
 * session, each cell the share of members above a moving average.
 *
 * StockEdge's breadth view, and the densest way to see a rotation: a band
 * of red spreading across the rows is a market narrowing, before any index
 * says so. Colour is never the only carrier -- every cell names its
 * population, its session and its figure for a screen reader and a hover.
 *
 * Every session is a cell of the same width however long the span, so
 * twenty years reads at the grain ten weeks does and simply scrolls
 * further, opening on the newest session at the right. Only the columns in
 * view are built; those scrolled past stand in as one empty cell of their
 * width at each end, so the scrollbar still measures the whole span.
 */

import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDay, formatDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { visibleRange } from "@/lib/visibleRange";

/** Which moving average a cell measures members against. */
export type BreadthMeasure = "above_sma_20" | "above_sma_50" | "above_sma_200";

/** One row: a population and its shares. */
export interface HeatmapRow {
  key: string;
  label: string;
  /** Its own page, or null when it has none. */
  href: string | null;
  /** Its shares, lined up with the days; null where it was not counted. */
  shares: readonly (number | null)[];
}

interface BreadthHeatmapProps {
  /** The sessions, oldest first, as ISO dates. */
  days: readonly string[];
  rows: readonly HeatmapRow[];
  /** How the measure reads in a label, such as `50-day`. */
  measureLabel: string;
  loading?: boolean;
  /** Whether the dates along the top carry their year, for a span of more than one. */
  yearly?: boolean;
}

/**
 * The five steps a share falls into, lowest first, with their colour: a
 * diverging scale, weak through a neutral grey to strong. The middle band
 * was caution amber, which said "worth a look" about the most ordinary
 * reading there is; a stretched market (80% and over) is named by the
 * regime above, not by a colour here.
 */
const STEPS: readonly { below: number; className: string; label: string }[] = [
  { below: 20, className: "bg-loss/80", label: "under 20%" },
  { below: 40, className: "bg-loss/40", label: "20-40%" },
  { below: 60, className: "bg-muted-foreground/25", label: "40-60%" },
  { below: 80, className: "bg-gain/40", label: "60-80%" },
  { below: Number.POSITIVE_INFINITY, className: "bg-gain/80", label: "80% and over" },
];

/** A session's cell (`w-3`) and the spacing after it (`border-spacing-0.5`), in pixels. */
const CELL = 12;
const GAP = 2;
const PITCH = CELL + GAP;

/** Columns built past each edge of the view, so a quick scroll never shows blanks. */
const SPARE = 20;

/**
 * Draw the grid.
 *
 * @param props - The sessions, the populations, which share they carry,
 *   and whether they are loading.
 * @returns The heatmap with its legend.
 */
export function BreadthHeatmap({
  days,
  rows,
  measureLabel,
  loading = false,
  yearly = false,
}: BreadthHeatmapProps): React.JSX.Element {
  if (loading && rows.length === 0) {
    return <Skeleton className="h-48 w-full" />;
  }
  // A population with nothing counted, like India VIX, is left out.
  const drawn = rows.filter((row) => row.shares.some((share) => share !== null));
  return (
    <div className={cn("space-y-3", loading && "opacity-60")} aria-busy={loading}>
      <Grid days={days} rows={drawn} measureLabel={measureLabel} yearly={yearly} />
      <ul
        aria-label="Legend"
        className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
      >
        {STEPS.map((step) => (
          <li key={step.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("h-3 w-3 rounded-sm", step.className)} />
            {step.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The table itself, built a view at a time.
 *
 * Its own component so its measuring and scrolling mount with the box they
 * measure and scroll, rather than finding it missing while the first span
 * loads.
 */
function Grid({
  days,
  rows,
  measureLabel,
  yearly,
}: Required<Omit<BreadthHeatmapProps, "loading">>): React.JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = box.current;
    // Unreachable: the box renders with this component, before its effects run.
    if (element === null) {
      return undefined;
    }
    const measure = (): void => {
      setWidth(element.clientWidth);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Open on the newest session, and again whenever the span changes.
  useLayoutEffect(() => {
    const element = box.current;
    // Unreachable: as above.
    if (element === null) {
      return;
    }
    element.scrollLeft = element.scrollWidth;
    setScrollLeft(element.scrollLeft);
  }, [days]);

  const scrolled = (): void => {
    // One rebuild a frame however fast the wheel turns.
    frame.current ??= window.requestAnimationFrame(() => {
      frame.current = null;
      setScrollLeft(box.current?.scrollLeft ?? 0);
    });
  };

  // Until the box has a width of its own, the window's is a width it will not exceed.
  const { first, last } = visibleRange(
    scrollLeft,
    width > 0 ? width : window.innerWidth,
    days.length,
    PITCH,
    SPARE,
  );
  const shown = days.slice(first, last + 1);
  const after = Math.max(0, days.length - 1 - last);
  const dateOf = (day: string): string => (yearly ? formatDay(day) : formatDayMonth(day));

  return (
    <div ref={box} className="overflow-x-auto" onScroll={scrolled}>
      {/* `w-max`, or a span wider than the card squeezes every empty cell
          to nothing: a cell's width is only its preference, and an auto
          table short of room shrinks columns to their content, which here
          is none. Measured in Firefox, 2026-09-28. */}
      <table
        aria-label={`Share above the ${measureLabel} average`}
        className="w-max border-separate border-spacing-0.5"
      >
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card" />
            <Gap columns={first} header />
            {shown.map((day, offset) => (
              <th
                key={day}
                scope="col"
                className="relative h-4 px-0 text-[0.6rem] font-normal text-muted-foreground"
              >
                {/* Every tenth session named, so the axis reads without crowding.
                    Laid over the cells rather than in them, so a label never
                    widens its column and every session stays one width. */}
                {(first + offset) % 10 === 0 && (
                  <span className="absolute top-0 left-0 whitespace-nowrap">{dateOf(day)}</span>
                )}
              </th>
            ))}
            <Gap columns={after} header />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card pr-3 text-left text-sm font-medium whitespace-nowrap"
              >
                {row.href === null ? (
                  row.label
                ) : (
                  <Link to={row.href} className="hover:text-primary hover:underline">
                    {row.label}
                  </Link>
                )}
              </th>
              <Gap columns={first} />
              {shown.map((day, offset) => {
                const share = row.shares[first + offset] ?? null;
                const text =
                  share === null
                    ? `${row.label}, ${formatDay(day)}: not counted`
                    : `${row.label}, ${formatDay(day)}: ${share.toFixed(0)}% above the ${measureLabel} average`;
                return (
                  <td
                    key={day}
                    aria-label={text}
                    title={text}
                    className={cn(
                      "h-6 w-3 rounded-sm",
                      share === null ? "bg-muted" : stepOf(share).className,
                    )}
                  />
                );
              })}
              <Gap columns={after} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The sessions scrolled out of view, as one empty cell of their width.
 *
 * @param props - How many sessions it stands for, and whether it is in the header row.
 * @returns The cell, or nothing for none.
 */
function Gap({ columns, header = false }: { columns: number; header?: boolean }): React.ReactNode {
  if (columns === 0) {
    return null;
  }
  // The cell brings one gap of its own, so it spans every cell it replaces
  // and every gap between them.
  const style = { width: columns * PITCH - GAP, minWidth: columns * PITCH - GAP };
  return header ? (
    <th aria-hidden="true" className="p-0" style={style} />
  ) : (
    <td aria-hidden="true" className="p-0" style={style} />
  );
}

/** The step a share falls into. */
function stepOf(share: number): (typeof STEPS)[number] {
  // Unreachable fallback: the last step has no upper bound.
  return (
    STEPS.find((step) => share < step.below) ?? (STEPS[STEPS.length - 1] as (typeof STEPS)[number])
  );
}
