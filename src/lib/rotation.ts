/**
 * The arithmetic of a rotation replayed over time: which sectors stand
 * where on a chosen session, how far the axes reach across every session,
 * and the path a sector took to its place.
 *
 * Kept apart from the chart so it can be tested as arithmetic. The axes
 * are fixed across the whole span on purpose: rescaled to each session, a
 * quiet day would look as spread as a wild one, and a dot would seem to
 * move when only the axes had.
 */

import type { SectorRotation } from "@/api/client";
import { toNumber } from "@/lib/format";
import { populationPath } from "@/lib/paths";

/** One group on the rotation chart. */
export interface RotationPoint {
  name: string;
  /** Its own page. */
  href: string;
  /** Its return over the past week, in per cent. */
  week: number;
  /** Its return over the past month, in per cent. */
  month: number;
  /** How many companies it rests on, which sizes its dot. */
  companies: number;
}

/** Where a sector stood on one session, week up and month across. */
export interface RotationStep {
  week: number;
  month: number;
}

/** How far each axis reaches either side of nought, in per cent. */
export interface RotationReach {
  month: number;
  week: number;
}

/**
 * Every sector on one session, as the chart plots it.
 *
 * @param rotation - Every sector's path.
 * @param at - Which session, by its place in `days`.
 * @param plottedFrom - The fewest members measured that day for a sector
 *   to be plotted: the median of a few swings too far to read.
 * @returns The points, sized by the members measured that day.
 */
export function rotationPoints(
  rotation: SectorRotation,
  at: number,
  plottedFrom: number,
): RotationPoint[] {
  return rotation.sectors.flatMap((path): RotationPoint[] => {
    const step = stepOf(path, at, plottedFrom);
    return step === null
      ? []
      : [
          {
            name: path.sector,
            href: populationPath("sector", path.sector),
            week: step.week,
            month: step.month,
            companies: step.measured,
          },
        ];
  });
}

/**
 * How far the axes reach to hold every plotted point of every session.
 *
 * @param rotation - Every sector's path.
 * @param plottedFrom - As for `rotationPoints`.
 * @returns The furthest move each way, a tenth beyond so no dot sits on an
 *   edge, and never under one per cent.
 */
export function rotationReach(rotation: SectorRotation, plottedFrom: number): RotationReach {
  let month = 0;
  let week = 0;
  for (const path of rotation.sectors) {
    rotation.days.forEach((_, at) => {
      const step = stepOf(path, at, plottedFrom);
      if (step !== null) {
        month = Math.max(month, Math.abs(step.month));
        week = Math.max(week, Math.abs(step.week));
      }
    });
  }
  return { month: Math.max(month, 1) * 1.1, week: Math.max(week, 1) * 1.1 };
}

/**
 * The path a sector took to where it stands on a session.
 *
 * @param rotation - Every sector's path.
 * @param sector - Which sector.
 * @param at - The session it ends on, by its place in `days`.
 * @param length - How many sessions back it reaches, that one included.
 * @param plottedFrom - As for `rotationPoints`; a session the sector was
 *   not plotted on is left out of its path.
 * @returns Its places, oldest first; none for a sector not in the rotation.
 */
export function rotationTrail(
  rotation: SectorRotation,
  sector: string,
  at: number,
  length: number,
  plottedFrom: number,
): RotationStep[] {
  const path = rotation.sectors.find((one) => one.sector === sector);
  if (path === undefined) {
    return [];
  }
  const steps: RotationStep[] = [];
  for (let back = Math.max(0, at - length + 1); back <= at; back += 1) {
    const step = stepOf(path, back, plottedFrom);
    if (step !== null) {
      steps.push({ week: step.week, month: step.month });
    }
  }
  return steps;
}

/**
 * A sector's place on one session and the members it rests on, or null
 * where it is not plotted. A place outside `days` reads as unmeasured.
 */
function stepOf(
  path: SectorRotation["sectors"][number],
  at: number,
  plottedFrom: number,
): (RotationStep & { measured: number }) | null {
  const week = toNumber(path.week[at] ?? null);
  const month = toNumber(path.month[at] ?? null);
  const measured = path.measured[at] ?? 0;
  return week === null || month === null || measured < plottedFrom
    ? null
    : { week, month, measured };
}
