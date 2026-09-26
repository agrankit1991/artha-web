/**
 * The account's watchlists: what is being watched, and why.
 *
 * The lists down one side, the chosen list's instruments across the rest,
 * each with its price and move beside the reader's own target and stop --
 * and how far each is, because "how far from my target" belongs on the
 * page rather than in the reader's head. Notes and tags are the reader's
 * words; tags also narrow the table. Instruments are added from a search
 * of what the platform knows, and each row's words and levels are edited
 * in place.
 *
 * The chosen list lives in the address, so a list is a link.
 */

import { AlertCircle, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import type {
  SearchHit,
  WatchedInstrument,
  WatchlistItemDraft,
  WatchlistSummary,
} from "@/api/client";
import {
  addWatchlistItem,
  createWatchlist,
  deleteWatchlist,
  fetchSearch,
  fetchWatchlist,
  fetchWatchlists,
  removeWatchlistItem,
  updateWatchlist,
  updateWatchlistItem,
} from "@/api/client";
import { type Column, DataTable } from "@/components/DataTable";
import { symbolColumn } from "@/components/identityColumns";
import { Delta } from "@/components/Delta";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Dialog } from "@/components/Dialog";
import { Empty } from "@/components/Empty";
import { Failed } from "@/components/Failed";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounced } from "@/hooks/useDebounced";
import { useResource } from "@/hooks/useResource";
import { ENTITIES, MARKS } from "@/lib/entities";
import { ABSENT, formatDay, formatPrice, formatVolume, toNumber } from "@/lib/format";
import { companyPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Watchlists(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const loadLists = useCallback(() => fetchWatchlists(), []);
  const lists = useResource(loadLists);

  // The chosen list: the address's, or the first one there is.
  const asked = toNumber(params.get("list"));
  const chosen = useMemo(() => {
    const found = lists.data ?? [];
    return found.find((one) => one.watchlist_id === asked) ?? found[0] ?? null;
  }, [lists.data, asked]);
  const chosenId = chosen?.watchlist_id ?? null;

  const loadPage = useCallback(
    () => (chosenId === null ? Promise.resolve(null) : fetchWatchlist(chosenId)),
    [chosenId],
  );
  const page = useResource(loadPage);

  const choose = (watchlistId: number): void => {
    const next = new URLSearchParams(params);
    next.set("list", String(watchlistId));
    setParams(next, { replace: true });
  };

  const [dialog, setDialog] = useState<
    | { kind: "create" }
    | { kind: "rename"; list: WatchlistSummary }
    | { kind: "delete"; list: WatchlistSummary }
    | { kind: "add" }
    | { kind: "edit"; item: WatchedInstrument }
    | { kind: "remove"; item: WatchedInstrument }
    | null
  >(null);
  const [tag, setTag] = useState<string | null>(null);
  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const refresh = (): void => {
    lists.reload();
    page.reload();
  };

  if (lists.error !== null) {
    return <Failed message={lists.error} />;
  }

  const items = page.data?.items ?? [];
  const tags = [...new Set(items.flatMap((one) => one.tags))].sort();
  const shown = tag === null ? items : items.filter((one) => one.tags.includes(tag));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlists"
        description="What you are keeping an eye on, and why: each instrument with its price beside your own target and stop, and how far each is."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setDialog({ kind: "create" });
            }}
          >
            <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
            New list
          </Button>
        }
      />

      {lists.data !== null && lists.data.length === 0 ? (
        <Empty
          title="No watchlists yet"
          reason="Make one here, or press Watch on any company's page and it is made there."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Watchlists" className="space-y-1">
            {(lists.data ?? []).map((list) => (
              <button
                key={list.watchlist_id}
                type="button"
                aria-current={list.watchlist_id === chosenId ? "page" : undefined}
                onClick={() => {
                  choose(list.watchlist_id);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                  list.watchlist_id === chosenId && "bg-accent font-medium",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{list.name}</span>
                  {list.description !== null && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {list.description}
                    </span>
                  )}
                </span>
                <span className="ml-2 shrink-0 text-xs tabular text-muted-foreground">
                  {list.items}
                </span>
              </button>
            ))}
          </nav>

          <section className="space-y-3" aria-label="Instruments">
            {chosen !== null && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MARKS.watchlist aria-hidden="true" className="h-4 w-4 text-primary" />
                  <h2 className="text-lg font-semibold">{chosen.name}</h2>
                  <span className="text-xs text-muted-foreground">
                    since {formatDay(chosen.created_at)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setDialog({ kind: "add" });
                    }}
                  >
                    <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
                    Add instrument
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDialog({ kind: "rename", list: chosen });
                    }}
                  >
                    <Pencil aria-hidden="true" className="mr-1 h-4 w-4" />
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDialog({ kind: "delete", list: chosen });
                    }}
                  >
                    <Trash2 aria-hidden="true" className="mr-1 h-4 w-4" />
                    Delete list
                  </Button>
                </div>
              </div>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Tags">
                <Button
                  size="sm"
                  variant={tag === null ? "secondary" : "ghost"}
                  aria-pressed={tag === null}
                  onClick={() => {
                    setTag(null);
                  }}
                >
                  All
                </Button>
                {tags.map((one) => (
                  <Button
                    key={one}
                    size="sm"
                    variant={tag === one ? "secondary" : "ghost"}
                    aria-pressed={tag === one}
                    onClick={() => {
                      setTag(one === tag ? null : one);
                    }}
                  >
                    {one}
                  </Button>
                ))}
              </div>
            )}

            {page.error !== null ? (
              <Failed message={page.error} />
            ) : (
              <Items
                items={shown}
                loading={page.loading && page.data === null}
                onEdit={(item) => {
                  setDialog({ kind: "edit", item });
                }}
                onRemove={(item) => {
                  setDialog({ kind: "remove", item });
                }}
                onStar={(item) => {
                  if (chosenId === null) {
                    return; // Unreachable: items are drawn only for a chosen list.
                  }
                  void updateWatchlistItem(chosenId, item.item_id, {
                    notes: item.notes,
                    target_price: item.target_price,
                    stop_loss: item.stop_loss,
                    tags: item.tags,
                    featured: !item.featured,
                  }).then(refresh);
                }}
              />
            )}
          </section>
        </div>
      )}

      <ListDialog
        state={dialog?.kind === "create" || dialog?.kind === "rename" ? dialog : null}
        onClose={closeDialog}
        onDone={(list) => {
          closeDialog();
          refresh();
          choose(list.watchlist_id);
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "delete"}
        title={dialog?.kind === "delete" ? `Delete “${dialog.list.name}”?` : ""}
        description="Everything on it goes with it. This cannot be undone."
        action="Delete list"
        onClose={closeDialog}
        onConfirm={async () => {
          if (dialog?.kind === "delete") {
            await deleteWatchlist(dialog.list.watchlist_id);
            closeDialog();
            const next = new URLSearchParams(params);
            next.delete("list");
            setParams(next, { replace: true });
            lists.reload();
          }
        }}
      />
      {chosenId !== null && (
        <AddDialog
          open={dialog?.kind === "add"}
          watchlistId={chosenId}
          onClose={closeDialog}
          onDone={() => {
            closeDialog();
            refresh();
          }}
        />
      )}
      {chosenId !== null && (
        <ItemDialog
          watchlistId={chosenId}
          item={dialog?.kind === "edit" ? dialog.item : null}
          onClose={closeDialog}
          onDone={() => {
            closeDialog();
            refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={dialog?.kind === "remove"}
        title={dialog?.kind === "remove" ? `Remove ${dialog.item.symbol}?` : ""}
        description="Its notes and levels go with it."
        action="Remove"
        onClose={closeDialog}
        onConfirm={async () => {
          if (dialog?.kind === "remove" && chosenId !== null) {
            await removeWatchlistItem(chosenId, dialog.item.item_id);
            closeDialog();
            refresh();
          }
        }}
      />
    </div>
  );
}

/** The instruments, as a table with the reader's levels beside the price. */
function Items({
  items,
  loading,
  onEdit,
  onRemove,
  onStar,
}: {
  items: WatchedInstrument[];
  loading: boolean;
  onEdit: (item: WatchedInstrument) => void;
  onRemove: (item: WatchedInstrument) => void;
  onStar: (item: WatchedInstrument) => void;
}): React.JSX.Element {
  const columns = useMemo<Column<WatchedInstrument>[]>(
    () => [
      symbolColumn((row) => row, {
        // The previous watchlist's two marks before the name: the star the
        // reader sets, and a warning when the price nears a level.
        lead: (row) => (
          <>
            <StarButton item={row} onStar={onStar} />
            <NearLevel item={row} />
          </>
        ),
      }),
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[18rem]">
            <div className="truncate">{row.original.name}</div>
            {row.original.notes !== null && (
              <div className="truncate text-xs text-muted-foreground" title={row.original.notes}>
                {row.original.notes}
              </div>
            )}
            {row.original.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {row.original.tags.map((one) => (
                  <Badge key={one} variant="outline" className="px-1 text-xs">
                    {one}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "close",
        header: "Price",
        accessorFn: (row) => toNumber(row.close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.close),
        meta: { align: "right" },
      },
      {
        id: "volume",
        header: "Volume",
        accessorFn: (row) => row.volume ?? 0,
        cell: ({ row }) => formatVolume(row.original.volume),
        meta: { align: "right" },
      },
      change("change", "Today", (row) => row.change_percent),
      change("since_added", "Since added", (row) => row.since_added_percent),
      {
        id: "added_close",
        header: "Added at",
        accessorFn: (row) => toNumber(row.added_close) ?? 0,
        cell: ({ row }) => formatPrice(row.original.added_close),
        meta: { align: "right" },
      },
      level(
        "target",
        "Target",
        (row) => row.target_price,
        (row) => row.to_target_percent,
      ),
      level(
        "stop",
        "Stop",
        (row) => row.stop_loss,
        (row) => row.to_stop_percent,
      ),
      {
        id: "added_on",
        header: "Added",
        accessorFn: (row) => row.added_on,
        cell: ({ row }) => formatDay(row.original.added_on),
      },
      change("one_month", "1M", (row) => row.one_month),
      change("one_year", "1Y", (row) => row.one_year),
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Edit ${row.original.symbol}`}
              onClick={() => {
                onEdit(row.original);
              }}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove ${row.original.symbol}`}
              onClick={() => {
                onRemove(row.original);
              }}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </span>
        ),
      },
    ],
    [onEdit, onRemove, onStar],
  );
  return (
    <DataTable
      columns={columns}
      rows={items}
      loading={loading}
      empty="Nothing on this list yet"
      placeholderRows={4}
      label="Watched instruments"
      full
      linkTo={(row) => companyPath(row.instrument_key, row.symbol)}
    />
  );
}

/** A percentage column, coloured by its sign. */
function change(
  id: string,
  header: string,
  of: (row: WatchedInstrument) => string | null,
): Column<WatchedInstrument> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(of(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => <Delta value={of(row.original)} />,
    meta: { align: "right" },
  };
}

/** A level the reader set, with how far the price is from it. */
function level(
  id: string,
  header: string,
  of: (row: WatchedInstrument) => string | null,
  distance: (row: WatchedInstrument) => string | null,
): Column<WatchedInstrument> {
  return {
    id,
    header,
    accessorFn: (row) => toNumber(distance(row)) ?? Number.NEGATIVE_INFINITY,
    cell: ({ row }) => {
      const set = of(row.original);
      if (set === null) {
        return <span className="text-muted-foreground">{ABSENT}</span>;
      }
      return (
        <span className="inline-flex flex-col items-end leading-tight">
          <span className="tabular">{formatPrice(set)}</span>
          <Delta value={distance(row.original)} className="text-xs" />
        </span>
      );
    },
    meta: { align: "right" },
  };
}

/** Make or rename a list. */
function ListDialog({
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
        {problem !== null && <p className="text-sm text-loss">{problem}</p>}
      </form>
    </Dialog>
  );
}

/** Find an instrument the platform knows and put it on the list. */
function AddDialog({
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
  const [typed, setTyped] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const query = useDebounced(typed.trim());
  const load = useCallback(
    () => (query.length < 2 ? Promise.resolve<SearchHit[]>([]) : fetchSearch(query)),
    [query],
  );
  const found = useResource(load);
  const companies = (found.data ?? []).filter((hit) => hit.kind === "company");

  useEffect(() => {
    if (!open) {
      setTyped("");
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
      title="Add an instrument"
      description="Type a few letters of a company's name or symbol."
    >
      <Input
        type="search"
        aria-label="Find a company"
        placeholder="Reliance, TCS, HDFCBANK…"
        value={typed}
        onChange={(event) => {
          setTyped(event.target.value);
        }}
      />
      {problem !== null && <p className="text-sm text-loss">{problem}</p>}
      <ul className="max-h-72 divide-y overflow-auto rounded-md border" aria-label="Matches">
        {query.length >= 2 && !found.loading && companies.length === 0 && (
          <li className="px-3 py-3 text-center text-sm text-muted-foreground">
            No company called &ldquo;{query}&rdquo;
          </li>
        )}
        {companies.map((hit) => (
          <li key={hit.key}>
            <button
              type="button"
              onClick={() => {
                void add(hit);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <ENTITIES.company.icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{hit.label}</span>
                {hit.detail !== null && (
                  <span className="block truncate text-xs text-muted-foreground">{hit.detail}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Edit an item's notes, levels and tags. */
function ItemDialog({
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
        {problem !== null && <p className="text-sm text-loss">{problem}</p>}
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

/** How close the price must come to a level for the row to warn, in per cent. */
const NEAR_LEVEL_PERCENT = 3;

/** The star that keeps an item at the top of its list. */
function StarButton({
  item,
  onStar,
}: {
  item: WatchedInstrument;
  onStar: (item: WatchedInstrument) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={item.featured ? `Unstar ${item.symbol}` : `Star ${item.symbol}`}
      aria-pressed={item.featured}
      onClick={(event) => {
        // The row is a link; starring must not also open the company.
        event.preventDefault();
        event.stopPropagation();
        onStar(item);
      }}
      className="rounded-full p-0.5 hover:bg-muted"
    >
      <Star
        aria-hidden="true"
        className={cn(
          "h-4 w-4",
          item.featured ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground",
        )}
      />
    </button>
  );
}

/**
 * A warning when the price is within a few per cent of the reader's
 * target (green: nearly there) or stop (red: nearly out).
 */
function NearLevel({ item }: { item: WatchedInstrument }): React.JSX.Element | null {
  const toTarget = toNumber(item.to_target_percent);
  const toStop = toNumber(item.to_stop_percent);
  const near = (value: number | null): boolean =>
    value !== null && Math.abs(value) <= NEAR_LEVEL_PERCENT;
  if (near(toTarget)) {
    return (
      <AlertCircle role="img" aria-label="Near target" className="h-4 w-4 shrink-0 text-gain" />
    );
  }
  if (near(toStop)) {
    return <AlertCircle role="img" aria-label="Near stop" className="h-4 w-4 shrink-0 text-loss" />;
  }
  return null;
}
