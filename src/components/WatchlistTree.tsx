/**
 * The watchlist page's side panel: the reader's own lists, in folders, and
 * every list the platform keeps, grouped.
 *
 * Levels as the owner chose (2026-11-07, WATCHLIST-PLAN.md section 2): a
 * folder holds lists, one level deep; the kept lists are grouped as Indices
 * (by category), Sectors, Movers and Strategies; and an index is opened into
 * its companies from its list rather than nested here. A group starts
 * closed unless it holds what is shown, so the hundred and fifty sectors do
 * not push the reader's own lists off the screen; the two long groups can be
 * narrowed by typing.
 */

import { ChevronRight, Folder, FolderPlus, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import type {
  KeptListSummary,
  KeptLists,
  KeptSource,
  WatchlistFolder,
  WatchlistSummary,
} from "@/api/client";
import { keptTitle } from "@/components/KeptListView";
import { Menu, MenuItem } from "@/components/Menu";
import { Input } from "@/components/ui/input";
import { formatCount } from "@/lib/format";
import { categoryLabel } from "@/lib/indices";
import { sameKept } from "@/lib/keptLists";
import { cn } from "@/lib/utils";

/** How many entries a group shows before it offers to be narrowed by typing. */
const NARROW_ABOVE = 12;

interface WatchlistTreeProps {
  lists: WatchlistSummary[];
  folders: WatchlistFolder[];
  /** The kept lists, or null while they are on their way. */
  kept: KeptLists | null;
  chosenList: number | null;
  /** The kept list shown, and the one it was opened from. */
  chosenKept: { source: KeptSource; from: KeptSource | null } | null;
  onChooseList: (watchlistId: number) => void;
  onChooseKept: (source: KeptSource) => void;
  onNewFolder: () => void;
  onRenameFolder: (folder: WatchlistFolder) => void;
  onDeleteFolder: (folder: WatchlistFolder) => void;
}

/**
 * Render the panel.
 *
 * @param props - The lists, which is shown, and what to do when one is chosen.
 * @returns The navigation.
 */
export function WatchlistTree({
  lists,
  folders,
  kept,
  chosenList,
  chosenKept,
  onChooseList,
  onChooseKept,
  onNewFolder,
  onRenameFolder,
  onDeleteFolder,
}: WatchlistTreeProps): React.JSX.Element {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (group: string, now: boolean): void => {
    setOpen((was) => ({ ...was, [group]: !now }));
  };
  const unfiled = lists.filter((one) => one.folder_id === null);
  const active = (entry: KeptListSummary): boolean =>
    chosenKept !== null && (sameKept(entry, chosenKept.source) || sameKept(entry, chosenKept.from));

  const groups: {
    id: string;
    title: string;
    entries: KeptListSummary[];
    name: (entry: KeptListSummary) => string;
  }[] =
    kept === null
      ? []
      : [
          {
            id: "indices",
            title: "Indices",
            entries: kept.indices,
            name: (one) => categoryLabel(one.key),
          },
          {
            id: "sectors",
            title: "Sectors",
            entries: kept.sectors,
            name: (one) => keptTitle(one, one.name),
          },
          {
            id: "movers",
            title: "Movers",
            entries: kept.movers,
            name: (one) => keptTitle(one, one.name),
          },
          {
            id: "strategies",
            title: "Strategies",
            entries: kept.strategies,
            name: (one) => keptTitle(one, one.name),
          },
        ];

  return (
    <nav aria-label="Watchlists" className="space-y-4">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My lists
          </span>
          <button
            type="button"
            aria-label="New folder"
            title="New folder"
            onClick={onNewFolder}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <FolderPlus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        {folders.map((folder) => {
          const inside = lists.filter((one) => one.folder_id === folder.folder_id);
          const holdsChosen = inside.some((one) => one.watchlist_id === chosenList);
          const isOpen =
            open[`folder:${String(folder.folder_id)}`] ?? (holdsChosen || inside.length > 0);
          return (
            <div key={folder.folder_id}>
              <div className="flex items-center">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    toggle(`folder:${String(folder.folder_id)}`, isOpen);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <ChevronRight
                    aria-hidden="true"
                    className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-90")}
                  />
                  <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto shrink-0 text-xs tabular text-muted-foreground">
                    {inside.length}
                  </span>
                </button>
                <Menu
                  label={`Folder ${folder.name}`}
                  align="end"
                  triggerClassName="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  trigger={<MoreHorizontal aria-hidden="true" className="h-4 w-4" />}
                >
                  {(close) => (
                    <>
                      <MenuItem
                        onSelect={() => {
                          close();
                          onRenameFolder(folder);
                        }}
                      >
                        Rename folder…
                      </MenuItem>
                      <MenuItem
                        onSelect={() => {
                          close();
                          onDeleteFolder(folder);
                        }}
                      >
                        Delete folder…
                      </MenuItem>
                    </>
                  )}
                </Menu>
              </div>
              {isOpen && (
                <div className="ml-5 space-y-1 border-l pl-1">
                  {inside.length === 0 ? (
                    <p className="px-3 py-1 text-xs text-muted-foreground">
                      Empty: move a list here from its header.
                    </p>
                  ) : (
                    inside.map((list) => (
                      <ListButton
                        key={list.watchlist_id}
                        list={list}
                        chosen={list.watchlist_id === chosenList}
                        onChoose={onChooseList}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
        {unfiled.map((list) => (
          <ListButton
            key={list.watchlist_id}
            list={list}
            chosen={list.watchlist_id === chosenList}
            onChoose={onChooseList}
          />
        ))}
        {lists.length === 0 && (
          <p className="px-3 py-1 text-xs text-muted-foreground">
            None yet: save any list on the site, or press Watch on a company.
          </p>
        )}
      </div>

      {groups.map((group) => {
        const holdsChosen = group.entries.some(active);
        const isOpen = open[group.id] ?? holdsChosen;
        return (
          <KeptGroup
            key={group.id}
            title={group.title}
            entries={group.entries}
            name={group.name}
            open={isOpen}
            onToggle={() => {
              toggle(group.id, isOpen);
            }}
            active={active}
            onChoose={onChooseKept}
          />
        );
      })}
    </nav>
  );
}

/** One of the reader's lists, as a row of the panel. */
function ListButton({
  list,
  chosen,
  onChoose,
}: {
  list: WatchlistSummary;
  chosen: boolean;
  onChoose: (watchlistId: number) => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-current={chosen ? "page" : undefined}
      onClick={() => {
        onChoose(list.watchlist_id);
      }}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
        chosen && "bg-accent font-medium",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate">{list.name}</span>
        {list.description !== null && (
          <span className="block truncate text-xs text-muted-foreground">{list.description}</span>
        )}
      </span>
      <span className="ml-2 shrink-0 text-xs tabular text-muted-foreground">{list.items}</span>
    </button>
  );
}

/** One group of kept lists: a heading that opens it, and, open, its lists. */
function KeptGroup({
  title,
  entries,
  name,
  open,
  onToggle,
  active,
  onChoose,
}: {
  title: string;
  entries: KeptListSummary[];
  name: (entry: KeptListSummary) => string;
  open: boolean;
  onToggle: () => void;
  active: (entry: KeptListSummary) => boolean;
  onChoose: (source: KeptSource) => void;
}): React.JSX.Element {
  const [typed, setTyped] = useState("");
  const wanted = typed.trim().toLowerCase();
  const shown =
    wanted === "" ? entries : entries.filter((one) => name(one).toLowerCase().includes(wanted));
  return (
    <div className="space-y-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left hover:bg-accent"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-90")}
        />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="ml-auto text-xs tabular text-muted-foreground">
          {formatCount(entries.length)}
        </span>
      </button>
      {open && (
        <div className="space-y-1 pl-2">
          {entries.length > NARROW_ABOVE && (
            <Input
              type="search"
              aria-label={`Find in ${title}`}
              placeholder={`Find in ${title.toLowerCase()}`}
              value={typed}
              onChange={(event) => {
                setTyped(event.target.value);
              }}
              className="h-8"
            />
          )}
          <div className="max-h-72 space-y-0.5 overflow-auto">
            {shown.map((entry) => (
              <button
                key={`${entry.kind}:${entry.key}`}
                type="button"
                aria-current={active(entry) ? "page" : undefined}
                onClick={() => {
                  onChoose({ kind: entry.kind, key: entry.key });
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent",
                  active(entry) && "bg-accent font-medium",
                )}
              >
                <span className="truncate">{name(entry)}</span>
                {entry.count !== null && (
                  <span className="ml-2 shrink-0 text-xs tabular text-muted-foreground">
                    {formatCount(entry.count)}
                  </span>
                )}
              </button>
            ))}
            {shown.length === 0 && (
              <p className="px-3 py-1 text-xs text-muted-foreground">Nothing called that.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
