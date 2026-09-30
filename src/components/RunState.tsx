/**
 * Where a strategy's latest backtest stands: not run, queued, running, done
 * or failed.
 *
 * The strategies list said it in plain text; the strategy's page said it in
 * boxes of its own. One badge now, with an icon and its word, so the state
 * never rests on colour: teal while the backtester works, the error colour
 * for a failure (never a fall's red, which means a price went down), and
 * neutral otherwise.
 */

import { CheckCircle2, CircleDashed, Clock, Loader2, XCircle } from "lucide-react";

import type { StrategyRequest } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import type { Icon } from "@/lib/entities";
import { cn } from "@/lib/utils";

/** A run's state, or none for a strategy never run. */
export type RunStateKey = StrategyRequest["status"] | "none";

/** What each state is called, drawn as and tinted. */
const STATES: Record<RunStateKey, { label: string; icon: Icon; tint: string }> = {
  none: { label: "Not run", icon: CircleDashed, tint: "border-border text-muted-foreground" },
  queued: { label: "Queued", icon: Clock, tint: "border-primary/40 text-primary" },
  running: {
    label: "Running",
    icon: Loader2,
    tint: "border-primary/40 bg-primary/10 text-primary [&>svg]:motion-safe:animate-spin",
  },
  done: { label: "Done", icon: CheckCircle2, tint: "border-border bg-muted text-foreground" },
  failed: {
    label: "Failed",
    icon: XCircle,
    tint: "border-destructive/40 bg-destructive/10 text-destructive",
  },
};

/**
 * Render the badge.
 *
 * @param props - The latest run, or null for a strategy never run.
 * @returns The badge: an icon and the state's name.
 */
export function RunState({ latest }: { latest: StrategyRequest | null }): React.JSX.Element {
  const { label, icon: Mark, tint } = STATES[latest?.status ?? "none"];
  return (
    <Badge variant="outline" className={cn("gap-1", tint)}>
      <Mark aria-hidden="true" className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/**
 * The state's name alone, for sorting a column by it.
 *
 * @param latest - The latest run, or null.
 * @returns The name the badge shows.
 */
export function runStateLabel(latest: StrategyRequest | null): string {
  return STATES[latest?.status ?? "none"].label;
}
