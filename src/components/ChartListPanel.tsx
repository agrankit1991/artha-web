/**
 * The list beside the chart in the watchlist's Chart view, as TradingView's
 * watchlist sits beside its chart: one row per company, its price and today's
 * move, the one charted marked.
 *
 * A row is chosen by clicking it, or by moving through the list from the
 * keyboard -- Down or Space for the next, Up or Shift+Space for the one
 * before -- which is how a list is read on a chart: one company after
 * another without the hand leaving the keys. Keys typed into a field are
 * left alone, so searching never moves the chart.
 */

import { useEffect } from "react";

import { Delta } from "@/components/Delta";
import { WatchCount } from "@/components/WatchCount";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One company on the list, as the panel shows it. */
export interface PanelRow {
  instrument_key: string;
  symbol: string;
  name: string;
  close: string | null;
  change_percent: string | null;
}

interface ChartListPanelProps {
  /** What the list is called. */
  title: string;
  rows: PanelRow[];
  /** The instrument charted. */
  active: string | null;
  onChoose: (instrumentKey: string) => void;
}

/** Fields whose keys are the reader's typing, not a request to move. */
const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Render the panel and listen for the keys that move through it.
 *
 * @param props - The list, which is charted, and what to call to chart another.
 * @returns The panel.
 */
export function ChartListPanel({
  title,
  rows,
  active,
  onChoose,
}: ChartListPanelProps): React.JSX.Element {
  useEffect(() => {
    const step = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        rows.length === 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (target !== null && (TYPING.has(target.tagName) || target.isContentEditable))
      ) {
        return;
      }
      const forward =
        event.key === "ArrowDown" || (event.key === " " && !event.shiftKey)
          ? 1
          : event.key === "ArrowUp" || (event.key === " " && event.shiftKey)
            ? -1
            : 0;
      if (forward === 0) {
        return;
      }
      // Moving through the list, not scrolling the page under it.
      event.preventDefault();
      const at = rows.findIndex((one) => one.instrument_key === active);
      const next = Math.min(rows.length - 1, Math.max(0, at + forward));
      const chosen = rows[next];
      if (chosen !== undefined && chosen.instrument_key !== active) {
        onChoose(chosen.instrument_key);
      }
    };
    window.addEventListener("keydown", step);
    return () => {
      window.removeEventListener("keydown", step);
    };
  }, [rows, active, onChoose]);

  return (
    <section aria-label={`${title}, beside the chart`} className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        <span className="shrink-0 text-xs text-muted-foreground">Up / Down to move</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">Nothing on this list yet.</p>
      ) : (
        <ul className="max-h-[70vh] divide-y overflow-auto rounded-md border" aria-label={title}>
          {rows.map((row) => {
            const chosen = row.instrument_key === active;
            return (
              <li key={row.instrument_key}>
                <button
                  type="button"
                  aria-current={chosen ? "true" : undefined}
                  title={row.name}
                  onClick={() => {
                    onChoose(row.instrument_key);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent",
                    chosen && "bg-primary/10 font-medium",
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <span className="truncate text-primary">{row.symbol}</span>
                    <WatchCount instrumentKey={row.instrument_key} symbol={row.symbol} />
                  </span>
                  <span className="tabular text-xs">{formatPrice(row.close)}</span>
                  <Delta value={row.change_percent} className="w-16 justify-end text-xs" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
