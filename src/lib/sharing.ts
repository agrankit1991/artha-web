/**
 * What a share card needs from the platform that the page does not already hold.
 */

import { fetchSeries } from "@/api/client";

/** A month of sessions. */
const MONTH = 22;

/**
 * The last month's closes of one instrument, oldest first.
 *
 * @param instrumentKey - The instrument.
 * @returns The closes; none when the instrument has no series.
 */
export async function monthOfCloses(instrumentKey: string): Promise<number[]> {
  const series = await fetchSeries([instrumentKey], MONTH);
  return (series[0]?.points ?? []).map((point) => Number(point.close));
}
