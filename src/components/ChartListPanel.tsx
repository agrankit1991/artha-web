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
 *
 * Given the reader's lists, the list's name opens them in the companies'
 * place, in the same column (the owner, 2026-11-08: the lists "could also
 * move to some settings near the company list", freeing the column they
 * stood in for the chart). Choosing one, the name again or Escape shuts them;
 * the keys stand down while they are open, so moving through the lists
 * never moves the chart.
 */

import { ArrowDown, ArrowDownUp, ArrowUp, ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

import { Delta } from "@/components/Delta";
import { WatchlistsContextMenu } from "@/components/WatchlistMenu";
import { WatchCount } from "@/components/WatchCount";
import { toNumber, formatPrice } from "@/lib/format";
import { type ChartListOrder, usePreferences, writePreferences } from "@/lib/preferences";
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
  /** The reader's lists, to choose another from; given, the name opens them. */
  lists?: ReactNode;
  /** Classes for the panel, such as the most room it may take. */
  className?: string;
}

/** What each order is called, and the one a click on the column moves to. */
const ORDERS: Record<ChartListOrder, { name: string; next: ChartListOrder }> = {
  kept: { name: "as kept", next: "rising" },
  rising: { name: "rising first", next: "falling" },
  falling: { name: "falling first", next: "kept" },
};

/**
 * Put a list in an order: as kept, or by today's move.
 *
 * A company with no move today goes last either way, rather than counting as
 * nought and sitting in the middle of the falls.
 *
 * @param rows - The list as kept.
 * @param order - Which order.
 * @returns The rows in it; the same array when kept.
 */
export function orderRows<Row extends { change_percent: string | null }>(
  rows: Row[],
  order: ChartListOrder,
): Row[] {
  if (order === "kept") {
    return rows;
  }
  const sign = order === "rising" ? -1 : 1;
  return [...rows].sort((one, other) => {
    const [a, b] = [toNumber(one.change_percent), toNumber(other.change_percent)];
    if (a === null || b === null) {
      return a === b ? 0 : a === null ? 1 : -1;
    }
    return sign * (a - b);
  });
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
  lists,
  className,
}: ChartListPanelProps): React.JSX.Element {
  // Which list the lists were opened over: choosing another changes the
  // title, which shuts them with no effect to watch for it.
  const [openedOver, setOpenedOver] = useState<string | null>(null);
  const choosing = lists !== undefined && openedOver === title;
  // A company right-clicked, and where: its lists open there (the owner,
  // 2026-11-08: "right click on a company in company list and add it to a
  // existing list").
  const [menuFor, setMenuFor] = useState<{ row: PanelRow; at: { x: number; y: number } } | null>(
    null,
  );
  const { chartListOrder: order } = usePreferences();
  const OrderMark = order === "rising" ? ArrowDown : order === "falling" ? ArrowUp : ArrowDownUp;

  useEffect(() => {
    const step = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (choosing) {
        if (event.key === "Escape") {
          setOpenedOver(null);
        }
        return;
      }
      // A company's lists open over the panel: the keys are the menu's.
      if (menuFor !== null) {
        return;
      }
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
  }, [rows, active, onChoose, choosing, menuFor]);

  return (
    // A column: given a most room (`className`), the list scrolls inside it
    // rather than running the page on past the chart.
    <section
      aria-label={`${title}, beside the chart`}
      className={cn("flex min-h-0 flex-col gap-2", className)}
    >
      <div className="flex items-baseline justify-between gap-2 px-1">
        {lists === undefined ? (
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        ) : (
          <h2 className="min-w-0 text-sm font-semibold">
            <button
              type="button"
              // The visible name first, so a reader saying what they see finds it.
              aria-label={`${title}, choose another list`}
              aria-expanded={choosing}
              title="Choose another list"
              onClick={() => {
                setOpenedOver(choosing ? null : title);
              }}
              className="flex max-w-full items-center gap-1 rounded hover:text-primary"
            >
              <span className="truncate">{title}</span>
              <ChevronDown
                aria-hidden="true"
                className={cn("h-4 w-4 shrink-0 transition-transform", choosing && "rotate-180")}
              />
            </button>
          </h2>
        )}
        {!choosing && (
          <span className="shrink-0 text-xs text-muted-foreground">Up / Down to move</span>
        )}
      </div>
      {choosing ? (
        <div role="region" aria-label="Your lists" className="min-h-0 overflow-auto">
          {lists}
        </div>
      ) : rows.length === 0 ? (
        <p className="px-1 text-xs text-muted-foreground">Nothing on this list yet.</p>
      ) : (
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border">
          {/* Columns as TradingView's watchlist heads them: the move's head
              orders the list by it (the owner, 2026-11-08: "reorder based
              on the price up/down move"). */}
          <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <span className="flex-1">Symbol</span>
            <span>Last</span>
            <button
              type="button"
              aria-label={`Order by today's move: ${ORDERS[order].name}`}
              title={`Ordered ${ORDERS[order].name}; click for ${ORDERS[ORDERS[order].next].name}`}
              onClick={() => {
                writePreferences({ chartListOrder: ORDERS[order].next });
              }}
              className={cn(
                "flex w-16 items-center justify-end gap-0.5 rounded hover:text-foreground",
                order !== "kept" && "font-medium text-foreground",
              )}
            >
              Chg%
              <OrderMark aria-hidden="true" className="h-3 w-3" />
            </button>
          </div>
          <ul
            className="max-h-[70vh] min-h-0 divide-y overflow-auto xl:max-h-none"
            aria-label={title}
          >
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
                    onContextMenu={(event) => {
                      event.preventDefault();
                      // From the keyboard (Shift+F10) there is no pointer: by the row.
                      const box = event.currentTarget.getBoundingClientRect();
                      const at =
                        event.clientX === 0 && event.clientY === 0
                          ? { x: box.left + 16, y: box.bottom }
                          : { x: event.clientX, y: event.clientY };
                      setMenuFor({ row, at });
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
        </div>
      )}
      {menuFor !== null && (
        <WatchlistsContextMenu
          instrumentKey={menuFor.row.instrument_key}
          symbol={menuFor.row.symbol}
          at={menuFor.at}
          onClose={() => {
            setMenuFor(null);
          }}
        />
      )}
    </section>
  );
}
