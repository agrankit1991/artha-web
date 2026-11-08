/**
 * The reader's watchlists as menu choices for one instrument, and the dialog
 * that makes a new list with it on.
 *
 * One set of choices for the star on a company's page and for a right-click
 * on a company in the list beside the charts or on its chart (the owner,
 * 2026-11-08: "can I right click on a company in company list and add it to
 * a existing list? or maybe right click anywhere in the chart"), so a list
 * is ticked, added to and made alike wherever it is offered.
 */

import { Check, Plus } from "lucide-react";
import { useState } from "react";

import { Dialog } from "@/components/Dialog";
import { ContextMenu, MenuItem, MenuLabel, MenuSeparator } from "@/components/Menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type WatchlistsOf, useWatchlistsOf } from "@/hooks/useWatchlistsOf";
import { sentence } from "@/lib/format";
import { cn } from "@/lib/utils";

interface WatchlistMenuItemsProps {
  of: WatchlistsOf;
  /** Asked to make a new list with the instrument on it. */
  onNewList: () => void;
}

/**
 * Every list, ticked where it holds the instrument, a click putting it on or
 * taking it off; a list kept updated ticked but not chosen; then New list.
 *
 * @param props - The instrument's lists, and what to call for a new one.
 * @returns The choices.
 */
export function WatchlistMenuItems({ of, onNewList }: WatchlistMenuItemsProps): React.JSX.Element {
  return (
    <>
      <MenuLabel>Watchlists</MenuLabel>
      {of.error !== null ? (
        <div className="px-2 py-1.5 text-xs text-destructive">{sentence(of.error)}</div>
      ) : (of.lists ?? []).length === 0 ? (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {of.lists === null ? "Loading…" : "No lists yet."}
        </div>
      ) : (
        (of.lists ?? []).map((list) => (
          <MenuItem
            key={list.watchlist_id}
            selected={of.held.has(list.watchlist_id)}
            disabled={list.source != null}
            onSelect={() => {
              void of.toggle(list.watchlist_id);
            }}
          >
            {/* A tick, not the shading alone: the first choice also takes the
                keyboard, and focus and "holds it" looked the same. */}
            <Check
              aria-hidden="true"
              className={cn(
                "h-4 w-4 shrink-0",
                of.held.has(list.watchlist_id) ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="flex-1 truncate">{list.name}</span>
            {list.source != null && (
              <span className="text-xs text-muted-foreground">kept updated</span>
            )}
            <span className="ml-2 text-xs text-muted-foreground">{list.items}</span>
          </MenuItem>
        ))
      )}
      {of.problem !== null && (
        <div className="px-2 py-1 text-xs text-destructive">{sentence(of.problem)}</div>
      )}
      <MenuSeparator />
      <MenuItem onSelect={onNewList}>
        <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
        New list…
      </MenuItem>
    </>
  );
}

interface NewListDialogProps {
  open: boolean;
  /** What to call the instrument that goes on the new list. */
  symbol: string;
  of: WatchlistsOf;
  onClose: () => void;
}

/**
 * Name a new list, the instrument going on it as soon as it is made.
 *
 * @param props - Whether it is open, the instrument, and how it closes.
 * @returns The dialog.
 */
export function NewListDialog({
  open,
  symbol,
  of,
  onClose,
}: NewListDialogProps): React.JSX.Element {
  const [name, setName] = useState("");
  const close = (): void => {
    of.forgetProblem();
    onClose();
  };
  return (
    <Dialog
      open={open}
      onClose={close}
      title="New watchlist"
      description={`${symbol} goes on it as soon as it is made.`}
    >
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!of.busy && name.trim() !== "") {
            void of.makeWith(name).then((made) => {
              if (made) {
                setName("");
                onClose();
              }
            });
          }
        }}
      >
        <label className="block text-sm">
          <span className="text-muted-foreground">Name</span>
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            placeholder="Long term"
            maxLength={60}
            aria-label="Name"
            className="mt-1"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={of.busy || name.trim() === ""}>
            Make and add
          </Button>
        </div>
        {of.problem !== null && <p className="text-sm text-destructive">{sentence(of.problem)}</p>}
      </form>
    </Dialog>
  );
}

interface WatchlistsContextMenuProps {
  instrumentKey: string;
  symbol: string;
  /** Where the right-click was, on the screen. */
  at: { x: number; y: number };
  /** Done with: the menu let go, or the new list made or given up. */
  onClose: () => void;
}

/**
 * The lists for an instrument, opened where the reader right-clicked it.
 *
 * Kept open as lists are ticked, so several can be changed at once, as the
 * star's menu is. Mounted only while open, so a long list of companies does
 * not read each one's lists before it is asked for.
 *
 * @param props - The instrument, where to open, and how it closes.
 * @returns The menu, or the new-list dialog in its place.
 */
export function WatchlistsContextMenu({
  instrumentKey,
  symbol,
  at,
  onClose,
}: WatchlistsContextMenuProps): React.JSX.Element {
  const of = useWatchlistsOf(instrumentKey);
  const [naming, setNaming] = useState(false);
  return (
    <>
      <ContextMenu
        at={naming ? null : at}
        label={`${symbol}, on your watchlists`}
        onClose={onClose}
      >
        {() => (
          <>
            <div className="px-2 pt-1.5 text-sm font-semibold">{symbol}</div>
            <WatchlistMenuItems
              of={of}
              onNewList={() => {
                setNaming(true);
              }}
            />
          </>
        )}
      </ContextMenu>
      <NewListDialog open={naming} symbol={symbol} of={of} onClose={onClose} />
    </>
  );
}
