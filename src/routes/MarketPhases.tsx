/**
 * The market's phase: read by rule, judged by the reader, kept as a journal.
 *
 * The owner asked how to tell a reversal, a bull run, a weakening and a
 * decline apart, on a page mixing automation and their own assessment
 * (2026-10-16). The platform names each session's phase by five rules on
 * the Nifty 50's trend and large companies' breadth, and reads a checklist
 * off the same measures; the reader overrides any signal, records a call
 * with a note, and the journal keeps both readings side by side. Start
 * today, on the Strategies page, opens on their latest call.
 */

import { Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { type PhaseCall, deletePhaseCall, fetchMarketPhase, fetchPhaseCalls } from "@/api/client";
import { Callout } from "@/components/Callout";
import { type Column, DataTable } from "@/components/DataTable";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { PhaseCallForm } from "@/components/PhaseCallForm";
import { PhaseHistory } from "@/components/PhaseHistory";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { formatDay, formatSince } from "@/lib/format";
import { PHASE_TERMS } from "@/lib/strategyTerms";
import { PHASES, phaseLabel } from "@/lib/marketPhases";
import { PATHS } from "@/lib/paths";

/**
 * The journal's columns, with a way to delete an entry.
 *
 * @param remove - Deletes a call by its number.
 * @returns The columns.
 */
function journalColumns(remove: (callId: number) => void): Column<PhaseCall>[] {
  return [
    {
      id: "as_of",
      header: "Session",
      accessorFn: (row) => row.as_of,
      cell: ({ row }) => formatDay(row.original.as_of),
      meta: { hint: PHASE_TERMS.session },
    },
    {
      id: "phase",
      header: "Your call",
      accessorFn: (row) => row.phase,
      cell: ({ row }) => <Badge>{phaseLabel(row.original.phase)}</Badge>,
      meta: { hint: PHASE_TERMS.yourCall },
    },
    {
      id: "data_phase",
      header: "The data read",
      accessorFn: (row) => row.data_phase ?? "",
      cell: ({ row }) => <Badge variant="outline">{phaseLabel(row.original.data_phase)}</Badge>,
      meta: { hint: PHASE_TERMS.dataRead },
    },
    {
      id: "note",
      header: "Why",
      accessorFn: (row) => row.note,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.note === "" ? "-" : row.original.note}</span>
      ),
      meta: { hint: PHASE_TERMS.why },
    },
    {
      id: "made_at",
      header: "Recorded",
      accessorFn: (row) => row.made_at,
      cell: ({ row }) => formatSince(row.original.made_at),
      meta: { hint: PHASE_TERMS.recorded },
    },
    {
      id: "remove",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete the call of ${formatDay(row.original.as_of)}`}
          onClick={() => {
            remove(row.original.call_id);
          }}
        >
          <Trash2 aria-hidden />
        </Button>
      ),
    },
  ];
}

/**
 * Render the page.
 *
 * @returns The reading, the checklist and call, the journal, the history and the rules.
 */
export function MarketPhases(): React.JSX.Element {
  const view = useResource(fetchMarketPhase);
  const calls = useResource(fetchPhaseCalls);
  const { reload } = calls;
  const remove = useCallback(
    (callId: number) => {
      void deletePhaseCall(callId).then(reload);
    },
    [reload],
  );

  if (view.error !== null) {
    return <Failed message={view.error} />;
  }
  const reading = view.data?.reading ?? null;
  const words = PHASES.find((one) => one.key === reading?.phase);
  const lastCall = calls.data?.[0] ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Market phase"
        description="Five phases, each read by rule from the Nifty 50's trend and how many large companies take part. Check the signals, override what you read differently, and record your own call: the journal keeps yours beside the data's."
      />
      <section aria-label="Today" className="space-y-3">
        <SectionHeader
          title="Today"
          description="What the five rules read on the latest session. A session can fit none of them, when the market's trend and breadth disagree."
        />
        {view.loading && view.data === null ? (
          <p className="text-sm text-muted-foreground">Reading the market...</p>
        ) : reading === null ? (
          <Callout tone="info">
            No phase is read yet: the platform reads every session's phase once its backtester has
            read the history.
          </Callout>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              The data reads, on {formatDay(reading.as_of)}
            </p>
            <p className="text-page font-semibold">{phaseLabel(reading.phase)}</p>
            <p className="text-sm">
              {words?.summary ??
                "This session fits none of the five rules: the signals below are mixed."}
            </p>
            <p className="text-sm">
              <Link
                to={`${PATHS.strategies}?phase=${lastCall?.phase ?? reading.phase ?? "bottoming"}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                Which strategy did best when started in{" "}
                {phaseLabel(lastCall?.phase ?? reading.phase)}
              </Link>
            </p>
          </div>
        )}
      </section>
      {view.data !== null && (
        <section aria-label="Signals and your call" className="space-y-3">
          <SectionHeader
            title="Signals and your call"
            description="Each signal read from the latest session, with its verdict. Change any you read differently, then record the phase as you call it."
          />
          <PhaseCallForm
            view={view.data}
            lastCall={lastCall?.phase ?? null}
            onRecorded={calls.reload}
          />
        </section>
      )}
      <section aria-label="Your journal" className="space-y-3">
        <SectionHeader
          title="Your journal"
          description="Your calls, the latest first, beside what the data read that session."
        />
        <DataTable
          columns={journalColumns(remove)}
          rows={calls.data ?? []}
          loading={calls.loading}
          label="Your calls"
          empty="No call recorded yet"
        />
      </section>
      {view.data !== null && (
        <section aria-label="History" className="space-y-3">
          <SectionHeader
            title="The phases over the years"
            description="Every session as the rules read it. The turn from a fall to a rise is often short; a broad rise can last years."
          />
          <PhaseHistory spells={view.data.spells} />
        </section>
      )}
      {view.data !== null && (
        <section aria-label="The rules" className="space-y-3">
          <SectionHeader
            title="The rules"
            description="Breadth here is the share of companies worth Rs 5,000 crore or more above their own average: counted across every company, history holding only survivors reads too high before 2018."
          />
          <ul className="space-y-2">
            {PHASES.map(({ key, label, summary }) => {
              const rule = view.data?.rules.find((one) => one.phase === key);
              return (
                <li key={key} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-sm">{summary}</p>
                  {rule !== undefined && (
                    <details className="mt-1 text-sm">
                      <summary className="cursor-pointer text-muted-foreground">
                        The exact rule
                      </summary>
                      <p className="mt-1">{rule.words}.</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        In a strategy:{" "}
                        <code className="font-mono">{`when = "${rule.series}"`}</code>
                      </p>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
