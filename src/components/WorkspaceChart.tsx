/**
 * The chart in the watchlist's Chart view: the instrument chosen in the list
 * beside it, drawn as the company page draws it, with other instruments laid
 * over it for comparison.
 *
 * The same `PriceChart` as everywhere -- shape, scale, indicators, the
 * forecast band, Save image -- fed the same server-computed figures, so a
 * chart here and on the company page cannot disagree. Compared instruments
 * are drawn as lines; with any shown the axis reads in per cent from the
 * first session on screen, since prices of different companies on one price
 * axis make the cheaper ones flat lines along the bottom.
 */

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { SearchHit } from "@/api/client";
import { fetchCorporateActions, fetchFigures, fetchPriceBands } from "@/api/client";
import type { Series } from "@/components/Chart";
import { Chip } from "@/components/Chip";
import { Failed } from "@/components/Failed";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { PriceChart } from "@/components/PriceChart";
import { RangeSelector } from "@/components/RangeSelector";
import { useChartRange } from "@/hooks/useChartRange";
import { useResource } from "@/hooks/useResource";
import { MOST_SERIES, PRICE_LINE, SERIES_COLOURS } from "@/lib/chartPalette";
import { actionMarkers } from "@/lib/chartMarkers";
import type { ChartSync } from "@/lib/chartSync";
import { toNumber } from "@/lib/format";
import { companyPath, populationPath } from "@/lib/paths";
import { PRICE_RANGES } from "@/lib/priceRanges";

/** How many instruments may be laid over the chart: the palette's colours, less the price's. */
const MOST_COMPARED = MOST_SERIES - 1;

interface WorkspaceChartProps {
  instrumentKey: string;
  symbol: string;
  /** Whether it is an index, whose page is a population's rather than a company's. */
  isIndex: boolean;
  /** A group of charts this one keeps in step with, when laid out beside others. */
  sync?: ChartSync;
  /** How tall the price is drawn: shorter when several charts share the space. */
  height?: number;
  /** Something for the chart's own header, such as making it fill the view. */
  controls?: React.ReactNode;
}

/**
 * Render the chart, its range and its comparisons.
 *
 * @param props - The instrument charted.
 * @returns The chart.
 */
export function WorkspaceChart({
  instrumentKey,
  symbol,
  isIndex,
  sync,
  height,
  controls,
}: WorkspaceChartProps): React.JSX.Element {
  const [sessions, setSessions] = useChartRange();
  const loadChart = useCallback(
    () => fetchFigures(instrumentKey, sessions),
    [instrumentKey, sessions],
  );
  const chart = useResource(loadChart);
  const loadForecast = useCallback(() => fetchPriceBands(instrumentKey), [instrumentKey]);
  const forecast = useResource(loadForecast);

  // Kept as the reader moves down the list, as TradingView keeps a chart's
  // comparisons: "this company against the Nifty" is asked of each in turn.
  const [compared, setCompared] = useState<{ key: string; label: string }[]>([]);
  const loadCompared = useCallback(
    () => Promise.all(compared.map((one) => fetchFigures(one.key, sessions))),
    [compared, sessions],
  );
  const comparedFigures = useResource(loadCompared);
  const extra = useMemo<Series[]>(
    () =>
      compared.map((one, at) => ({
        kind: "line",
        label: one.label,
        // The first colour is the price's; comparisons take the rest in order.
        colour: SERIES_COLOURS[at + 1] ?? PRICE_LINE,
        points: (comparedFigures.data?.[at]?.points ?? []).flatMap((point) => {
          const value = toNumber(point.close);
          return value === null ? [] : [{ time: point.day, value }];
        }),
      })),
    [compared, comparedFigures.data],
  );

  // An index has no corporate actions; a company's bonuses and splits are marked.
  const loadActions = useCallback(
    () => (isIndex ? Promise.resolve([]) : fetchCorporateActions(instrumentKey)),
    [isIndex, instrumentKey],
  );
  const actions = useResource(loadActions);
  const markers = useMemo(() => actionMarkers(actions.data ?? []), [actions.data]);

  const add = (hit: SearchHit): void => {
    setCompared((now) =>
      now.some((one) => one.key === hit.key) || now.length >= MOST_COMPARED
        ? now
        : [...now, { key: hit.key, label: hit.label }],
    );
  };

  // The instrument and what is laid over it: what leads the bar over the
  // chart (`PriceChart`), the span going under the plot.
  const lead = (
    <>
      <Link
        to={isIndex ? populationPath("index", instrumentKey) : companyPath(instrumentKey, symbol)}
        className="mr-2 text-lg font-semibold text-primary hover:underline"
      >
        {symbol}
      </Link>
      <div className="w-40">
        <InstrumentPicker
          label="Compare with"
          placeholder="Compare with…"
          kinds={["company", "index"]}
          excluded={[instrumentKey, ...compared.map((one) => one.key)]}
          onPick={add}
        />
      </div>
      {compared.map((one) => (
        <Chip
          key={one.key}
          removeLabel={`Stop comparing with ${one.label}`}
          onRemove={() => {
            setCompared((now) => now.filter((other) => other.key !== one.key));
          }}
        >
          {one.label}
        </Chip>
      ))}
      {compared.length > 0 && (
        <span className="text-xs text-muted-foreground">
          Read in per cent from the first session shown.
        </span>
      )}
    </>
  );

  return (
    <section aria-label={`${symbol}, charted`} className="space-y-3">
      {chart.error !== null ? (
        <>
          <div className="flex flex-wrap items-center gap-2">{lead}</div>
          <Failed message={chart.error} />
        </>
      ) : (
        <PriceChart
          // A fresh chart per instrument, so one company's zoom is not
          // carried over to the next.
          key={instrumentKey}
          points={chart.data?.points ?? null}
          forecast={forecast.data ?? null}
          loading={chart.loading}
          instrument={{ label: symbol }}
          extra={extra}
          markers={markers}
          drawingsOf={instrumentKey}
          lead={lead}
          trail={controls}
          range={
            <RangeSelector
              ranges={PRICE_RANGES}
              sessions={sessions}
              onChange={setSessions}
              label="History"
            />
          }
          {...(sync === undefined ? {} : { sync })}
          {...(height === undefined ? {} : { height })}
        />
      )}
    </section>
  );
}
