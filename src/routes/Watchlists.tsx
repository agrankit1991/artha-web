/**
 * The account's watchlists: what is being watched, and why.
 *
 * The lists down one side, the chosen list's companies across the rest:
 * first how each has done since it was added, ranked, then the table with
 * each price beside the reader's own stop and target, because "how far
 * from my target" belongs on the page rather than in the reader's head.
 * Notes and tags are the reader's words; tags also narrow the table.
 * Companies are added from a search of what the platform knows, and each
 * row's words and levels are edited in place. The table and the dialogs
 * are files of their own (`WatchlistTable`, `WatchlistDialogs`).
 *
 * The chosen list lives in the address, so a list is a link.
 */

import { FolderInput, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import type {
  KeptSource,
  WatchedInstrument,
  WatchlistFolder,
  WatchlistSummary,
} from "@/api/client";
import {
  deleteWatchlist,
  deleteWatchlistFolder,
  fetchKeptLists,
  fetchWatchlist,
  fetchWatchlistFolders,
  fetchWatchlists,
  moveWatchlist,
  removeWatchlistItem,
  updateWatchlistItem,
} from "@/api/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DivergingBars } from "@/components/DivergingBars";
import { Empty } from "@/components/Empty";
import { KeptListView } from "@/components/KeptListView";
import { ListActions } from "@/components/ListActions";
import { Failed } from "@/components/Failed";
import { Menu, MenuItem } from "@/components/Menu";
import { PageHeader } from "@/components/PageHeader";
import { AddDialog, FolderDialog, ItemDialog, ListDialog } from "@/components/WatchlistDialogs";
import { WatchlistTable } from "@/components/WatchlistTable";
import { WatchlistTree } from "@/components/WatchlistTree";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/useResource";
import { MARKS } from "@/lib/entities";
import { formatDay, sentence, toNumber } from "@/lib/format";
import { keptFromParams, keptParams, withoutKept } from "@/lib/keptLists";
import { companyPath } from "@/lib/paths";

/**
 * Render the page.
 *
 * @returns The page.
 */
export function Watchlists(): React.JSX.Element {
  const [params, setParams] = useSearchParams();
  const loadLists = useCallback(() => fetchWatchlists(), []);
  const lists = useResource(loadLists);
  const loadFolders = useCallback(() => fetchWatchlistFolders(), []);
  const folders = useResource(loadFolders);
  const loadKept = useCallback(() => fetchKeptLists(), []);
  const keptLists = useResource(loadKept);
  // A kept list named in the address is shown instead of the reader's own.
  const kept = useMemo(() => keptFromParams(params), [params]);

  // The chosen list: the address's, or the first one there is -- unless a
  // kept list is shown.
  const asked = toNumber(params.get("list"));
  const chosen = useMemo(() => {
    if (kept !== null) {
      return null;
    }
    const found = lists.data ?? [];
    return found.find((one) => one.watchlist_id === asked) ?? found[0] ?? null;
  }, [lists.data, asked, kept]);
  const chosenId = chosen?.watchlist_id ?? null;
  const [moveProblem, setMoveProblem] = useState<string | null>(null);

  const loadPage = useCallback(
    () => (chosenId === null ? Promise.resolve(null) : fetchWatchlist(chosenId)),
    [chosenId],
  );
  const page = useResource(loadPage);

  const choose = (watchlistId: number): void => {
    const next = withoutKept(params);
    next.set("list", String(watchlistId));
    setParams(next, { replace: true });
  };
  const chooseKept = (source: KeptSource, from: KeptSource | null = null): void => {
    // Pushed, not replaced: opening an index from its category is a step a
    // reader goes Back from.
    setParams(keptParams(params, source, from));
  };

  const [dialog, setDialog] = useState<
    | { kind: "create" }
    | { kind: "rename"; list: WatchlistSummary }
    | { kind: "delete"; list: WatchlistSummary }
    | { kind: "add" }
    | { kind: "edit"; item: WatchedInstrument }
    | { kind: "remove"; item: WatchedInstrument }
    | { kind: "folder-create" }
    | { kind: "folder-rename"; folder: WatchlistFolder }
    | { kind: "folder-delete"; folder: WatchlistFolder }
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

  const move = (list: WatchlistSummary, folderId: number | null): void => {
    setMoveProblem(null);
    moveWatchlist(list.watchlist_id, folderId)
      .then(() => {
        lists.reload();
      })
      .catch((error: unknown) => {
        setMoveProblem(error instanceof Error ? error.message : "Could not move the list");
      });
  };

  if (lists.error !== null) {
    return <Failed message={lists.error} />;
  }

  const items = page.data?.items ?? [];
  const tags = [...new Set(items.flatMap((one) => one.tags))].sort();
  const shown = tag === null ? items : items.filter((one) => one.tags.includes(tag));
  // How each has done since it was added, best first: a list's story at a glance.
  const ranked = shown
    .flatMap((one) => {
      const since = toNumber(one.since_added_percent);
      return since === null
        ? []
        : [{ label: one.symbol, value: since, href: companyPath(one.instrument_key, one.symbol) }];
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Watchlists"
        description="What you are keeping an eye on, and why: each company with its price beside your own stop and target, and how it has done since you added it."
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

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* One column that may shrink on a phone: an implicit column is as
            wide as the widest table in it, and the page scrolled sideways. */}
        <WatchlistTree
          lists={lists.data ?? []}
          folders={folders.data ?? []}
          kept={keptLists.data}
          chosenList={chosenId}
          chosenKept={kept}
          onChooseList={choose}
          onChooseKept={(source) => {
            chooseKept(source);
          }}
          onNewFolder={() => {
            setDialog({ kind: "folder-create" });
          }}
          onRenameFolder={(folder) => {
            setDialog({ kind: "folder-rename", folder });
          }}
          onDeleteFolder={(folder) => {
            setDialog({ kind: "folder-delete", folder });
          }}
        />

        {kept !== null ? (
          <section aria-label="Kept list">
            <KeptListView
              choice={kept}
              onOpen={(source, from) => {
                chooseKept(source, from);
              }}
              onBack={(source) => {
                chooseKept(source);
              }}
            />
          </section>
        ) : lists.data !== null && lists.data.length === 0 ? (
          <Empty
            title="No watchlists of your own yet"
            reason="Save any list on the site as one, press Watch on a company's page, or open one the platform keeps on the left."
          />
        ) : (
          <section className="space-y-3" aria-label="Companies">
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
                  <ListActions keys={items.map((one) => one.instrument_key)} label={chosen.name} />
                  {(folders.data ?? []).length > 0 && (
                    <Menu
                      label={`Move ${chosen.name} to a folder`}
                      align="end"
                      triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium hover:bg-accent"
                      trigger={
                        <>
                          <FolderInput aria-hidden="true" className="h-4 w-4" />
                          Move
                        </>
                      }
                    >
                      {(close) => (
                        <>
                          <MenuItem
                            selected={chosen.folder_id === null}
                            onSelect={() => {
                              close();
                              move(chosen, null);
                            }}
                          >
                            Top level
                          </MenuItem>
                          {(folders.data ?? []).map((folder) => (
                            <MenuItem
                              key={folder.folder_id}
                              selected={chosen.folder_id === folder.folder_id}
                              onSelect={() => {
                                close();
                                move(chosen, folder.folder_id);
                              }}
                            >
                              {folder.name}
                            </MenuItem>
                          ))}
                        </>
                      )}
                    </Menu>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setDialog({ kind: "add" });
                    }}
                  >
                    <Plus aria-hidden="true" className="mr-1 h-4 w-4" />
                    Add company
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

            {moveProblem !== null && (
              <p className="text-sm text-destructive">{sentence(moveProblem)}</p>
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

            {ranked.length > 1 && (
              <DivergingBars
                label="Each company since it was added"
                rows={ranked}
                className="rounded-lg border bg-card p-4"
              />
            )}

            {page.error !== null ? (
              <Failed message={page.error} />
            ) : (
              <WatchlistTable
                items={shown}
                // Until the lists arrive there is no list to read, which is
                // not the same as an empty one.
                loading={lists.loading || (page.loading && page.data === null)}
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
        )}
      </div>

      <FolderDialog
        state={
          dialog?.kind === "folder-create"
            ? { kind: "create" }
            : dialog?.kind === "folder-rename"
              ? { kind: "rename", folder: dialog.folder }
              : null
        }
        onClose={closeDialog}
        onDone={() => {
          closeDialog();
          folders.reload();
        }}
      />
      <ConfirmDialog
        open={dialog?.kind === "folder-delete"}
        title={dialog?.kind === "folder-delete" ? `Delete the folder “${dialog.folder.name}”?` : ""}
        description="Its lists move to the top level; none of them is deleted."
        action="Delete folder"
        onClose={closeDialog}
        onConfirm={async () => {
          if (dialog?.kind === "folder-delete") {
            await deleteWatchlistFolder(dialog.folder.folder_id);
            closeDialog();
            folders.reload();
            lists.reload();
          }
        }}
      />
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
