/**
 * The watchlist page's Chart view: the instrument chosen charted, and the
 * list it is chosen from beside it, as TradingView lays a chart and its
 * watchlist out (owner's choice, 2026-11-07: a view of the watchlist page,
 * not a page of its own).
 *
 * Fed the same rows whichever list is shown, the reader's own or a kept
 * one; which is charted lives in the address (`chart=`), so a chart is a
 * link and Back returns to the one before.
 */

import { ChartListPanel, type PanelRow } from "@/components/ChartListPanel";
import { WorkspaceChart } from "@/components/WorkspaceChart";

interface WatchlistChartViewProps {
  title: string;
  rows: PanelRow[];
  /** The instrument the address asks for; the list's first when none. */
  asked: string | null;
  /** Whether the rows are still on their way. */
  loading: boolean;
  onChoose: (instrumentKey: string) => void;
}

/**
 * Render the chart and the list beside it.
 *
 * @param props - The list, which instrument is asked for, and how to chart another.
 * @returns The view.
 */
export function WatchlistChartView({
  title,
  rows,
  asked,
  loading,
  onChoose,
}: WatchlistChartViewProps): React.JSX.Element {
  const active = asked ?? rows[0]?.instrument_key ?? null;
  const row = rows.find((one) => one.instrument_key === active);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
      {active === null ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {loading ? "Loading the list…" : "Nothing on this list to chart yet."}
        </p>
      ) : (
        <WorkspaceChart
          instrumentKey={active}
          // An instrument asked for by the address but not on the list (a
          // link from its own page) is named by its key until it is.
          symbol={row?.symbol ?? active.slice(active.lastIndexOf("|") + 1)}
          isIndex={active.includes("_INDEX|")}
        />
      )}
      <ChartListPanel title={title} rows={rows} active={active} onChoose={onChoose} />
    </div>
  );
}
