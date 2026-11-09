/**
 * India's economy at a glance, each figure from its official publisher: the
 * RBI's weekly forex reserves, and MoSPI's consumer and wholesale prices,
 * industrial output, GDP growth and unemployment. Built 2026-11-09 at the
 * owner's request for data "which tells the health of Indian economy"
 * (`ECONOMY-PLAN.md` beside the repositories).
 *
 * USD/INR is not one of the figures: the official daily rate's publisher
 * (FBIL) guards its site against automated reading, so the page points to
 * the USDINR futures the platform already captures, and says they are futures.
 */

import { Link } from "react-router-dom";

import { type EconomicSeries, fetchEconomy } from "@/api/client";
import { Chart, type Series } from "@/components/Chart";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { StatGrid, StatTile } from "@/components/StatTile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResource } from "@/hooks/useResource";
import { coloured } from "@/lib/chartPalette";
import { amountChange, formatValue, periodLabel, plotted } from "@/lib/economy";
import { PATHS } from "@/lib/paths";

/** The tiles across the top: the one figure of each that says most. */
const HEADLINES = [
  "reserves_total",
  "cpi_inflation",
  "wpi_inflation",
  "iip_growth",
  "gdp_growth",
  "unemployment",
] as const;

/** The charts below, each a few series that belong on one scale. */
const CHARTS: readonly { title: string; codes: readonly string[] }[] = [
  {
    title: "Forex reserves, US$ billion",
    codes: ["reserves_total", "reserves_foreign_currency", "reserves_gold"],
  },
  { title: "Inflation", codes: ["cpi_inflation", "wpi_inflation"] },
  { title: "Industrial growth", codes: ["iip_growth"] },
  { title: "GDP growth", codes: ["gdp_growth", "gdp_growth_nominal"] },
  { title: "Unemployment", codes: ["unemployment"] },
];

const PUBLISHERS: Record<EconomicSeries["publisher"], string> = {
  rbi: "RBI, Weekly Statistical Supplement",
  mospi: "MoSPI",
};

/** Where the USDINR futures are charted: the futures page, on its currency family. */
const USDINR_FUTURES = `${PATHS.futures}?family=CURRENCY&q=USDINR`;

/**
 * The tile for one indicator: its latest figure, and the one before it (`amountChange` says which get a change).
 */
function Headline({
  series,
  loading,
}: {
  series: EconomicSeries | undefined;
  loading: boolean;
}): React.JSX.Element {
  const latest = series?.points.at(-1);
  if (series === undefined || latest === undefined) {
    return (
      <StatTile
        label={series?.name ?? "..."}
        value="-"
        {...(loading ? {} : { hint: "Not collected yet" })}
        loading={loading}
      />
    );
  }
  const before = series.points.at(-2);
  const change = amountChange(series, latest.value, before?.value);
  const earlier =
    before === undefined
      ? ""
      : `; ${periodLabel(series, before.period_end)}: ${formatValue(series, before.value)}`;
  const derived = series.derived ? " (worked out from MoSPI's index)" : "";
  return (
    <StatTile
      label={series.name}
      value={formatValue(series, latest.value)}
      delta={change}
      hint={`${periodLabel(series, latest.period_end)}${earlier}${derived}`}
    />
  );
}

/** One chart of a few series sharing a scale, with what each measures underneath. */
function History({
  title,
  series,
  loading,
}: {
  title: string;
  series: EconomicSeries[];
  loading: boolean;
}): React.JSX.Element {
  const lines: Series[] = coloured(series).map((one) => ({
    kind: "line",
    label: one.name,
    colour: one.colour,
    width: 2,
    points: one.points.map((point) => ({
      time: point.period_end,
      value: plotted(one, point.value),
    })),
  }));
  const percent = series.length > 0 && series.every((one) => one.unit === "percent");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {series.map((one) => (
            <span key={one.code} className="block">
              {one.name}: {one.measure} Source: {PUBLISHERS[one.publisher]}.
            </span>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Chart
          series={lines}
          loading={loading}
          empty="Not collected yet"
          scale={percent ? "percent" : "price"}
        />
      </CardContent>
    </Card>
  );
}

/**
 * The Economy page.
 *
 * @returns The page.
 */
export function Economy(): React.JSX.Element {
  const economy = useResource(fetchEconomy);
  const byCode = new Map((economy.data ?? []).map((series) => [series.code, series]));
  const pick = (codes: readonly string[]): EconomicSeries[] =>
    codes.flatMap((code) => {
      const found = byCode.get(code);
      return found === undefined ? [] : [found];
    });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Economy"
        description="India's official figures: the RBI's weekly forex reserves, and MoSPI's prices, industrial output, GDP growth and unemployment."
      />
      {economy.error !== null && <Failed message={economy.error} />}
      <StatGrid>
        {HEADLINES.map((code) => (
          <Headline key={code} series={byCode.get(code)} loading={economy.loading} />
        ))}
      </StatGrid>
      <Card>
        <CardHeader>
          <CardTitle>USD/INR</CardTitle>
          <CardDescription>
            The official daily rate, FBIL&apos;s reference rate, is not collected: its
            publisher&apos;s site blocks automated reading. The rupee&apos;s futures are captured
            every evening; a future&apos;s price is the rate plus a forward premium, so it runs a
            little above the rate itself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={USDINR_FUTURES} className="text-sm font-medium underline underline-offset-4">
            USDINR futures on NSE and BSE
          </Link>
        </CardContent>
      </Card>
      {CHARTS.map((chart) => (
        <History
          key={chart.title}
          title={chart.title}
          series={pick(chart.codes)}
          loading={economy.loading}
        />
      ))}
    </div>
  );
}
