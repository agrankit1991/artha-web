/**
 * What can be done with a list of companies on any page: save it as a new
 * watchlist, put it on one of the reader's, or copy it for TradingView.
 *
 * Every list in the application offers it -- the movers, a screen, an
 * index's constituents, a strategy's picks, a backtest's trades -- so a
 * watchlist is built from wherever the reader is rather than one company at
 * a time from the company page. It is the one implementation: how a long list
 * is collected, what is said about companies left out and how the counts
 * beside every row are refreshed are decided here.
 *
 * The list is collected when an action is chosen, not when the page loads,
 * and as deep as that action takes: a watchlist takes up to the platform's
 * 5,000 in one request, an export the 1,000 it can look up.
 */

import { ListPlus, Plus, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import type { BatchAdded, WatchlistSummary } from "@/api/client";
import { addWatchlistItems, createWatchlist, fetchWatchlists } from "@/api/client";
import { Dialog } from "@/components/Dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/Menu";
import { TradingViewExportDialog } from "@/components/TradingViewExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useResource } from "@/hooks/useResource";
import { formatWhole, sentence } from "@/lib/format";
import { type KeyCollection, type KeySource, collectKeys, holdsNothing } from "@/lib/keySource";
import { watchlistPath } from "@/lib/paths";
import { MOST_EXPORTED } from "@/lib/tradingViewList";
import { useWatchlistMembership } from "@/lib/watchlistMembership";
import { cn } from "@/lib/utils";

/** The most instruments the platform puts on a list in one request. */
export const MOST_SAVED = 5_000;

/** How long a watchlist's name may be, as the platform allows. */
const NAME_LENGTH = 60;

type Action = "save" | "add" | "export";

/** How deep each action collects the list. */
const DEPTH: Record<Action, number> = { save: MOST_SAVED, add: MOST_SAVED, export: MOST_EXPORTED };

interface ListActionsProps {
  /** The list's instruments in its order, or how to fetch them all. */
  keys: KeySource;
  /** What the list is, as a reader would name it: "Top gainers, Nifty 500". */
  label: string;
  className?: string;
}

/**
 * Render the menu and, while one is open, its dialog.
 *
 * @param props - The list and what it is.
 * @returns The menu, or nothing for a list that is certainly empty.
 */
export function ListActions({
  keys,
  label,
  className,
}: ListActionsProps): React.JSX.Element | null {
  const [action, setAction] = useState<Action | null>(null);
  const [collection, setCollection] = useState<KeyCollection>({ phase: "collecting" });
  // Which choice an answer belongs to, so a slow list arriving after the
  // dialog was closed, or another chosen, is not drawn over the newer one.
  const choosing = useRef(0);

  const close = useCallback(() => {
    choosing.current += 1;
    setAction(null);
  }, []);

  if (holdsNothing(keys)) {
    return null;
  }

  const begin = (next: Action): void => {
    choosing.current += 1;
    const mine = choosing.current;
    setAction(next);
    setCollection({ phase: "collecting" });
    collectKeys(keys, DEPTH[next])
      .then((collected) => {
        if (choosing.current === mine) {
          setCollection({ phase: "ready", collected });
        }
      })
      .catch((error: unknown) => {
        if (choosing.current === mine) {
          setCollection({
            phase: "failed",
            message: error instanceof Error ? error.message : "The list could not be read",
          });
        }
      });
  };

  return (
    <>
      <Menu
        label={`Save or export ${label}`}
        align="end"
        {...(className === undefined ? {} : { className })}
        triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium hover:bg-accent"
        trigger={
          <>
            <ListPlus aria-hidden="true" className="h-4 w-4" />
            Save list
          </>
        }
      >
        {(closeMenu) => (
          <>
            <MenuItem
              onSelect={() => {
                closeMenu();
                begin("save");
              }}
            >
              <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
              Save as a new watchlist…
            </MenuItem>
            <MenuItem
              onSelect={() => {
                closeMenu();
                begin("add");
              }}
            >
              <ListPlus aria-hidden="true" className="mr-2 h-4 w-4" />
              Add to a watchlist…
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              onSelect={() => {
                closeMenu();
                begin("export");
              }}
            >
              <Upload aria-hidden="true" className="mr-2 h-4 w-4" />
              Copy for TradingView…
            </MenuItem>
          </>
        )}
      </Menu>
      <SaveDialog open={action === "save"} onClose={close} label={label} collection={collection} />
      <AddDialog open={action === "add"} onClose={close} label={label} collection={collection} />
      <TradingViewExportDialog
        open={action === "export"}
        onClose={close}
        label={label}
        collection={collection}
      />
    </>
  );
}

interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  label: string;
  collection: KeyCollection;
}

/** How many companies are going on a list, or why the list is not ready. */
function CollectionNote({ collection }: { collection: KeyCollection }): React.JSX.Element {
  if (collection.phase === "collecting") {
    return <p className="text-sm text-muted-foreground">Reading the list…</p>;
  }
  if (collection.phase === "failed") {
    return <p className="text-sm text-destructive">{sentence(collection.message)}</p>;
  }
  const count = collection.collected.keys.length;
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        {formatWhole(count)} {count === 1 ? "company" : "companies"}, in the list&apos;s order.
      </p>
      {collection.collected.over && (
        <p className="text-xs text-caution">
          Only the first {formatWhole(MOST_SAVED)} of a longer list are taken.
        </p>
      )}
    </div>
  );
}

/** The collected keys, when there are some to save. */
function readyKeys(collection: KeyCollection): string[] | null {
  return collection.phase === "ready" && collection.collected.keys.length > 0
    ? collection.collected.keys
    : null;
}

/** Make a watchlist of the list, named after it to begin with. */
function SaveDialog({ open, onClose, label, collection }: ActionDialogProps): React.JSX.Element {
  const { refresh } = useWatchlistMembership();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saved, setSaved] = useState<WatchlistSummary | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = readyKeys(collection);

  useEffect(() => {
    if (open) {
      setName(label.slice(0, NAME_LENGTH));
      setDescription("");
      setSaved(null);
      setProblem(null);
    }
  }, [open, label]);

  const save = async (chosen: string[]): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      const made = await createWatchlist({
        name,
        description: description.trim() === "" ? null : description,
        instrument_keys: chosen,
      });
      setSaved(made);
      refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not save the list");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Save as a new watchlist" description={label}>
      {saved === null ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && keys !== null && name.trim() !== "") {
              void save(keys);
            }
          }}
        >
          <label className="block text-sm">
            <span className="text-muted-foreground">Name</span>
            <Input
              aria-label="Name"
              value={name}
              maxLength={NAME_LENGTH}
              onChange={(event) => {
                setName(event.target.value);
              }}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">What it is for (optional)</span>
            <Input
              aria-label="Description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              className="mt-1"
            />
          </label>
          <CollectionNote collection={collection} />
          {problem !== null && <p className="text-sm text-destructive">{sentence(problem)}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || keys === null || name.trim() === ""}>
              Save list
            </Button>
          </div>
        </form>
      ) : (
        <Done list={saved} onClose={onClose}>
          Saved &ldquo;{saved.name}&rdquo; with {formatWhole(saved.items)}{" "}
          {saved.items === 1 ? "company" : "companies"}.{left(keys?.length ?? 0, saved.items)}
        </Done>
      )}
    </Dialog>
  );
}

/** Put the list on one of the reader's watchlists. */
function AddDialog({ open, onClose, label, collection }: ActionDialogProps): React.JSX.Element {
  const { refresh } = useWatchlistMembership();
  // Read only while open: the lists are wanted when adding, not on every page.
  const load = useCallback(
    () => (open ? fetchWatchlists() : Promise.resolve<WatchlistSummary[] | null>(null)),
    [open],
  );
  const lists = useResource(load);
  const [result, setResult] = useState<{ list: WatchlistSummary; added: BatchAdded } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = readyKeys(collection);

  useEffect(() => {
    if (open) {
      setResult(null);
      setProblem(null);
    }
  }, [open]);

  const add = async (list: WatchlistSummary, chosen: string[]): Promise<void> => {
    setBusy(true);
    setProblem(null);
    try {
      const added = await addWatchlistItems(list.watchlist_id, chosen);
      setResult({ list, added });
      refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not add to the list");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Add to a watchlist" description={label}>
      {result === null ? (
        <div className="space-y-3">
          <CollectionNote collection={collection} />
          {lists.error !== null && (
            <p className="text-sm text-destructive">{sentence(lists.error)}</p>
          )}
          {lists.data !== null && lists.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You have no watchlists yet: save this one as a new list instead.
            </p>
          )}
          <ul className="max-h-72 divide-y overflow-auto rounded-md border" aria-label="Your lists">
            {(lists.data ?? []).map((list) => (
              <li key={list.watchlist_id}>
                <button
                  type="button"
                  disabled={busy || keys === null}
                  onClick={() => {
                    if (keys !== null) {
                      void add(list, keys);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <span className="truncate">{list.name}</span>
                  <span className="ml-2 shrink-0 text-xs tabular text-muted-foreground">
                    {formatWhole(list.items)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {problem !== null && <p className="text-sm text-destructive">{sentence(problem)}</p>}
        </div>
      ) : (
        <Done list={result.list} onClose={onClose}>
          {addedSentence(result.list.name, result.added)}
        </Done>
      )}
    </Dialog>
  );
}

/** What a saved or added list says, with the way to it. */
function Done({
  list,
  onClose,
  children,
}: {
  list: WatchlistSummary;
  onClose: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-3">
      <p className="text-sm">{children}</p>
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link to={watchlistPath(list.watchlist_id)} onClick={onClose}>
            Open {list.name}
          </Link>
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

/**
 * Say how many of a list were left off a new watchlist, when any were.
 *
 * @param sent - How many were sent.
 * @param kept - How many the platform put on it.
 * @returns A sentence, or nothing when none were left off.
 */
function left(sent: number, kept: number): string {
  const missing = sent - kept;
  if (missing <= 0) {
    return "";
  }
  return ` ${formatWhole(missing)} ${missing === 1 ? "is" : "are"} no longer listed, so left off.`;
}

/**
 * Say what putting a list on a watchlist did.
 *
 * @param name - The watchlist's name.
 * @param added - What the platform reported.
 * @returns One or more sentences.
 */
export function addedSentence(name: string, added: BatchAdded): string {
  const sentences = [
    `Added ${formatWhole(added.added)} ${added.added === 1 ? "company" : "companies"} to ${name}.`,
  ];
  if (added.already > 0) {
    sentences.push(
      `${formatWhole(added.already)} ${added.already === 1 ? "was" : "were"} on it already, and kept ${added.already === 1 ? "its" : "their"} notes.`,
    );
  }
  if (added.unknown > 0) {
    sentences.push(
      `${formatWhole(added.unknown)} ${added.unknown === 1 ? "is" : "are"} no longer listed, so left off.`,
    );
  }
  return sentences.join(" ");
}
