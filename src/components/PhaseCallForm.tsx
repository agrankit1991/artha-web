/**
 * The checklist and the reader's own call: automation and judgement on one card.
 *
 * The owner asked for a page mixing automation and manual assessment in
 * identifying the trend (2026-10-16), and chose a checklist of signals,
 * each read automatically with a verdict they can override, and a call of
 * their own with a note, kept as a journal (the Market phase page). The
 * verdicts recorded with a call are the automatic ones with the reader's
 * overrides laid over them, so the journal keeps what they judged.
 */

import { useState } from "react";

import {
  type MarketPhase,
  type MarketPhaseView,
  type SignalKey,
  type Verdict,
  recordPhaseCall,
} from "@/api/client";
import { Chooser } from "@/components/Chooser";
import { Failed } from "@/components/Failed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PHASES, SIGNALS, VERDICTS, VERDICT_ORDER } from "@/lib/marketPhases";

interface PhaseCallFormProps {
  view: MarketPhaseView;
  /** The phase the reader called last, to start from; null before their first call. */
  lastCall: MarketPhase | null;
  /** Told once a call is kept, to read the journal again. */
  onRecorded: () => void;
}

/**
 * Draw the checklist and the call.
 *
 * @param props - The reading, the last call and what to do once one is kept.
 * @returns Each signal with its verdict and an override, then the call.
 */
export function PhaseCallForm({
  view,
  lastCall,
  onRecorded,
}: PhaseCallFormProps): React.JSX.Element {
  const [overrides, setOverrides] = useState<Partial<Record<SignalKey, Verdict>>>({});
  const [phase, setPhase] = useState<MarketPhase>(lastCall ?? view.reading?.phase ?? "bottoming");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const reading = view.reading;

  const judged = (key: SignalKey, automatic: Verdict): Verdict => overrides[key] ?? automatic;

  const record = (): void => {
    setSaving(true);
    setFailure(null);
    const verdicts = Object.fromEntries(
      view.signals.map((one) => [one.key, judged(one.key, one.verdict)]),
    );
    recordPhaseCall({ phase, note, verdicts })
      .then(() => {
        setNote("");
        setOverrides({});
        onRecorded();
      })
      .catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : "The call was not kept");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const counted = VERDICT_ORDER.map(
    (verdict) =>
      [
        verdict,
        view.signals.filter((one) => judged(one.key, one.verdict) === verdict).length,
      ] as const,
  );

  return (
    <div className="space-y-4">
      {reading !== null && (
        <ul className="divide-y rounded-lg border" aria-label="Signals">
          {view.signals.map((signal) => {
            const words = SIGNALS[signal.key];
            const overridden =
              overrides[signal.key] !== undefined && overrides[signal.key] !== signal.verdict;
            return (
              <li
                key={signal.key}
                className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">
                    {words.label}{" "}
                    <Badge variant={overridden ? "outline" : "secondary"}>
                      {overridden ? `Read ${VERDICTS[signal.verdict]}` : VERDICTS[signal.verdict]}
                    </Badge>
                  </p>
                  <p className="tabular text-sm">{words.reads(signal, view.flow_sessions)}</p>
                  <p className="text-xs text-muted-foreground">{words.meaning}</p>
                </div>
                <Chooser
                  label={`Your view of ${words.label}`}
                  options={VERDICT_ORDER.map((key) => ({ key, label: VERDICTS[key] }))}
                  chosen={judged(signal.key, signal.verdict)}
                  onChange={(key) => {
                    setOverrides((current) => ({ ...current, [signal.key]: key }));
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">
        As you judge them:{" "}
        {counted
          .map(([verdict, count]) => `${String(count)} ${VERDICTS[verdict].toLowerCase()}`)
          .join(", ")}
        .
      </p>
      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Your call</p>
        <Chooser
          label="Your call of the phase"
          options={PHASES.map(({ key, label }) => ({ key, label }))}
          chosen={phase}
          onChange={setPhase}
        />
        <label className="block text-sm">
          <span className="text-muted-foreground">Why, in your words</span>
          <textarea
            aria-label="Why"
            value={note}
            rows={2}
            maxLength={2000}
            placeholder="Breadth turning, bottom in"
            onChange={(event) => {
              setNote(event.target.value);
            }}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <Button size="sm" onClick={record} disabled={saving}>
          {saving ? "Recording..." : "Record my call"}
        </Button>
        {failure !== null && <Failed message={failure} />}
      </div>
    </div>
  );
}
