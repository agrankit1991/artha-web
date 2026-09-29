/**
 * The strategy behind a screen, above the rows it picks from.
 *
 * Shown whenever the screener's address names a strategy's scan. The
 * panel stays when the screen is changed -- a threshold nudged, the order
 * reversed, one index chosen -- but says the rows are no longer the
 * strategy's candidates and offers its screen back. Keeping it is what
 * lets a reader experiment and return; saying so is what keeps a changed
 * screen from passing for the strategy.
 *
 * A rule that needs one session's delivery (the surge) also says when a
 * row's delivery is from another session than its figures, which it is
 * every evening until the delivery file is read: those rows are not
 * signals yet, whatever the screen says.
 */

import { Undo2 } from "lucide-react";

import { Callout } from "@/components/Callout";
import type { ScreenField, ScreenHit } from "@/api/client";
import { HowItWorks } from "@/components/HowItWorks";
import { MarketSwitch } from "@/components/MarketSwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/format";
import {
  type OffSessionDelivery,
  type StrategyScan,
  deliveryFromAnotherSession,
} from "@/lib/scans";

interface StrategyPanelProps {
  scan: StrategyScan;
  /** Whether the screen still asks exactly what the strategy's scan asks. */
  unchanged: boolean;
  /** The screener's registry, for the market switch's reading; null while it loads. */
  fields: ScreenField[] | null;
  /** The rows shown below; empty while they load. */
  hits: readonly ScreenHit[];
  /** Put the strategy's own screen back. */
  onRestore: () => void;
}

/**
 * Render the panel.
 *
 * @param props - The strategy, whether its screen is intact, the rows it
 *   stands over, and how to restore its screen.
 * @returns The panel.
 */
export function StrategyPanel({
  scan,
  unchanged,
  fields,
  hits,
  onRestore,
}: StrategyPanelProps): React.JSX.Element {
  const { strategy } = scan;
  const offSession = deliveryFromAnotherSession(scan, hits);
  return (
    <section aria-label="Strategy" className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{scan.label}</h2>
        <Badge variant="outline" className="font-mono">
          {strategy.id}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{strategy.headline}</p>

      {unchanged ? (
        <>
          <p className="rounded-md bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium">What it holds from the rows below: </span>
            {strategy.rowsHeld}
          </p>
          {offSession.length > 0 && (
            <Callout tone="info" role="status">
              {notYetSignals(offSession, hits.length)}
            </Callout>
          )}
        </>
      ) : (
        <Callout
          tone="info"
          role="status"
          action={
            <Button variant="outline" size="sm" onClick={onRestore}>
              <Undo2 aria-hidden="true" className="mr-1 h-4 w-4" />
              Restore the strategy&apos;s screen
            </Button>
          }
        >
          The screen has been changed from the strategy&apos;s, so the rows below are not its
          candidates.
        </Callout>
      )}

      {strategy.howItWorks.marketSwitch !== undefined && <MarketSwitch fields={fields} />}
      <HowItWorks rules={strategy.howItWorks} />
    </section>
  );
}

/**
 * Say which rows were screened on another session's delivery.
 *
 * @param offSession - Those rows, at least one.
 * @param shown - How many rows are shown in all.
 * @returns A sentence naming the rows, or all of them, and the sessions.
 */
function notYetSignals(offSession: OffSessionDelivery[], shown: number): string {
  const every = offSession.length === shown;
  const days = (dates: string[]): string => [...new Set(dates)].map(formatDay).join(", ");
  const rows = every ? "every row below" : offSession.map((row) => row.symbol).join(", ");
  const verdict = every ? "none of them is a signal yet" : "those rows are not signals yet";
  return `The delivery figure for ${rows} is from ${days(offSession.map((row) => row.deliveredOn))}, not the session of ${days(offSession.map((row) => row.session))}, so ${verdict}. A session's delivery arrives late in the evening, and a company with none published keeps an earlier session's for up to five sessions.`;
}
