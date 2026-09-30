/**
 * The watchlists page's dialogs: making or renaming a list, adding a
 * company to it, and editing an item's notes, levels and tags.
 *
 * Apart from the page so that each file has one job; the page decides
 * which is open and refreshes what it shows when one is done.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import type {
  SearchHit,
  WatchedInstrument,
  WatchlistItemDraft,
  WatchlistSummary,
} from "@/api/client";
import {
  addWatchlistItem,
  createWatchlist,
  updateWatchlist,
  updateWatchlistItem,
} from "@/api/client";
import { Dialog } from "@/components/Dialog";
import { InstrumentPicker } from "@/components/InstrumentPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice, sentence } from "@/lib/format";
import { companyPath } from "@/lib/paths";

/** Make or rename a list. */
export function ListDialog({
  state,
  onClose,
  onDone,
}: {
  state: { kind: "create" } | { kind: "rename"; list: WatchlistSummary } | null;
  onClose: () => void;
  onDone: (list: WatchlistSummary) => void;
}): React.JSX.Element {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const open = state !== null;

  useEffect(() => {
    setName(state?.kind === "rename" ? state.list.name : "");
    setDescription(state?.kind === "rename" ? (state.list.description ?? "") : "");
    setProblem(null);
  }, [state]);

  const save = async (): Promise<void> => {
    if (state === null) {
      return; // Unreachable: the form exists only while the dialog is open.
    }
    setBusy(true);
    setProblem(null);
    try {
      const draft = { name, description: description.trim() === "" ? null : description };
      const saved =
        state.kind === "create"
          ? await createWatchlist(draft)
          : await updateWatchlist(state.list.watchlist_id, draft);
      onDone(saved);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not save the list");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={state?.kind === "rename" ? "Rename list" : "New watchlist"}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && name.trim() !== "") {
            void save();
          }
        }}
      >
        <label className="block text-sm">
          <span className="text-muted-foreground">Name</span>
          <Input
            aria-label="Name"
            value={name}
            maxLength={60}
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || name.trim() === ""}>
            {state?.kind === "rename" ? "Save" : "Make list"}
          </Button>
        </div>
        {problem !== null && <p className="text-sm text-destructive">{sentence(problem)}</p>}
      </form>
    </Dialog>
  );
}

/** Find a company the platform knows and put it on the list. */
export function AddDialog({
  open,
  watchlistId,
  onClose,
  onDone,
}: {
  open: boolean;
  watchlistId: number;
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setProblem(null);
    }
  }, [open]);

  const add = async (hit: SearchHit): Promise<void> => {
    setProblem(null);
    try {
      await addWatchlistItem(watchlistId, { instrument_key: hit.key });
      onDone();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not add it");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a company"
      description="Type a few letters of a company's name or symbol."
    >
      <InstrumentPicker
        label="Find a company"
        placeholder="Reliance, TCS, HDFCBANK…"
        kinds={["company"]}
        layout="inline"
        onPick={(hit) => {
          void add(hit);
        }}
      />
      {problem !== null && <p className="text-sm text-destructive">{sentence(problem)}</p>}
    </Dialog>
  );
}

/** Edit an item's notes, levels and tags. */
export function ItemDialog({
  watchlistId,
  item,
  onClose,
  onDone,
}: {
  watchlistId: number;
  item: WatchedInstrument | null;
  onClose: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const [notes, setNotes] = useState("");
  const [target, setTarget] = useState("");
  const [stop, setStop] = useState("");
  const [tags, setTags] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotes(item?.notes ?? "");
    setTarget(item?.target_price ?? "");
    setStop(item?.stop_loss ?? "");
    setTags(item?.tags.join(", ") ?? "");
    setProblem(null);
  }, [item]);

  const save = async (): Promise<void> => {
    if (item === null) {
      return; // Unreachable: the form exists only while the dialog is open.
    }
    setBusy(true);
    setProblem(null);
    const draft: WatchlistItemDraft = {
      notes: notes.trim() === "" ? null : notes,
      target_price: target.trim() === "" ? null : target,
      stop_loss: stop.trim() === "" ? null : stop,
      tags: tags
        .split(",")
        .map((one) => one.trim())
        .filter((one) => one !== ""),
      // A change replaces the whole item, so the star goes along unchanged.
      featured: item.featured,
    };
    try {
      await updateWatchlistItem(watchlistId, item.item_id, draft);
      onDone();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={item !== null}
      onClose={onClose}
      title={item === null ? "" : `${item.symbol}: notes and levels`}
      {...(item?.close == null ? {} : { description: `Last close ${formatPrice(item.close)}.` })}
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy) {
            void save();
          }
        }}
      >
        <label className="block text-sm">
          <span className="text-muted-foreground">Notes</span>
          <textarea
            aria-label="Notes"
            value={notes}
            rows={3}
            maxLength={2000}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Target price</span>
            <Input
              type="number"
              step="any"
              aria-label="Target price"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
              }}
              className="mt-1"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Stop loss</span>
            <Input
              type="number"
              step="any"
              aria-label="Stop loss"
              value={stop}
              onChange={(event) => {
                setStop(event.target.value);
              }}
              className="mt-1"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted-foreground">Tags, separated by commas</span>
          <Input
            aria-label="Tags"
            value={tags}
            placeholder="oil, retail"
            onChange={(event) => {
              setTags(event.target.value);
            }}
            className="mt-1"
          />
        </label>
        {problem !== null && <p className="text-sm text-destructive">{sentence(problem)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          <Link
            to={companyPath(item?.instrument_key ?? "", item?.symbol ?? "")}
            className="underline"
          >
            Open the company page
          </Link>
        </p>
      </form>
    </Dialog>
  );
}
