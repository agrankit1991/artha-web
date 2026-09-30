/**
 * A population as a market map: every company a tile, sized by what it is
 * worth and coloured by how it moved, grouped by sector.
 *
 * The owner asked for it to work like TradingView's (2026-09-30), and it is
 * drawn from this platform's own figures rather than embedded, so it
 * agrees with the tables beside it and works for any index, any sector or
 * the whole market. One request (`fetchHeatmap`) carries every period's
 * move and both sizes, so choosing a period or a size redraws at once.
 *
 * - **Size:** market capitalisation by default; traded value; or equal,
 *   every company counting once (the owner's earlier choice, 2026-09-23,
 *   kept as an option, and the reading the breadth counts are taken from).
 * - **Colour:** the move over the chosen period, clamped at the period's
 *   reach (`src/lib/heatColour.ts`), each tile's text chosen by contrast.
 * - **Layout:** squarified, sectors first, then their companies
 *   (`src/lib/treemap.ts`); a sector's name zooms into it.
 * - **Reading:** every tile is a link named with its figures; hovering or
 *   focusing one shows its card; a search dims all but the matches; and
 *   the same companies are one switch away as a table.
 */

import { ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { HeatmapTile, TileChanges } from "@/api/client";
import { Chooser, type Option } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Empty } from "@/components/Empty";
import { nameColumn, symbolColumn } from "@/components/identityColumns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useElementWidth } from "@/hooks/useElementWidth";
import { type HeatPeriod, heatPaint, heatPalette, heatShare } from "@/lib/heatColour";
import {
  formatCrore,
  ABSENT,
  formatCount,
  formatPercent,
  formatPrice,
  formatWhole,
  toNumber,
} from "@/lib/format";
import { useTheme } from "@/lib/theme";
import { type Rect, type Sized, squarifyGroups } from "@/lib/treemap";
import { cn } from "@/lib/utils";

/** What a tile's area stands for. */
type SizeBy = "market_cap" | "traded_value" | "equal";

/** Which of the platform's periods colours the map. */
type PeriodKey = keyof TileChanges;

/** Map or table: the same companies either way. */
type Layout = "map" | "table";

const SIZES: Option<SizeBy>[] = [
  { key: "market_cap", label: "Market cap" },
  { key: "traded_value", label: "Traded value" },
  { key: "equal", label: "Equal" },
];

/**
 * The periods, and the move each draws at full colour: three per cent is
 * a big day and an ordinary year.
 */
const DAY: HeatPeriod<PeriodKey> = { key: "day", label: "1D", reach: 3 };

export const PERIODS: readonly HeatPeriod<PeriodKey>[] = [
  DAY,
  { key: "one_week", label: "1W", reach: 6 },
  { key: "one_month", label: "1M", reach: 10 },
  { key: "three_months", label: "3M", reach: 20 },
  { key: "year_to_date", label: "YTD", reach: 30 },
  { key: "one_year", label: "1Y", reach: 50 },
];

const LAYOUTS: Option<Layout>[] = [
  { key: "map", label: "Map" },
  { key: "table", label: "Table" },
];

/**
 * The most tiles drawn. Past a few hundred, sized by capitalisation, the
 * rest are too small to see, let alone to point at; the table has them all.
 */
const MOST_TILES = 500;

/** How the map is laid out before it is measured, and under test. */
const NOMINAL_WIDTH = 960;
const HEIGHT = 540;
const PHONE_HEIGHT = 440;
const HEADING = 16;

/** What a tile needs to carry its symbol, and its symbol and move. */
const ROOM_FOR_SYMBOL = { width: 34, height: 16 };
const ROOM_FOR_MOVE = { width: 56, height: 34 };

/** A company's own sector, or where a company without one is put. */
const NO_SECTOR = "Other";

interface HeatmapProps {
  /** The companies, largest capitalisation first; null while on their way. */
  tiles: HeatmapTile[] | null;
  /** What the map is of, for its label: "Nifty 50", "the whole market". */
  label: string;
  /** Where a company's own page is. */
  linkTo: (tile: HeatmapTile) => string;
}

/**
 * Draw the map, with its controls, legend and table.
 *
 * @param props - The companies, what they are, and where each leads.
 * @returns The map.
 */
export function Heatmap({ tiles, label, linkTo }: HeatmapProps): React.JSX.Element {
  const [sizeBy, setSizeBy] = useState<SizeBy>("market_cap");
  const [period, setPeriod] = useState<PeriodKey>("day");
  const [sector, setSector] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [layout, setLayout] = useState<Layout>("map");
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const full = useFullscreen(frame);
  const measured = useElementWidth(box);
  const width = measured === 0 ? NOMINAL_WIDTH : measured;
  const height = full
    ? Math.max(window.innerHeight - 140, HEIGHT)
    : width < 640
      ? PHONE_HEIGHT
      : HEIGHT;
  const { appearance } = useTheme();
  // Read again when the mode changes: a tile's colour is worked out here.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the stylesheet is the input
  const palette = useMemo(() => heatPalette(), [appearance]);
  const { reach, label: periodLabel } = periodOf(period);

  // What is drawn: the chosen sector's companies or every one, with a size,
  // largest first, at most `MOST_TILES` of them.
  const drawn = useMemo(() => {
    const within = (tiles ?? []).filter(
      (tile) => sector === null || (tile.sector ?? NO_SECTOR) === sector,
    );
    const sized = within.flatMap((tile) => {
      const size = sizeOf(tile, sizeBy);
      return size === null || size <= 0 ? [] : [{ tile, size }];
    });
    sized.sort((one, other) => other.size - one.size);
    return {
      within: within.length,
      shown: sized.slice(0, MOST_TILES),
      unsized: within.length - sized.length,
    };
  }, [tiles, sector, sizeBy]);

  const groups = useMemo(() => {
    const bySector = new Map<string, Sized<HeatmapTile>[]>();
    for (const { tile, size } of drawn.shown) {
      const name = tile.sector ?? NO_SECTOR;
      bySector.set(name, [...(bySector.get(name) ?? []), { item: tile, size }]);
    }
    return squarifyGroups(
      [...bySector.entries()].map(([group, values]) => ({ group, values })),
      { x: 0, y: 0, width, height },
      HEADING,
    );
  }, [drawn, width, height]);

  const letters = typed.trim().toLowerCase();
  const matches = useCallback(
    (tile: HeatmapTile) =>
      letters === "" ||
      tile.symbol.toLowerCase().includes(letters) ||
      tile.name.toLowerCase().includes(letters),
    [letters],
  );
  const [pointed, setPointed] = useState<{ tile: HeatmapTile; at: Rect } | null>(null);

  const toggleFull = (): void => {
    // Absent, not null, where the browser has no full screen at all.
    if ((document.fullscreenElement ?? null) === null) {
      void frame?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  return (
    <div ref={setFrame} className="space-y-3 bg-card">
      <div className="flex flex-wrap items-center gap-3">
        <Chooser options={SIZES} chosen={sizeBy} onChange={setSizeBy} label="Size by" />
        <Chooser options={PERIODS} chosen={period} onChange={setPeriod} label="Colour by" />
        <Input
          type="search"
          aria-label="Find a company on the map"
          placeholder="Find a company"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
          }}
          className="w-44"
        />
        <div className="ml-auto flex items-center gap-2">
          <Chooser options={LAYOUTS} chosen={layout} onChange={setLayout} label="Show as" />
          {"requestFullscreen" in HTMLElement.prototype && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFull}
              aria-label={full ? "Leave full screen" : "Full screen"}
            >
              {full ? (
                <Minimize2 aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {sector !== null && (
        <nav aria-label="Map" className="flex items-center gap-1 text-sm">
          <Button
            variant="link"
            size="sm"
            className="h-auto px-0"
            onClick={() => {
              setSector(null);
            }}
          >
            All sectors
          </Button>
          <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{sector}</span>
        </nav>
      )}

      {tiles === null ? (
        <Skeleton className="w-full" style={{ height }} />
      ) : drawn.shown.length === 0 ? (
        <Empty
          title="Nothing to draw"
          reason={
            sizeBy === "market_cap"
              ? "None of these companies has a capitalisation on record yet. Try Equal."
              : "None of these companies has figures on record yet."
          }
        />
      ) : layout === "table" ? (
        <HeatmapTable tiles={drawn.shown.map((one) => one.tile)} period={period} linkTo={linkTo} />
      ) : (
        <div
          ref={setBox}
          role="group"
          aria-label={`${label}: companies by ${sizeLabel(sizeBy)}, coloured by their ${periodLabel} move`}
          className="relative w-full overflow-hidden rounded-md bg-background"
          style={{ height }}
          onMouseLeave={() => {
            setPointed(null);
          }}
        >
          {groups.map((group) => (
            <div key={group.group}>
              {group.heading !== null && (
                <button
                  type="button"
                  title={`Show only ${group.group}`}
                  onClick={() => {
                    setSector(group.group);
                  }}
                  className="absolute truncate px-1 text-left text-micro font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  style={place(group.heading, width, height)}
                >
                  {group.group}
                </button>
              )}
              {group.items.map((placed) => {
                const tile = placed.item;
                const move = toNumber(tile.changes[period]);
                const paint = heatPaint(heatShare(move, reach), palette);
                const roomy =
                  placed.width >= ROOM_FOR_MOVE.width && placed.height >= ROOM_FOR_MOVE.height;
                const named =
                  placed.width >= ROOM_FOR_SYMBOL.width && placed.height >= ROOM_FOR_SYMBOL.height;
                const show = (): void => {
                  setPointed({ tile, at: placed });
                };
                return (
                  <Link
                    key={tile.instrument_key}
                    to={linkTo(tile)}
                    viewTransition
                    aria-label={`${tile.symbol}, ${tile.name}: ${formatPercent(tile.changes[period])} over ${periodLabel}`}
                    onMouseEnter={show}
                    onFocus={show}
                    onBlur={() => {
                      setPointed(null);
                    }}
                    className={cn(
                      "absolute flex flex-col items-center justify-center overflow-hidden border border-background text-center leading-tight outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-foreground",
                      !matches(tile) && "opacity-25",
                      letters !== "" && matches(tile) && "z-10 ring-2 ring-foreground",
                    )}
                    style={{
                      ...place(placed, width, height),
                      backgroundColor: paint.fill,
                      color: paint.ink,
                    }}
                  >
                    {named && (
                      <span
                        className={cn(
                          "max-w-full truncate px-0.5 font-semibold",
                          roomy && placed.width > 120 ? "text-sm" : "text-micro",
                        )}
                      >
                        {tile.symbol}
                      </span>
                    )}
                    {roomy && (
                      <span className="tabular text-micro">
                        {formatPercent(tile.changes[period])}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
          {pointed !== null && (
            <TileCard
              tile={pointed.tile}
              at={pointed.at}
              width={width}
              height={height}
              period={period}
            />
          )}
        </div>
      )}

      {tiles !== null && drawn.shown.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <Legend reach={reach} palette={palette} />
          <span>
            {drawn.shown.length < drawn.within - drawn.unsized
              ? `The ${formatCount(drawn.shown.length)} largest of ${formatCount(drawn.within)}. `
              : `${formatCount(drawn.shown.length)} companies. `}
            {drawn.unsized > 0 &&
              sizeBy !== "equal" &&
              `${formatCount(drawn.unsized)} without a ${sizeLabel(sizeBy)} left out. `}
            Sized by {sizeLabel(sizeBy)}; choose a sector&apos;s name to see it alone.
          </span>
        </div>
      )}
    </div>
  );
}

/** A period by its key; the day when the key is not one. */
function periodOf(key: PeriodKey): HeatPeriod<PeriodKey> {
  return PERIODS.find((one) => one.key === key) ?? DAY;
}

/**
 * A tile's size under the chosen measure.
 *
 * @param tile - The company.
 * @param sizeBy - What size stands for.
 * @returns The size, or null when the company has none on record.
 */
function sizeOf(tile: HeatmapTile, sizeBy: SizeBy): number | null {
  if (sizeBy === "equal") {
    return 1;
  }
  return toNumber(sizeBy === "market_cap" ? tile.market_cap : tile.traded_value);
}

/** What a size stands for, in words. */
function sizeLabel(sizeBy: SizeBy): string {
  return sizeBy === "market_cap"
    ? "market capitalisation"
    : sizeBy === "traded_value"
      ? "traded value"
      : "company, each counting once";
}

/** A rectangle laid out in pixels, placed in percentages of the map. */
function place(rect: Rect, width: number, height: number): React.CSSProperties {
  return {
    left: `${String((rect.x / width) * 100)}%`,
    top: `${String((rect.y / height) * 100)}%`,
    width: `${String((rect.width / width) * 100)}%`,
    height: `${String((rect.height / height) * 100)}%`,
  };
}

/**
 * One company's figures beside its tile, turned inwards near an edge so
 * it never leaves the map.
 */
function TileCard({
  tile,
  at,
  width,
  height,
  period,
}: {
  tile: HeatmapTile;
  at: Rect;
  width: number;
  height: number;
  period: PeriodKey;
}): React.JSX.Element {
  const right = at.x + at.width / 2 > width / 2;
  const below = at.y + at.height / 2 < height / 2;
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 w-60 rounded-md border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
      style={{
        ...(right
          ? { right: `${String(((width - at.x) / width) * 100)}%` }
          : { left: `${String(((at.x + at.width) / width) * 100)}%` }),
        ...(below
          ? { top: `${String((at.y / height) * 100)}%` }
          : { bottom: `${String(((height - at.y - at.height) / height) * 100)}%` }),
      }}
    >
      <div className="font-semibold">{tile.symbol}</div>
      <div className="mb-2 truncate text-muted-foreground">{tile.name}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Sector</dt>
        <dd className="truncate text-right">{tile.sector ?? NO_SECTOR}</dd>
        <dt className="text-muted-foreground">Price</dt>
        <dd className="text-right tabular">{formatPrice(tile.close)}</dd>
        {PERIODS.map((one) => (
          <div key={one.key} className="contents">
            <dt className={cn("text-muted-foreground", one.key === period && "font-semibold")}>
              {one.label}
            </dt>
            <dd className="text-right">
              <Delta value={tile.changes[one.key]} />
            </dd>
          </div>
        ))}
        <dt className="text-muted-foreground">Market cap</dt>
        <dd className="text-right tabular">{formatCrore(tile.market_cap)}</dd>
        <dt className="text-muted-foreground">Traded</dt>
        <dd className="text-right tabular">{formatCrore(tile.traded_value)}</dd>
      </dl>
    </div>
  );
}

/** The colour scale: full fall, flat and full rise, with the reach written. */
function Legend({
  reach,
  palette,
}: {
  reach: number;
  palette: ReturnType<typeof heatPalette>;
}): React.JSX.Element {
  const stops = [-1, -0.5, 0, 0.5, 1].map((share) => heatPaint(share, palette).fill);
  return (
    <span className="flex items-center gap-2">
      <span className="tabular">-{reach}%</span>
      <span
        aria-hidden="true"
        className="h-2 w-40 rounded-full"
        style={{ backgroundImage: `linear-gradient(to right, ${stops.join(", ")})` }}
      />
      <span className="tabular">+{reach}%</span>
    </span>
  );
}

/** The same companies as a table, for reading figures rather than shapes. */
function HeatmapTable({
  tiles,
  period,
  linkTo,
}: {
  tiles: HeatmapTile[];
  period: PeriodKey;
  linkTo: (tile: HeatmapTile) => string;
}): React.JSX.Element {
  const { label } = periodOf(period);
  const columns = useMemo<Column<HeatmapTile>[]>(
    () => [
      symbolColumn((row) => row),
      nameColumn((row) => row),
      {
        id: "sector",
        header: "Sector",
        accessorFn: (row) => row.sector ?? NO_SECTOR,
        cell: ({ row }) => row.original.sector ?? NO_SECTOR,
      },
      {
        id: "change",
        header: label,
        accessorFn: (row) => toNumber(row.changes[period]) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => <Delta value={row.original.changes[period]} />,
        meta: { align: "right" },
      },
      {
        id: "market_cap",
        header: "Market cap (₹ cr)",
        accessorFn: (row) => toNumber(row.market_cap) ?? Number.NEGATIVE_INFINITY,
        cell: ({ row }) => {
          const cap = toNumber(row.original.market_cap);
          return cap === null ? ABSENT : formatWhole(cap);
        },
        meta: { align: "right" },
      },
      {
        id: "traded_value",
        header: "Traded (₹ cr)",
        accessorFn: (row) => Number(row.traded_value),
        cell: ({ row }) => Number(row.original.traded_value).toFixed(2),
        meta: { align: "right" },
      },
    ],
    [label, period],
  );
  return (
    <DataTable
      columns={columns}
      rows={tiles}
      empty="Nothing to show"
      label="Companies on the map"
      full
      maxHeight="32rem"
      linkTo={linkTo}
    />
  );
}

/**
 * Whether an element is the one shown full screen, kept current.
 *
 * @param element - The element that may be.
 * @returns Whether it is.
 */
function useFullscreen(element: HTMLElement | null): boolean {
  const [full, setFull] = useState(false);
  useEffect(() => {
    const changed = (): void => {
      setFull(element !== null && document.fullscreenElement === element);
    };
    document.addEventListener("fullscreenchange", changed);
    return () => {
      document.removeEventListener("fullscreenchange", changed);
    };
  }, [element]);
  return full;
}
