/**
 * The rotation replayed: the same chart on any of the past three months'
 * sessions, chosen with a slider or played through to the latest.
 *
 * The axes stay fixed across the span (`rotationReach`), so a dot moving
 * is the sector moving and not the scale; pointing at a sector draws the
 * two weeks it took to reach its place. Playing steps a session every fifth
 * of a second and stops at the latest; dragging, or pressing again,
 * pauses. The slider is a native range, so arrow keys step a session and
 * Home and End jump to either end.
 */

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { SectorRotation } from "@/api/client";
import { RotationChart } from "@/components/RotationChart";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/format";
import { rotationPoints, rotationReach, rotationTrail } from "@/lib/rotation";

/** How long each session shows while playing, in milliseconds. */
const STEP_MS = 200;

/** How many sessions a pointed sector's trail reaches back: two weeks. */
const TRAIL = 10;

interface RotationReplayProps {
  /** Every sector's path; at least one session. */
  rotation: SectorRotation;
  /** The fewest members measured on a session for a sector to be plotted on it. */
  plottedFrom: number;
  /** What the plot shows, for a reader who cannot see it. */
  label: string;
}

/**
 * Draw the controls and the chart for the session chosen.
 *
 * @param props - The paths, the plotting threshold and the plot's label.
 * @returns The replay, opening on the latest session.
 */
export function RotationReplay({
  rotation,
  plottedFrom,
  label,
}: RotationReplayProps): React.JSX.Element {
  const last = rotation.days.length - 1;
  const [at, setAt] = useState(last);
  const [playing, setPlaying] = useState(false);
  const reach = useMemo(() => rotationReach(rotation, plottedFrom), [rotation, plottedFrom]);
  const points = useMemo(
    () => rotationPoints(rotation, at, plottedFrom),
    [rotation, at, plottedFrom],
  );

  // One step at a time, scheduled from the step shown, so a pause or a
  // drag cancels the next step rather than racing it.
  useEffect(() => {
    if (!playing || at >= last) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      setAt(at + 1);
      if (at + 1 >= last) {
        setPlaying(false);
      }
    }, STEP_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, at, last]);

  const toggle = (): void => {
    if (playing) {
      setPlaying(false);
      return;
    }
    // From the start again when it has already reached the latest.
    if (at >= last) {
      setAt(0);
    }
    setPlaying(true);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={playing ? "Pause" : "Play through the sessions"}
            onClick={toggle}
          >
            {playing ? <Pause /> : <Play />}
          </Button>
          <input
            type="range"
            min={0}
            max={last}
            step={1}
            value={at}
            aria-label="Session"
            aria-valuetext={formatDay(rotation.days[at])}
            onChange={(event) => {
              setPlaying(false);
              setAt(Number(event.target.value));
            }}
            className="h-2 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <span className="w-32 shrink-0 text-right text-sm font-medium tabular">
            {formatDay(rotation.days[at])}
          </span>
        </div>
        <div
          aria-hidden="true"
          className="flex justify-between pl-11 pr-35 text-micro text-muted-foreground"
        >
          <span>{formatDay(rotation.days[0])}</span>
          <span>Latest</span>
        </div>
      </div>
      <RotationChart
        points={points}
        label={label}
        reach={reach}
        trailOf={(name) => rotationTrail(rotation, name, at, TRAIL, plottedFrom)}
      />
    </div>
  );
}
