/**
 * The rules a backtest played, strategy by strategy.
 *
 * A playbook of one strategy shows its rules; a playbook of several shows
 * each with the market condition it was played in. Expressions are set in
 * the monospace they were written in, so a reader can copy one back into
 * a strategy file.
 */

import type { BacktestPlay } from "@/api/client";
import { share } from "@/lib/backtestFigures";
import { readRules } from "@/lib/backtestReadings";
import { cn } from "@/lib/utils";

interface BacktestPlaysProps {
  plays: BacktestPlay[];
  /** How often the conditions were read, for a playbook of several. */
  switchCadence: string;
  /** The share of the sessions each play was in force, by name, in percent. */
  played: Record<string, number>;
}

/**
 * Draw the rules.
 *
 * @param props - The plays, how often their conditions were read, and how long each held.
 * @returns One block of rules per play.
 */
export function BacktestPlays({
  plays,
  switchCadence,
  played,
}: BacktestPlaysProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      {plays.length > 1 && (
        <p className="text-sm text-muted-foreground">
          The first play whose condition holds is played, read {switchCadence}; a switch sells what
          the new strategy does not want and buys its picks at the next open.
        </p>
      )}
      {plays.map((play) => (
        <section
          key={play.name}
          aria-label={play.name}
          className="space-y-2 rounded-lg border bg-card p-4"
        >
          <h3 className="text-base font-semibold">{play.name}</h3>
          {play.when !== "1" && (
            <p className="text-sm">
              Played while <code className="font-mono text-xs">{play.when}</code>
            </p>
          )}
          {plays.length > 1 && (
            <p className="text-sm text-muted-foreground">
              In force {share(played[play.name] ?? 0)} of the sessions.
            </p>
          )}
          <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
            {readRules(play.rules).map((rule) => (
              <div key={rule.label} className="contents">
                <dt className="text-muted-foreground">{rule.label}</dt>
                <dd className={cn(rule.expression && "font-mono text-xs leading-6")}>
                  {rule.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
