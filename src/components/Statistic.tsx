/**
 * One figure with its name and its meaning.
 *
 * A breadth measure is a number nobody can read cold: "+42" and "0.86" say
 * nothing without being told what a high reading would be. So the reading
 * always travels with a phrase saying which way it points, and the phrase
 * is the part written for a human.
 */

import { cn } from "@/lib/utils";

/**
 * Whether a reading is good news, bad news, a caution, or none of those.
 *
 * `warn` exists for the readings that are neither: a market where nearly
 * every company is above its long average is not bad news and is not
 * simply more good news either, and painting it green would say the
 * opposite of what it has historically meant.
 */
export type Tone = "good" | "bad" | "warn" | "neutral";

interface StatisticProps {
  label: string;
  /** The reading, already formatted. */
  value: string;
  /** What the reading means, in words. */
  hint: string;
  tone?: Tone;
  className?: string;
}

const TONES: Record<Tone, string> = {
  good: "text-gain",
  bad: "text-loss",
  warn: "text-caution",
  neutral: "text-foreground",
};

/**
 * Render one measure.
 *
 * @param props - The measure, its reading, and what the reading means.
 * @returns The statistic.
 */
export function Statistic({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: StatisticProps): React.JSX.Element {
  return (
    <div className={cn("space-y-0.5 rounded-lg border p-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("tabular text-xl font-semibold", TONES[tone])}>{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}
