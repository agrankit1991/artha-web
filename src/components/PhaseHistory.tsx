/**
 * The market's phases over the years, as one strip: how long each lasted and what followed.
 *
 * Plain HTML, a band per run of one phase as wide as the sessions it
 * lasted, because a strip of coloured runs needs no axes. The colours are
 * `PHASE_COLOURS`: a rise and a fall in their own colours, narrowing in
 * caution, the turn in two series colours. Every band says its phase and
 * dates on hover, and the latest runs are listed in words, so nothing rests
 * on colour alone.
 */

import { useMemo } from "react";

import type { PhaseSpell } from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { Badge } from "@/components/ui/badge";
import { useSearchParam } from "@/hooks/useSearchParam";
import { PHASE_COLOURS } from "@/lib/chartPalette";
import { formatDay } from "@/lib/format";
import { NO_PHASE, PHASES, phaseLabel } from "@/lib/marketPhases";

const SPANS = [
  { key: "5", label: "5 years" },
  { key: "10", label: "10 years" },
  { key: "all", label: "Everything" },
] as const;

/** How many of the latest runs are listed in words. */
const LISTED = 8;

interface PhaseHistoryProps {
  spells: readonly PhaseSpell[];
}

/**
 * The runs that reach into the span, the first cut at its start.
 *
 * @param spells - Every run, oldest first.
 * @param years - How far back from the last run's end; null for everything.
 * @returns The runs within it.
 */
export function within(spells: readonly PhaseSpell[], years: number | null): PhaseSpell[] {
  const last = spells[spells.length - 1];
  if (years === null || last === undefined) {
    return [...spells];
  }
  const end = new Date(`${last.last}T00:00:00Z`);
  const from = new Date(Date.UTC(end.getUTCFullYear() - years, end.getUTCMonth(), end.getUTCDate()))
    .toISOString()
    .slice(0, 10);
  return spells.filter((one) => one.last >= from);
}

/**
 * Draw the strip, its legend and the latest runs.
 *
 * @param props - Every run of the history.
 * @returns The history.
 */
export function PhaseHistory({ spells }: PhaseHistoryProps): React.JSX.Element {
  const [span, setSpan] = useSearchParam("span", "10");
  const years = span === "all" ? null : Number(span);
  const shown = useMemo(() => within(spells, years), [spells, years]);
  const total = shown.reduce((sum, one) => sum + one.sessions, 0);
  const shares = PHASES.map(({ key, label }) => ({
    key,
    label,
    share:
      total === 0
        ? 0
        : shown.filter((one) => one.phase === key).reduce((sum, one) => sum + one.sessions, 0) /
          total,
  }));
  const first = shown[0];
  const last = shown[shown.length - 1];

  return (
    <div className="space-y-3">
      <Chooser label="Span" options={SPANS} chosen={span} onChange={setSpan} />
      {first !== undefined && last !== undefined && (
        <>
          <div
            role="img"
            aria-label={`The market's phase from ${formatDay(first.first)} to ${formatDay(last.last)}`}
            className="flex h-8 w-full overflow-hidden rounded-md border"
          >
            {shown.map((one) => (
              <div
                key={one.first}
                data-testid="phase-band"
                title={`${phaseLabel(one.phase)}: ${formatDay(one.first)} to ${formatDay(one.last)} (${String(one.sessions)} sessions)`}
                style={{
                  flexGrow: one.sessions,
                  flexBasis: 0,
                  backgroundColor: PHASE_COLOURS[one.phase ?? "none"],
                }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatDay(first.first)}</span>
            <span>{formatDay(last.last)}</span>
          </div>
        </>
      )}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Time in each phase">
        {shares.map(({ key, label, share }) => (
          <li key={key} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-3 rounded-sm"
              style={{ backgroundColor: PHASE_COLOURS[key] }}
            />
            {label}{" "}
            <span className="tabular text-muted-foreground">{`${(share * 100).toFixed(0)}%`}</span>
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-3 rounded-sm"
            style={{ backgroundColor: PHASE_COLOURS.none }}
          />
          {NO_PHASE}
        </li>
      </ul>
      <ol className="space-y-1 text-sm" aria-label="The latest runs">
        {shown
          .slice(-LISTED)
          .reverse()
          .map((one) => (
            <li key={one.first} className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{phaseLabel(one.phase)}</Badge>
              <span className="tabular">
                {formatDay(one.first)} to {formatDay(one.last)}
              </span>
              <span className="text-muted-foreground">{`${String(one.sessions)} sessions`}</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
