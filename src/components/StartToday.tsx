/**
 * Which strategy to start in today's market: every saved strategy's past starts in a phase.
 *
 * The owner asked which strategy to start now, and for one that suits their
 * own reading of the market (2026-10-16). A backtest's record is one start,
 * years ago; the platform also follows every past start in each market
 * phase for three, six or twelve months, and counts each episode of a
 * phase once, so ten bottoms say ten things however long each lasted.
 *
 * The section opens on the reader's own latest call (the Market phase
 * page), else on the phase the data reads. Its choices live in the address
 * (`?phase=`, `?months=`, `?outcome=`), so a reading can be bookmarked.
 *
 * It opens best balanced first, the owner's order for every list of
 * strategies (2026-10-17): the median return per point of the worst
 * episode's loss. Beside it is the lead over a basket of every liquid
 * company started the same days: the history holds only the companies that
 * survived, and that basket shares the flattery, so the lead is the honest
 * figure. "If
 * the market rose" and "if it fell" split the episodes by what came next,
 * which no one knows when starting: they answer "if my call is right" and
 * "if it is wrong", never "what will happen".
 */

import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";

import {
  type MarketPhase,
  type PhaseStarts,
  type StrategyPhaseStarts,
  fetchMarketPhase,
  fetchPhaseCalls,
  fetchPhaseStrategies,
} from "@/api/client";
import { Callout } from "@/components/Callout";
import { Chooser } from "@/components/Chooser";
import { type Column, DataTable } from "@/components/DataTable";
import { Delta } from "@/components/Delta";
import { Failed } from "@/components/Failed";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { useResource } from "@/hooks/useResource";
import { useSearchParam } from "@/hooks/useSearchParam";
import { ratio } from "@/lib/backtestFigures";
import { byBalance } from "@/lib/balance";
import { ABSENT, formatDay, formatPercentagePoints, formatPercentTenths } from "@/lib/format";
import {
  HORIZON_MONTHS,
  PHASES,
  STYLES,
  phaseLabel,
  riskBand,
  riskLabel,
} from "@/lib/marketPhases";
import { PATHS, strategyPath } from "@/lib/paths";

/** Which episodes a reader reads: every one, or only those after which the market rose or fell. */
type Outcome = "every" | "rose" | "fell";

const OUTCOMES: readonly { key: Outcome; label: string }[] = [
  { key: "every", label: "Whatever came next" },
  { key: "rose", label: "If the market rose" },
  { key: "fell", label: "If it fell" },
];

/** A strategy's starts as one row reads them, for the outcome chosen. */
interface Ranked {
  strategy: StrategyPhaseStarts;
  starts: PhaseStarts;
}

function growth(value: number | null): React.ReactNode {
  return value === null ? ABSENT : <Delta value={String(value)} format={formatPercentTenths} />;
}

const COLUMNS: Column<Ranked>[] = [
  {
    id: "name",
    header: "Strategy",
    accessorFn: (row) => row.strategy.name,
    cell: ({ row }) => <span className="font-medium">{row.original.strategy.name}</span>,
  },
  {
    id: "style",
    header: "Style",
    accessorFn: (row) => STYLES[row.strategy.style],
    cell: ({ row }) => <Badge variant="outline">{STYLES[row.original.strategy.style]}</Badge>,
  },
  {
    id: "risk",
    header: "Risk",
    accessorFn: (row) => Math.abs(row.strategy.max_drawdown ?? 0),
    cell: ({ row }) => (
      <Badge variant="outline">{riskLabel(riskBand(row.original.strategy.max_drawdown))}</Badge>
    ),
  },
  {
    id: "balance",
    header: "Balance",
    accessorFn: (row) => row.starts.balance,
    cell: ({ row }) => (
      <span
        title="The median return per point of the worst episode's loss: high only if it did well and its worst start was mild."
        className="tabular"
      >
        {ratio(row.original.starts.balance)}
      </span>
    ),
    meta: { align: "right" },
  },
  {
    id: "excess",
    header: "Lead over the basket",
    accessorFn: (row) => row.starts.excess,
    cell: ({ row }) =>
      row.original.starts.excess === null ? (
        ABSENT
      ) : (
        <Delta value={String(row.original.starts.excess)} format={formatPercentagePoints} />
      ),
    meta: { align: "right", emphasis: true },
  },
  {
    id: "growth",
    header: "Median return",
    accessorFn: (row) => row.starts.growth,
    cell: ({ row }) => growth(row.original.starts.growth),
    meta: { align: "right" },
  },
  {
    id: "worst",
    header: "Worst episode",
    accessorFn: (row) => row.starts.worst,
    cell: ({ row }) => growth(row.original.starts.worst),
    meta: { align: "right" },
  },
  {
    id: "beaten",
    header: "Beat the basket",
    accessorFn: (row) => row.starts.beaten,
    cell: ({ row }) => {
      const { beaten, episodes } = row.original.starts;
      return beaten === null
        ? ABSENT
        : `${String(Math.round((beaten / 100) * episodes))} of ${String(episodes)}`;
    },
    meta: { align: "right" },
  },
];

interface StartTodayProps {
  /** The strategies the page's category filters let through, by number; null lets every one. */
  shown: ReadonlySet<number> | null;
}

/**
 * Draw the section.
 *
 * @param props - Which strategies the page's filters show.
 * @returns The phase and horizon to choose, and the strategies ranked for them.
 */
export function StartToday({ shown }: StartTodayProps): React.JSX.Element {
  const [askedPhase, setPhase] = useSearchParam("phase");
  const [askedMonths, setMonths] = useSearchParam("months", "6");
  const [askedOutcome, setOutcome] = useSearchParam("outcome", "every");
  const market = useResource(fetchMarketPhase);
  const calls = useResource(fetchPhaseCalls);

  const latestCall = calls.data?.[0] ?? null;
  const reading = market.data?.reading ?? null;
  const phase: MarketPhase =
    PHASES.find((one) => one.key === askedPhase)?.key ??
    latestCall?.phase ??
    reading?.phase ??
    "bottoming";
  const months = HORIZON_MONTHS.find((one) => String(one) === askedMonths) ?? 6;
  const outcome = OUTCOMES.find((one) => one.key === askedOutcome)?.key ?? "every";

  const fetcher = useCallback(() => fetchPhaseStrategies(phase, months), [phase, months]);
  const review = useResource(fetcher);

  const rows = useMemo(() => {
    const ranked: Ranked[] = [];
    for (const strategy of review.data?.strategies ?? []) {
      const starts = strategy[outcome];
      if (
        starts !== null &&
        starts.episodes > 0 &&
        (shown === null || shown.has(strategy.strategy_id))
      ) {
        ranked.push({ strategy, starts });
      }
    }
    return byBalance(ranked, (row) => row.starts.balance);
  }, [review.data, outcome, shown]);
  const unmeasured = (review.data?.strategies ?? []).filter((one) => one.every === null).length;
  const words = PHASES.find((one) => one.key === phase);
  const basket = review.data?.market ?? null;

  return (
    <section aria-label="Start today" className="space-y-4">
      <SectionHeader
        title="Start today"
        description="Which strategy did best when started in a market like this one, best balanced first: its median return per point of its worst episode's loss. Every past episode of the phase counts once, beside a basket of every liquid company started the same days."
      />
      <p className="text-sm text-muted-foreground">
        The data reads{" "}
        <Badge variant="secondary">
          {market.loading ? "..." : phaseLabel(reading?.phase ?? null)}
        </Badge>
        {reading !== null && <> on {formatDay(reading.as_of)}</>}
        {latestCall !== null ? (
          <>
            ; your call on {formatDay(latestCall.as_of)} was{" "}
            <Badge variant="secondary">{phaseLabel(latestCall.phase)}</Badge>
          </>
        ) : (
          <>; you have not recorded a call yet</>
        )}
        .{" "}
        <Link to={PATHS.marketPhase} className="text-primary underline-offset-4 hover:underline">
          Read the signals and record your call
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Chooser
          label="Market phase"
          options={PHASES.map(({ key, label }) => ({ key, label }))}
          chosen={phase}
          onChange={setPhase}
        />
        <Chooser
          label="Followed for"
          options={HORIZON_MONTHS.map((one) => ({
            key: String(one),
            label: `${String(one)} months`,
          }))}
          chosen={String(months)}
          onChange={setMonths}
        />
        <Chooser label="Which episodes" options={OUTCOMES} chosen={outcome} onChange={setOutcome} />
      </div>
      {words !== undefined && <p className="text-sm">{words.summary}</p>}
      {basket !== null && (
        <p className="text-sm text-muted-foreground">
          {String(basket.episodes)} past {basket.episodes === 1 ? "episode" : "episodes"}
          {basket.listed[0] === undefined ? "" : ` since ${basket.listed[0].first.slice(0, 4)}`}.
          Over {String(months)} months the median start returned{" "}
          {basket.benchmark === null ? ABSENT : formatPercentTenths(String(basket.benchmark))} on
          the Nifty 500 and{" "}
          {basket.yardstick === null ? ABSENT : formatPercentTenths(String(basket.yardstick))} on
          the liquid basket.
        </p>
      )}
      {outcome !== "every" && (
        <Callout tone="info">
          Split by what the Nifty 500 did over the {String(months)} months that followed, which
          nobody knows when starting: read it as what each strategy did when the call turned out{" "}
          {outcome === "rose" ? "right" : "wrong"}.
        </Callout>
      )}
      {review.error !== null ? (
        <Failed message={review.error} />
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          loading={review.loading}
          linkTo={(row) => strategyPath(row.strategy.strategy_id)}
          label="Strategies for this phase"
          empty="No strategy has a past start in this phase yet"
        />
      )}
      {unmeasured > 0 && (
        <p className="text-sm text-muted-foreground">
          {String(unmeasured)} {unmeasured === 1 ? "strategy has" : "strategies have"} no starts
          measured: their latest backtest ran before starts by phase were. Run them again to include
          them.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        History before September 2026 holds only the companies that survived, so every return is
        optimistic; the lead over the basket, drawn from the same history, is the figure to trust.
      </p>
    </section>
  );
}
