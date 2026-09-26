/**
 * One strategy: its rules, checked as they are typed; its backtests; and
 * the companies its latest backtest would hold today.
 *
 * A backtest runs in the platform's backtester service, one at a time, on
 * the text as saved when it was asked for -- so running unsaved rules
 * saves them first. While one is queued or running
 * the page asks after it every few seconds.
 *
 * The rules shown are the saved ones until the first keystroke; from then
 * on they are the reader's own, which a status poll reloading the strategy
 * never overwrites.
 */

import { Loader2, Play, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  type StrategyRequest,
  createStrategy,
  deleteStrategy,
  fetchStrategies,
  fetchStrategy,
  runStrategy,
  updateStrategy,
} from "@/api/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import { StrategyEditor } from "@/components/StrategyEditor";
import { StrategyLanguage } from "@/components/StrategyLanguage";
import { StrategyResultPanel } from "@/components/StrategyResult";
import { StrategyRuns } from "@/components/StrategyRuns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { formatSince } from "@/lib/format";
import { PATHS, strategyPath } from "@/lib/paths";
import { STRATEGY_TEMPLATE, combinationTemplate } from "@/lib/strategyTemplates";

/** How often a queued or running backtest is asked after, in milliseconds. */
export const POLL = 5000;

/**
 * Words for a failure, from the platform's own explanation when it gave one.
 *
 * @param failure - What was thrown.
 * @returns The explanation.
 */
function explained(failure: unknown): string {
  return failure instanceof Error ? failure.message : "Something went wrong";
}

/**
 * Render the page for the strategy the address names, or a new one.
 *
 * @returns The page.
 */
export function Strategy(): React.JSX.Element {
  const { id = "new" } = useParams();
  // Keyed, so moving from one strategy to another starts from its own text.
  return id === "new" ? <NewStrategy /> : <SavedStrategy key={id} id={Number(id)} />;
}

/** A strategy not yet saved: a template to start from, and Save. */
function NewStrategy(): React.JSX.Element {
  const navigate = useNavigate();
  const saved = useResource(fetchStrategies);
  const [text, setText] = useState(STRATEGY_TEMPLATE);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      const made = await createStrategy(text);
      void navigate(strategyPath(made.strategy_id));
    } catch (failure) {
      setProblem(explained(failure));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New strategy"
        description="Start from a strategy or a combination of saved ones; its name is the one the text gives. Once saved it can be backtested."
        actions={
          <Button size="sm" disabled={busy} onClick={() => void save()}>
            <Save aria-hidden /> Save
          </Button>
        }
      />
      {problem !== null && (
        <p role="alert" className="text-sm text-loss">
          {problem}
        </p>
      )}
      <section aria-label="Rules" className="space-y-3">
        <SectionHeader
          title="Rules"
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setText(STRATEGY_TEMPLATE);
                }}
              >
                Start from a strategy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setText(combinationTemplate((saved.data ?? []).map((one) => one.name)));
                }}
              >
                Start from a combination
              </Button>
            </div>
          }
        />
        <StrategyEditor text={text} onChange={setText} />
        <StrategyLanguage />
      </section>
    </div>
  );
}

/** A saved strategy: its rules, its latest verdict and picks, and its runs. */
function SavedStrategy({ id }: { id: number }): React.JSX.Element {
  const navigate = useNavigate();
  const load = useCallback(() => fetchStrategy(id), [id]);
  const strategy = useResource(load);
  const [edited, setEdited] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const closeDelete = useCallback(() => {
    setDeleting(false);
  }, []);
  const status = strategy.data?.latest?.status;
  const waiting = status === "queued" || status === "running";

  useEffect(() => {
    if (!waiting) {
      return;
    }
    const timer = setInterval(strategy.reload, POLL);
    return () => {
      clearInterval(timer);
    };
  }, [waiting, strategy.reload]);

  // Only when there is nothing to show: a poll that fails while a strategy
  // is on screen must not take the reader's unsaved rules away.
  if (strategy.data === null) {
    if (strategy.error !== null) {
      return <Failed message={strategy.error} />;
    }
    return strategy.loading ? (
      <div className="space-y-6" aria-busy="true" />
    ) : (
      <Empty title={`No strategy ${String(id)}`} reason="It may have been deleted." />
    );
  }

  const shown = strategy.data;
  const text = edited ?? shown.text;
  const dirty = text !== shown.text;

  const act = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      await action();
      strategy.reload();
    } catch (failure) {
      setProblem(explained(failure));
    } finally {
      setBusy(false);
    }
  };
  const run = async (): Promise<void> => {
    if (dirty) {
      await updateStrategy(id, text);
    }
    await runStrategy(id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={shown.name}
        identifiers={`Changed ${formatSince(shown.updated_at)}`}
        badges={shown.combines ? <Badge variant="secondary">Combination</Badge> : undefined}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !dirty}
              onClick={() => void act(() => updateStrategy(id, text))}
            >
              <Save aria-hidden /> Save
            </Button>
            <Button size="sm" disabled={busy || waiting} onClick={() => void act(run)}>
              <Play aria-hidden /> {dirty ? "Save and run" : "Run backtest"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Delete strategy"
              onClick={() => {
                setDeleting(true);
              }}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        }
      />
      {problem !== null && (
        <p role="alert" className="text-sm text-loss">
          {problem}
        </p>
      )}
      {shown.latest !== null && <RunStatus latest={shown.latest} />}

      {shown.result !== null ? (
        <StrategyResultPanel result={shown.result} />
      ) : (
        <Empty
          title="Not backtested yet"
          reason="Run backtest judges it on the stored history from 2005: in and out of sample, against the Nifty 500 and against random picks under the same rules."
        />
      )}

      <section aria-label="Rules" className="space-y-3">
        <SectionHeader title="Rules" description={dirty ? "Unsaved changes." : "As saved."} />
        <StrategyEditor text={text} onChange={setEdited} />
        <StrategyLanguage />
      </section>

      <section aria-label="Runs" className="space-y-3">
        <SectionHeader title="Runs" description="The latest backtests asked of it, newest first." />
        <StrategyRuns requests={shown.requests} />
      </section>

      <ConfirmDialog
        open={deleting}
        title={`Delete ${shown.name}?`}
        description="Its rules and runs go; the backtests it kept stay on the Backtests page."
        action="Delete"
        onClose={closeDelete}
        onConfirm={async () => {
          await deleteStrategy(id);
          void navigate(PATHS.strategies);
        }}
      />
    </div>
  );
}

/** Where the latest backtest has got to, unless it simply finished. */
function RunStatus({ latest }: { latest: StrategyRequest }): React.JSX.Element | null {
  if (latest.status === "failed") {
    return (
      <p role="alert" className="rounded-md bg-loss/10 px-3 py-2 text-sm text-loss">
        The last run failed: <span className="font-mono text-xs">{latest.error}</span>
      </p>
    );
  }
  if (latest.status === "done") {
    return null;
  }
  return (
    <p role="status" className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {latest.status === "queued"
        ? `Queued ${formatSince(latest.requested_at)}: the backtester runs one at a time.`
        : `Running since ${formatSince(latest.started_at)}: this page updates when it finishes.`}
    </p>
  );
}
